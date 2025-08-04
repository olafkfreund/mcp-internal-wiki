import { WikiSource } from '../sources/wikiSource.js';
import { OfflineManager, OfflineConfig } from '../offline/index.js';
import { logger } from '../utils/logger.js';

/**
 * Integration layer that connects offline functionality with existing WikiSource
 */
export class WikiOfflineIntegration {
  private wikiSource: WikiSource;
  private offlineManager: OfflineManager | null = null;
  private config: OfflineConfig;

  constructor(wikiSource: WikiSource, offlineConfig?: Partial<OfflineConfig>) {
    this.wikiSource = wikiSource;
    this.config = {
      storageType: 'filesystem',
      storageDir: './offline-storage',
      maxStorageSize: 10 * 1024 * 1024 * 1024, // 10GB
      contentExpirationMs: 30 * 24 * 60 * 60 * 1000, // 30 days
      autoSync: false,
      syncIntervalMs: 60 * 60 * 1000, // 1 hour
      maxConcurrentDownloads: 5,
      ...offlineConfig
    };
  }

  /**
   * Initialize offline functionality
   */
  async initialize(): Promise<void> {
    try {
      // Create a minimal WikiManager-like wrapper for OfflineManager
      const wikiManagerLike = {
        getWikiSources: () => {
          const details = this.wikiSource.getWikiSourceDetails();
          return details.map(detail => ({
            id: this.generateSourceId(detail.url),
            url: detail.url,
            name: detail.name,
            type: detail.type
          }));
        },
        getWikiSource: (id: string) => {
          const details = this.wikiSource.getWikiSourceDetails();
          const detail = details.find(d => this.generateSourceId(d.url) === id);
          if (!detail) return null;
          
          return {
            id,
            url: detail.url,
            name: detail.name,
            type: detail.type,
            fetchContent: async () => {
              // Use existing WikiSource functionality
              const results = await this.wikiSource.getContext({ query: { text: '' } });
              const matchingResult = results.find(r => r.url === detail.url);
              return {
                content: matchingResult?.content || '',
                title: matchingResult?.title || detail.name,
                lastModified: undefined,
                tags: undefined
              };
            }
          };
        }
      };

      this.offlineManager = new OfflineManager(this.config, wikiManagerLike as any);
      await this.offlineManager.initialize();
      
      logger.info('WikiOfflineIntegration initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize WikiOfflineIntegration:', error);
      throw error;
    }
  }

  /**
   * Check if offline mode is available
   */
  isOfflineEnabled(): boolean {
    return this.offlineManager !== null;
  }

  /**
   * Get content with offline fallback
   */
  async getContentWithOfflineFallback(query: string): Promise<any[]> {
    try {
      // Try to get content from online sources first
      const onlineResults = await this.wikiSource.getContext({ query: { text: query } });
      
      if (onlineResults && onlineResults.length > 0) {
        // If we have offline manager, cache the results
        if (this.offlineManager) {
          await this.cacheOnlineResults(onlineResults);
        }
        return onlineResults;
      }
      
      // If no online results or offline manager not available, return online results
      if (!this.offlineManager) {
        return onlineResults || [];
      }
      
      // Try offline search as fallback
      logger.info(`No online results for "${query}", trying offline search`);
      const offlineResults = await this.offlineManager.search({
        query,
        limit: 10,
        includeContent: true
      });
      
      // Convert offline results to format expected by consumers
      return offlineResults.map(result => ({
        title: result.content.title,
        content: result.content.content,
        url: result.content.sourceUrl,
        source: 'offline',
        relevanceScore: result.score,
        type: result.content.contentType
      }));
      
    } catch (error) {
      logger.error('Error in getContentWithOfflineFallback:', error);
      
      // Final fallback to offline search if available
      if (this.offlineManager) {
        try {
          const offlineResults = await this.offlineManager.search({
            query,
            limit: 5,
            includeContent: true
          });
          
          return offlineResults.map(result => ({
            title: result.content.title,
            content: result.content.content,
            url: result.content.sourceUrl,
            source: 'offline-fallback',
            relevanceScore: result.score,
            type: result.content.contentType
          }));
        } catch (offlineError) {
          logger.error('Offline fallback also failed:', offlineError);
        }
      }
      
      return [];
    }
  }

  /**
   * Sync all wiki sources for offline access
   */
  async syncAllSources(forceFullSync = false): Promise<any[]> {
    if (!this.offlineManager) {
      throw new Error('Offline manager not initialized');
    }
    
    return await this.offlineManager.syncAllSources(forceFullSync);
  }

  /**
   * Sync a specific wiki source
   */
  async syncWikiSource(url: string, forceFullSync = false): Promise<any> {
    if (!this.offlineManager) {
      throw new Error('Offline manager not initialized');
    }
    
    const sourceId = this.generateSourceId(url);
    return await this.offlineManager.syncWikiSource(sourceId, forceFullSync);
  }

  /**
   * Search stored content offline
   */
  async searchOffline(options: any): Promise<any[]> {
    if (!this.offlineManager) {
      return [];
    }
    
    return await this.offlineManager.search(options);
  }

  /**
   * List offline content
   */
  async listOfflineContent(wikiSource?: string, limit?: number, offset?: number): Promise<any[]> {
    if (!this.offlineManager) {
      return [];
    }
    
    return await this.offlineManager.listContent(wikiSource, limit, offset);
  }

  /**
   * Get offline storage statistics
   */
  async getOfflineStats(): Promise<any> {
    if (!this.offlineManager) {
      return null;
    }
    
    return await this.offlineManager.getStorageStats();
  }

  /**
   * Check if content is available offline
   */
  async isAvailableOffline(url: string): Promise<boolean> {
    if (!this.offlineManager) {
      return false;
    }
    
    return await this.offlineManager.isAvailableOffline(url);
  }

  /**
   * Get sync status for all sources
   */
  getAllSyncStatuses(): any[] {
    if (!this.offlineManager) {
      return [];
    }
    
    return this.offlineManager.getAllSyncStatuses();
  }

  /**
   * Start automatic syncing
   */
  async startAutoSync(): Promise<void> {
    if (!this.offlineManager) {
      throw new Error('Offline manager not initialized');
    }
    
    await this.offlineManager.startAutoSync();
  }

  /**
   * Stop automatic syncing
   */
  stopAutoSync(): void {
    if (this.offlineManager) {
      this.offlineManager.stopAutoSync();
    }
  }

  /**
   * Clean up old offline content
   */
  async cleanup(maxAge?: number): Promise<number> {
    if (!this.offlineManager) {
      return 0;
    }
    
    return await this.offlineManager.cleanup(maxAge);
  }

  /**
   * Gracefully shutdown offline functionality
   */
  async shutdown(): Promise<void> {
    if (this.offlineManager) {
      await this.offlineManager.shutdown();
      this.offlineManager = null;
    }
  }

  // Private helper methods

  private generateSourceId(url: string): string {
    // Create a consistent ID from URL
    return Buffer.from(url).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }

  private async cacheOnlineResults(onlineResults: any[]): Promise<void> {
    if (!this.offlineManager) return;
    
    try {
      // Convert online results to offline content format
      const offlineContents = onlineResults.map(result => ({
        id: this.generateContentId(result.url || result.source),
        sourceUrl: result.url || '',
        title: result.title || 'Untitled',
        content: result.content || '',
        contentType: 'markdown',
        lastFetched: new Date(),
        metadata: {
          size: (result.content || '').length,
          wikiSource: this.generateSourceId(result.url || result.source),
          path: new URL(result.url || 'http://localhost/').pathname,
          tags: []
        }
      }));
      
      // Store in batches for better performance
      if (offlineContents.length > 0) {
        await this.offlineManager.storage.storeBatch(offlineContents);
        logger.debug(`Cached ${offlineContents.length} online results for offline access`);
      }
    } catch (error) {
      logger.error('Failed to cache online results:', error);
    }
  }

  private generateContentId(url: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(url).digest('hex');
  }
}
