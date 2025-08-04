import { OfflineStorage, OfflineContent, OfflineConfig, SyncStatus, DownloadProgress, SearchOptions, OfflineSearchResult } from './types.js';
import { FileSystemStorage } from './FileSystemStorage.js';
import { logger } from '../utils/logger.js';
import { createHash } from 'crypto';
import * as path from 'path';
import { EventEmitter } from 'events';

// Simple interface for wiki manager-like functionality
interface WikiManagerLike {
  getWikiSources(): Array<{ id: string; url: string; name: string; type: string }>;
  getWikiSource(id: string): { 
    id: string; 
    url: string; 
    name: string; 
    type: string;
    fetchContent(): Promise<{ content: string; title: string; lastModified?: Date; tags?: string[] }>;
  } | null;
}

/**
 * Manages offline content storage, syncing, and retrieval
 */
export class OfflineManager extends EventEmitter {
  private storage!: OfflineStorage; // Use definite assignment assertion
  private config: OfflineConfig;
  private wikiManager: WikiManagerLike;
  private syncStatuses: Map<string, SyncStatus> = new Map();
  private syncTimers: Map<string, NodeJS.Timeout> = new Map(); // Use NodeJS.Timeout
  private downloadQueue: Set<string> = new Set();
  private isShuttingDown = false;

  constructor(config: OfflineConfig, wikiManager: WikiManagerLike) {
    super();
    this.config = {
      storageType: 'filesystem',
      storageDir: './offline-storage',
      maxStorageSize: 10 * 1024 * 1024 * 1024, // 10GB default
      contentExpirationMs: 30 * 24 * 60 * 60 * 1000, // 30 days
      autoSync: false,
      syncIntervalMs: 60 * 60 * 1000, // 1 hour
      maxConcurrentDownloads: 5,
      ...config
    };
    this.wikiManager = wikiManager;
    this.initializeStorage();
  }

  /**
   * Initialize the offline storage system
   */
  async initialize(): Promise<void> {
    try {
      await this.storage.initialize();
      
      if (this.config.autoSync) {
        await this.startAutoSync();
      }
      
      logger.info('OfflineManager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize OfflineManager:', error);
      throw error;
    }
  }

  /**
   * Sync content from a specific wiki source
   */
  async syncWikiSource(wikiSourceId: string, forceFullSync = false): Promise<SyncStatus> {
    if (this.downloadQueue.has(wikiSourceId)) {
      throw new Error(`Sync already in progress for wiki source: ${wikiSourceId}`);
    }

    const wikiSource = this.wikiManager.getWikiSource(wikiSourceId);
    if (!wikiSource) {
      throw new Error(`Wiki source not found: ${wikiSourceId}`);
    }

    this.downloadQueue.add(wikiSourceId);
    
    const syncStatus: SyncStatus = {
      wikiSource: wikiSourceId,
      lastSync: new Date(),
      inProgress: true,
      itemsSynced: 0,
      errors: []
    };
    
    this.syncStatuses.set(wikiSourceId, syncStatus);
    this.emit('syncStarted', syncStatus);

    try {
      logger.info(`Starting sync for wiki source: ${wikiSourceId}`);
      
      // Get list of available content
      const availableContent = await this.discoverWikiContent(wikiSource);
      syncStatus.totalItems = availableContent.length;
      
      logger.info(`Found ${availableContent.length} items to sync for ${wikiSourceId}`);

      // Process content in batches
      const batchSize = Math.min(this.config.maxConcurrentDownloads || 5, 10);
      const batches = this.createBatches(availableContent, batchSize);
      
      for (const batch of batches) {
        if (this.isShuttingDown) break;
        
        await Promise.allSettled(batch.map(async (contentInfo) => {
          try {
            const shouldDownload = forceFullSync || await this.shouldDownloadContent(contentInfo);
            
            if (shouldDownload) {
              const content = await this.downloadContent(wikiSource, contentInfo);
              if (content) {
                await this.storage.store(content);
                syncStatus.itemsSynced++;
                
                this.emit('contentDownloaded', {
                  wikiSource: wikiSourceId,
                  contentId: content.id,
                  title: content.title
                });
              }
            } else {
              syncStatus.itemsSynced++; // Count as processed
            }
          } catch (error) {
            const errorMsg = `Failed to sync ${contentInfo.url}: ${error}`;
            logger.error(errorMsg);
            syncStatus.errors?.push(errorMsg);
          }
        }));
        
        // Emit progress update
        this.emit('syncProgress', syncStatus);
      }

      syncStatus.inProgress = false;
      syncStatus.lastSync = new Date();
      
      // Clean up old content if needed
      if (this.config.contentExpirationMs) {
        const cleaned = await this.storage.cleanup(this.config.contentExpirationMs);
        if (cleaned > 0) {
          logger.info(`Cleaned up ${cleaned} expired items during sync`);
        }
      }

      logger.info(`Sync completed for ${wikiSourceId}: ${syncStatus.itemsSynced} items synced`);
      this.emit('syncCompleted', syncStatus);
      
    } catch (error) {
      syncStatus.inProgress = false;
      syncStatus.errors?.push(`Sync failed: ${error}`);
      logger.error(`Sync failed for ${wikiSourceId}:`, error);
      this.emit('syncError', { wikiSource: wikiSourceId, error });
    } finally {
      this.downloadQueue.delete(wikiSourceId);
    }

    return syncStatus;
  }

  /**
   * Sync all configured wiki sources
   */
  async syncAllSources(forceFullSync = false): Promise<SyncStatus[]> {
    const wikiSources = this.wikiManager.getWikiSources();
    const results: SyncStatus[] = [];
    
    logger.info(`Starting sync for ${wikiSources.length} wiki sources`);
    
    for (const wikiSource of wikiSources) {
      try {
        const status = await this.syncWikiSource(wikiSource.id, forceFullSync);
        results.push(status);
      } catch (error) {
        logger.error(`Failed to sync ${wikiSource.id}:`, error);
        results.push({
          wikiSource: wikiSource.id,
          lastSync: new Date(),
          inProgress: false,
          itemsSynced: 0,
          errors: [`Sync failed: ${error}`]
        });
      }
    }
    
    return results;
  }

  /**
   * Search offline content
   */
  async search(options: SearchOptions): Promise<OfflineSearchResult[]> {
    return await this.storage.search(options);
  }

  /**
   * Get offline content by ID
   */
  async getContent(id: string): Promise<OfflineContent | null> {
    return await this.storage.get(id);
  }

  /**
   * List offline content
   */
  async listContent(wikiSource?: string, limit?: number, offset?: number): Promise<OfflineContent[]> {
    return await this.storage.list(wikiSource, limit, offset);
  }

  /**
   * Get sync status for a wiki source
   */
  getSyncStatus(wikiSourceId: string): SyncStatus | null {
    return this.syncStatuses.get(wikiSourceId) || null;
  }

  /**
   * Get all sync statuses
   */
  getAllSyncStatuses(): SyncStatus[] {
    return Array.from(this.syncStatuses.values());
  }

  /**
   * Check if content is available offline
   */
  async isAvailableOffline(url: string): Promise<boolean> {
    const id = this.generateContentId(url);
    return await this.storage.exists(id);
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    return await this.storage.getStats();
  }

  /**
   * Clean up old content
   */
  async cleanup(maxAge?: number): Promise<number> {
    return await this.storage.cleanup(maxAge || this.config.contentExpirationMs);
  }

  /**
   * Start automatic syncing
   */
  async startAutoSync(): Promise<void> {
    if (!this.config.autoSync || !this.config.syncIntervalMs) {
      return;
    }

    logger.info(`Starting auto-sync with interval: ${this.config.syncIntervalMs}ms`);
    
    const wikiSources = this.wikiManager.getWikiSources();
    
    for (const wikiSource of wikiSources) {
      const timer = setInterval(async () => {
        try {
          if (!this.downloadQueue.has(wikiSource.id)) {
            await this.syncWikiSource(wikiSource.id, false);
          }
        } catch (error) {
          logger.error(`Auto-sync failed for ${wikiSource.id}:`, error);
        }
      }, this.config.syncIntervalMs);
      
      this.syncTimers.set(wikiSource.id, timer);
    }
  }

  /**
   * Stop automatic syncing
   */
  stopAutoSync(): void {
    for (const timer of this.syncTimers.values()) {
      clearInterval(timer);
    }
    this.syncTimers.clear();
    logger.info('Auto-sync stopped');
  }

  /**
   * Gracefully shutdown the offline manager
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    this.stopAutoSync();
    
    // Wait for ongoing downloads to complete
    const maxWaitTime = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (this.downloadQueue.size > 0 && (Date.now() - startTime) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    await this.storage.close();
    logger.info('OfflineManager shutdown complete');
  }

  // Private helper methods

  private initializeStorage(): void {
    switch (this.config.storageType) {
      case 'filesystem':
        this.storage = new FileSystemStorage(this.config.storageDir || './offline-storage');
        break;
      case 'sqlite':
        // TODO: Implement SQLite storage
        throw new Error('SQLite storage not yet implemented');
      case 'memory':
        // TODO: Implement in-memory storage
        throw new Error('Memory storage not yet implemented');
      default:
        throw new Error(`Unsupported storage type: ${this.config.storageType}`);
    }
  }

  private async discoverWikiContent(wikiSource: WikiSource): Promise<Array<{ url: string; title: string; lastModified?: Date }>> {
    // This is a simplified implementation - real implementation would need
    // to crawl the wiki or use APIs to discover all available content
    try {
      const baseContent = await wikiSource.fetchContent();
      
      // For now, just return the main content items
      // In a real implementation, this would discover all pages, categories, etc.
      return [{
        url: wikiSource.url,
        title: baseContent.title || 'Wiki Content',
        lastModified: baseContent.lastModified
      }];
    } catch (error) {
      logger.error(`Failed to discover content for ${wikiSource.url}:`, error);
      return [];
    }
  }

  private async shouldDownloadContent(contentInfo: { url: string; lastModified?: Date }): Promise<boolean> {
    const id = this.generateContentId(contentInfo.url);
    const existing = await this.storage.get(id);
    
    if (!existing) {
      return true; // New content
    }
    
    // Check if content has been modified
    if (contentInfo.lastModified && existing.lastModified) {
      return contentInfo.lastModified > existing.lastModified;
    }
    
    // Check if content is stale
    const age = Date.now() - existing.lastFetched.getTime();
    const maxAge = this.config.contentExpirationMs || (7 * 24 * 60 * 60 * 1000); // 7 days
    
    return age > maxAge;
  }

  private async downloadContent(wikiSource: WikiSource, contentInfo: { url: string; title: string; lastModified?: Date }): Promise<OfflineContent | null> {
    try {
      const content = await wikiSource.fetchContent();
      
      return {
        id: this.generateContentId(contentInfo.url),
        sourceUrl: contentInfo.url,
        title: contentInfo.title,
        content: content.content,
        contentType: 'markdown',
        lastFetched: new Date(),
        lastModified: contentInfo.lastModified,
        metadata: {
          size: content.content.length,
          wikiSource: wikiSource.id,
          path: new URL(contentInfo.url).pathname,
          tags: content.tags
        }
      };
    } catch (error) {
      logger.error(`Failed to download content from ${contentInfo.url}:`, error);
      return null;
    }
  }

  private generateContentId(url: string): string {
    return createHash('sha256').update(url).digest('hex');
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }
}
