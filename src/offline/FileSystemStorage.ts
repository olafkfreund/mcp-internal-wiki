import { OfflineStorage, OfflineContent, SearchOptions, OfflineSearchResult, StorageStats } from './types.js';
import { logger } from '../utils/logger.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';

/**
 * File system-based offline storage implementation
 */
export class FileSystemStorage implements OfflineStorage {
  private readonly storageDir: string;
  private readonly contentDir: string;
  private readonly metadataDir: string;
  private readonly indexFile: string;
  private contentIndex: Map<string, OfflineContent> = new Map();
  private searchIndex: Map<string, Set<string>> = new Map(); // word -> content IDs
  private initialized = false;

  constructor(storageDir: string) {
    this.storageDir = storageDir;
    this.contentDir = path.join(storageDir, 'content');
    this.metadataDir = path.join(storageDir, 'metadata');
    this.indexFile = path.join(storageDir, 'index.json');
  }

  async initialize(): Promise<void> {
    try {
      // Create directories
      await fs.mkdir(this.storageDir, { recursive: true });
      await fs.mkdir(this.contentDir, { recursive: true });
      await fs.mkdir(this.metadataDir, { recursive: true });

      // Load existing index
      await this.loadIndex();
      
      // Build search index
      await this.buildSearchIndex();

      this.initialized = true;
      logger.info(`FileSystemStorage initialized at ${this.storageDir}`);
    } catch (error) {
      logger.error('Failed to initialize FileSystemStorage:', error);
      throw error;
    }
  }

  async store(content: OfflineContent): Promise<void> {
    this.ensureInitialized();
    
    try {
      const contentFile = this.getContentFilePath(content.id);
      const metadataFile = this.getMetadataFilePath(content.id);

      // Store content and metadata separately
      await fs.writeFile(contentFile, content.content, 'utf-8');
      
      const metadata = { ...content, content: undefined }; // Remove content from metadata
      await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2), 'utf-8');

      // Update in-memory index
      this.contentIndex.set(content.id, content);
      
      // Update search index
      this.updateSearchIndex(content);

      // Save index to disk
      await this.saveIndex();

      logger.debug(`Stored content: ${content.id} (${content.title})`);
    } catch (error) {
      logger.error(`Failed to store content ${content.id}:`, error);
      throw error;
    }
  }

  async storeBatch(contents: OfflineContent[]): Promise<void> {
    this.ensureInitialized();
    
    logger.info(`Storing batch of ${contents.length} content items`);
    
    // Process in chunks to avoid overwhelming the file system
    const chunkSize = 50;
    for (let i = 0; i < contents.length; i += chunkSize) {
      const chunk = contents.slice(i, i + chunkSize);
      await Promise.all(chunk.map(content => this.store(content)));
    }
  }

  async get(id: string): Promise<OfflineContent | null> {
    this.ensureInitialized();
    
    try {
      const metadata = this.contentIndex.get(id);
      if (!metadata) {
        return null;
      }

      const contentFile = this.getContentFilePath(id);
      const content = await fs.readFile(contentFile, 'utf-8');
      
      return { ...metadata, content };
    } catch (error) {
      logger.error(`Failed to get content ${id}:`, error);
      return null;
    }
  }

  async search(options: SearchOptions): Promise<OfflineSearchResult[]> {
    this.ensureInitialized();
    
    const { query, limit = 50, offset = 0, wikiSource, contentType, tags, includeContent = false, fuzzyTolerance = 0.3 } = options;
    
    // Simple text-based search implementation
    const queryWords = this.tokenize(query.toLowerCase());
    const candidateIds = new Set<string>();

    // Find content IDs that match query words
    for (const word of queryWords) {
      const exactMatches = this.searchIndex.get(word) || new Set();
      exactMatches.forEach(id => candidateIds.add(id));

      // Fuzzy matching
      if (fuzzyTolerance > 0) {
        for (const [indexWord, ids] of this.searchIndex.entries()) {
          if (this.isWordSimilar(word, indexWord, fuzzyTolerance)) {
            ids.forEach(id => candidateIds.add(id));
          }
        }
      }
    }

    // Score and filter candidates
    const results: OfflineSearchResult[] = [];
    
    for (const id of candidateIds) {
      const content = this.contentIndex.get(id);
      if (!content) continue;

      // Apply filters
      if (wikiSource && content.metadata.wikiSource !== wikiSource) continue;
      if (contentType && content.contentType !== contentType) continue;
      if (tags && !tags.some(tag => content.metadata.tags?.includes(tag))) continue;

      // Calculate score
      const score = this.calculateRelevanceScore(content, queryWords);
      
      // Get full content if requested
      const fullContent = includeContent ? await this.get(id) : content;
      if (!fullContent) continue;

      results.push({
        content: fullContent,
        score,
        highlights: this.extractHighlights(fullContent.content, queryWords)
      });
    }

    // Sort by score and apply pagination
    results.sort((a, b) => b.score - a.score);
    return results.slice(offset, offset + limit);
  }

  async list(wikiSource?: string, limit = 100, offset = 0): Promise<OfflineContent[]> {
    this.ensureInitialized();
    
    const allContent = Array.from(this.contentIndex.values());
    
    let filtered = allContent;
    if (wikiSource) {
      filtered = allContent.filter(content => content.metadata.wikiSource === wikiSource);
    }

    return filtered.slice(offset, offset + limit);
  }

  async update(id: string, updates: Partial<OfflineContent>): Promise<void> {
    this.ensureInitialized();
    
    const existing = this.contentIndex.get(id);
    if (!existing) {
      throw new Error(`Content ${id} not found`);
    }

    const updated = { ...existing, ...updates };
    await this.store(updated);
  }

  async delete(id: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      const contentFile = this.getContentFilePath(id);
      const metadataFile = this.getMetadataFilePath(id);

      await Promise.all([
        fs.unlink(contentFile).catch(() => {}), // Ignore if file doesn't exist
        fs.unlink(metadataFile).catch(() => {})
      ]);

      // Remove from indices
      this.contentIndex.delete(id);
      this.removeFromSearchIndex(id);

      await this.saveIndex();
      
      logger.debug(`Deleted content: ${id}`);
    } catch (error) {
      logger.error(`Failed to delete content ${id}:`, error);
      throw error;
    }
  }

  async deleteBySource(wikiSource: string): Promise<void> {
    this.ensureInitialized();
    
    const toDelete = Array.from(this.contentIndex.values())
      .filter(content => content.metadata.wikiSource === wikiSource)
      .map(content => content.id);

    await Promise.all(toDelete.map(id => this.delete(id)));
    
    logger.info(`Deleted ${toDelete.length} items from source: ${wikiSource}`);
  }

  async exists(id: string): Promise<boolean> {
    this.ensureInitialized();
    return this.contentIndex.has(id);
  }

  async getStats(): Promise<StorageStats> {
    this.ensureInitialized();
    
    const items = Array.from(this.contentIndex.values());
    const sources = new Set(items.map(item => item.metadata.wikiSource));
    const totalSize = items.reduce((sum, item) => sum + item.metadata.size, 0);
    const lastUpdate = items.length > 0 
      ? new Date(Math.max(...items.map(item => item.lastFetched.getTime())))
      : new Date();

    return {
      totalItems: items.length,
      totalSize,
      sources: sources.size,
      lastUpdate,
      health: 'healthy'
    };
  }

  async cleanup(maxAge = 30 * 24 * 60 * 60 * 1000): Promise<number> { // 30 days default
    this.ensureInitialized();
    
    const cutoff = new Date(Date.now() - maxAge);
    const toDelete = Array.from(this.contentIndex.values())
      .filter(content => content.lastFetched < cutoff)
      .map(content => content.id);

    await Promise.all(toDelete.map(id => this.delete(id)));
    
    logger.info(`Cleaned up ${toDelete.length} expired content items`);
    return toDelete.length;
  }

  async close(): Promise<void> {
    await this.saveIndex();
    this.contentIndex.clear();
    this.searchIndex.clear();
    this.initialized = false;
  }

  // Private helper methods

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('FileSystemStorage not initialized');
    }
  }

  private getContentFilePath(id: string): string {
    return path.join(this.contentDir, `${id}.md`);
  }

  private getMetadataFilePath(id: string): string {
    return path.join(this.metadataDir, `${id}.json`);
  }

  private async loadIndex(): Promise<void> {
    try {
      const indexData = await fs.readFile(this.indexFile, 'utf-8');
      const index = JSON.parse(indexData);
      
      this.contentIndex.clear();
      for (const [id, content] of Object.entries(index)) {
        const typedContent = content as any;
        typedContent.lastFetched = new Date(typedContent.lastFetched);
        if (typedContent.lastModified) {
          typedContent.lastModified = new Date(typedContent.lastModified);
        }
        this.contentIndex.set(id, typedContent);
      }
      
      logger.debug(`Loaded ${this.contentIndex.size} items from index`);
    } catch (error) {
      // Index file doesn't exist or is corrupted, start fresh
      logger.debug('No existing index found, starting fresh');
      this.contentIndex.clear();
    }
  }

  private async saveIndex(): Promise<void> {
    try {
      const index: Record<string, any> = {};
      for (const [id, content] of this.contentIndex.entries()) {
        // Save without content data to keep index small
        index[id] = { ...content, content: undefined };
      }
      
      await fs.writeFile(this.indexFile, JSON.stringify(index, null, 2), 'utf-8');
    } catch (error) {
      logger.error('Failed to save index:', error);
    }
  }

  private async buildSearchIndex(): Promise<void> {
    this.searchIndex.clear();
    
    for (const content of this.contentIndex.values()) {
      this.updateSearchIndex(content);
    }
    
    logger.debug(`Built search index with ${this.searchIndex.size} unique words`);
  }

  private updateSearchIndex(content: OfflineContent): void {
    const text = `${content.title} ${content.content}`.toLowerCase();
    const words = this.tokenize(text);
    
    for (const word of words) {
      if (!this.searchIndex.has(word)) {
        this.searchIndex.set(word, new Set());
      }
      this.searchIndex.get(word)!.add(content.id);
    }
  }

  private removeFromSearchIndex(contentId: string): void {
    for (const [word, ids] of this.searchIndex.entries()) {
      ids.delete(contentId);
      if (ids.size === 0) {
        this.searchIndex.delete(word);
      }
    }
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }

  private calculateRelevanceScore(content: OfflineContent, queryWords: string[]): number {
    const text = `${content.title} ${content.content}`.toLowerCase();
    const words = this.tokenize(text);
    
    let score = 0;
    const titleWords = this.tokenize(content.title.toLowerCase());
    
    for (const queryWord of queryWords) {
      // Count occurrences in content
      const contentMatches = words.filter(word => word.includes(queryWord)).length;
      score += contentMatches * 0.5;
      
      // Boost score for title matches
      const titleMatches = titleWords.filter(word => word.includes(queryWord)).length;
      score += titleMatches * 2.0;
    }
    
    // Normalize by content length
    return score / Math.max(words.length, 1);
  }

  private extractHighlights(content: string, queryWords: string[]): string[] {
    const highlights: string[] = [];
    const sentences = content.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      for (const word of queryWords) {
        if (lowerSentence.includes(word)) {
          highlights.push(sentence.trim().substring(0, 200));
          break;
        }
      }
    }
    
    return highlights.slice(0, 3); // Return up to 3 highlights
  }

  private isWordSimilar(word1: string, word2: string, threshold: number): boolean {
    if (word1 === word2) return true;
    if (Math.abs(word1.length - word2.length) > 2) return false;
    
    // Simple Levenshtein distance approximation
    const distance = this.levenshteinDistance(word1, word2);
    const maxLength = Math.max(word1.length, word2.length);
    const similarity = 1 - (distance / maxLength);
    
    return similarity >= threshold;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }
    
    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}

/**
 * File System Storage Implementation for Offline Content
 * 
 * Stores wiki content in a structured directory hierarchy on the local file system.
 * Provides fast access and search capabilities for offline content.
 */
export class FileSystemStorage implements OfflineStorage {
  private storageDir: string;
  private indexFile: string;
  private initialized = false;
  private contentIndex: Map<string, OfflineContentIndex> = new Map();

  constructor(storageDir?: string) {
    this.storageDir = storageDir || path.join(process.cwd(), '.mcp-offline');
    this.indexFile = path.join(this.storageDir, 'index.json');
  }

  async initialize(): Promise<void> {
    try {
      // Create storage directory if it doesn't exist
      await fs.mkdir(this.storageDir, { recursive: true });
      
      // Create subdirectories
      await fs.mkdir(path.join(this.storageDir, 'content'), { recursive: true });
      await fs.mkdir(path.join(this.storageDir, 'metadata'), { recursive: true });
      
      // Load existing index
      await this.loadIndex();
      
      this.initialized = true;
      logger.info(`FileSystem storage initialized at: ${this.storageDir}`);
    } catch (error) {
      logger.error('Failed to initialize FileSystem storage:', error);
      throw error;
    }
  }

  async storeContent(content: OfflineContent): Promise<void> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    try {
      const urlHash = this.hashUrl(content.url);
      
      // Store content file
      const contentFile = path.join(this.storageDir, 'content', `${urlHash}.json`);
      await fs.writeFile(contentFile, JSON.stringify(content, null, 2));
      
      // Update index
      this.contentIndex.set(content.url, {
        url: content.url,
        urlHash,
        title: content.title,
        lastFetched: content.lastFetched,
        lastModified: content.lastModified,
        contentLength: content.content.length,
        metadata: content.metadata
      });
      
      // Save index
      await this.saveIndex();
      
      logger.debug(`Content stored: ${content.url}`);
    } catch (error) {
      logger.error(`Failed to store content for ${content.url}:`, error);
      throw error;
    }
  }

  async getContent(url: string): Promise<OfflineContent | null> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    try {
      const indexEntry = this.contentIndex.get(url);
      if (!indexEntry) {
        return null;
      }

      const contentFile = path.join(this.storageDir, 'content', `${indexEntry.urlHash}.json`);
      
      try {
        const contentData = await fs.readFile(contentFile, 'utf-8');
        const content: OfflineContent = JSON.parse(contentData);
        
        // Convert date strings back to Date objects
        content.lastFetched = new Date(content.lastFetched);
        if (content.lastModified) {
          content.lastModified = new Date(content.lastModified);
        }
        if (content.expiresAt) {
          content.expiresAt = new Date(content.expiresAt);
        }
        
        return content;
      } catch (fileError) {
        // File doesn't exist or is corrupted, remove from index
        this.contentIndex.delete(url);
        await this.saveIndex();
        return null;
      }
    } catch (error) {
      logger.error(`Failed to get content for ${url}:`, error);
      return null;
    }
  }

  async searchContent(query: string, options: SearchOptions = {}): Promise<OfflineSearchResult[]> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    const results: OfflineSearchResult[] = [];
    const queryLower = query.toLowerCase();
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    try {
      for (const [url, indexEntry] of this.contentIndex.entries()) {
        // Apply filters
        if (options.contentTypes && !options.contentTypes.includes(indexEntry.metadata.contentType)) {
          continue;
        }
        
        if (options.sources && !options.sources.includes(indexEntry.metadata.source)) {
          continue;
        }

        // Load full content for search
        const content = await this.getContent(url);
        if (!content) {
          continue;
        }

        // Calculate relevance
        let relevance = 0;
        let excerpt = '';

        // Title match (highest relevance)
        if (content.title.toLowerCase().includes(queryLower)) {
          relevance += 100;
          excerpt = content.title;
        }

        // Content match
        const contentLower = content.content.toLowerCase();
        if (contentLower.includes(queryLower)) {
          relevance += 50;
          
          // Extract excerpt around match
          const matchIndex = contentLower.indexOf(queryLower);
          const start = Math.max(0, matchIndex - 100);
          const end = Math.min(content.content.length, matchIndex + 200);
          excerpt = content.content.substring(start, end).trim();
          if (start > 0) excerpt = '...' + excerpt;
          if (end < content.content.length) excerpt = excerpt + '...';
        }

        // Section matches
        const matchedSections: Array<{ sectionId: string; sectionTitle: string; excerpt: string }> = [];
        if (options.includeSections && content.sections) {
          for (const section of content.sections) {
            if (section.title.toLowerCase().includes(queryLower) || 
                section.content.toLowerCase().includes(queryLower)) {
              relevance += 25;
              
              matchedSections.push({
                sectionId: section.id,
                sectionTitle: section.title,
                excerpt: section.content.substring(0, 200) + '...'
              });
            }
          }
        }

        if (relevance > 0) {
          results.push({
            url: content.url,
            title: content.title,
            excerpt: excerpt || content.content.substring(0, 200) + '...',
            relevance,
            lastFetched: content.lastFetched,
            metadata: content.metadata,
            matchedSections
          });
        }
      }

      // Sort by relevance
      results.sort((a, b) => b.relevance - a.relevance);

      // Apply pagination
      return results.slice(offset, offset + limit);
    } catch (error) {
      logger.error('Failed to search content:', error);
      return [];
    }
  }

  async getStoredUrls(): Promise<string[]> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    return Array.from(this.contentIndex.keys());
  }

  async getStats(): Promise<StorageStats> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    const urls = Array.from(this.contentIndex.values());
    const contentBySource: Record<string, number> = {};
    const contentByType: Record<string, number> = {};
    let totalSize = 0;
    let oldestContent: Date | null = null;
    let newestContent: Date | null = null;

    for (const entry of urls) {
      totalSize += entry.contentLength;
      
      // Track by source
      contentBySource[entry.metadata.source] = (contentBySource[entry.metadata.source] || 0) + 1;
      
      // Track by type
      contentByType[entry.metadata.contentType] = (contentByType[entry.metadata.contentType] || 0) + 1;
      
      // Track dates
      const fetchDate = entry.lastFetched;
      if (!oldestContent || fetchDate < oldestContent) {
        oldestContent = fetchDate;
      }
      if (!newestContent || fetchDate > newestContent) {
        newestContent = fetchDate;
      }
    }

    return {
      totalContent: urls.length,
      totalSize,
      oldestContent,
      newestContent,
      contentBySource,
      contentByType,
      averageContentSize: urls.length > 0 ? totalSize / urls.length : 0
    };
  }

  async removeContent(url: string): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    try {
      const indexEntry = this.contentIndex.get(url);
      if (!indexEntry) {
        return false;
      }

      // Remove content file
      const contentFile = path.join(this.storageDir, 'content', `${indexEntry.urlHash}.json`);
      try {
        await fs.unlink(contentFile);
      } catch (error) {
        logger.warn(`Failed to remove content file for ${url}:`, error);
      }

      // Remove from index
      this.contentIndex.delete(url);
      await this.saveIndex();

      logger.debug(`Content removed: ${url}`);
      return true;
    } catch (error) {
      logger.error(`Failed to remove content for ${url}:`, error);
      return false;
    }
  }

  async clearAll(): Promise<void> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    try {
      // Remove all content files
      const contentDir = path.join(this.storageDir, 'content');
      try {
        const files = await fs.readdir(contentDir);
        await Promise.all(files.map(file => 
          fs.unlink(path.join(contentDir, file)).catch(() => {})
        ));
      } catch (error) {
        logger.warn('Failed to clear content directory:', error);
      }

      // Clear index
      this.contentIndex.clear();
      await this.saveIndex();

      logger.info('All offline content cleared');
    } catch (error) {
      logger.error('Failed to clear all content:', error);
      throw error;
    }
  }

  async isContentFresh(url: string, maxAge: number = 24 * 60 * 60 * 1000): Promise<boolean> {
    const indexEntry = this.contentIndex.get(url);
    if (!indexEntry) {
      return false;
    }

    const age = Date.now() - indexEntry.lastFetched.getTime();
    return age < maxAge;
  }

  async cleanupExpired(maxAge: number = 24 * 60 * 60 * 1000): Promise<number> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    let removedCount = 0;
    const cutoffTime = Date.now() - maxAge;

    for (const [url, entry] of this.contentIndex.entries()) {
      if (entry.lastFetched.getTime() < cutoffTime) {
        await this.removeContent(url);
        removedCount++;
      }
    }

    logger.info(`Cleaned up ${removedCount} expired content items`);
    return removedCount;
  }

  async close(): Promise<void> {
    if (this.initialized) {
      await this.saveIndex();
      this.initialized = false;
      logger.debug('FileSystem storage closed');
    }
  }

  // Private methods

  private async loadIndex(): Promise<void> {
    try {
      const indexData = await fs.readFile(this.indexFile, 'utf-8');
      const indexArray: OfflineContentIndex[] = JSON.parse(indexData);
      
      this.contentIndex.clear();
      for (const entry of indexArray) {
        // Convert date strings back to Date objects
        entry.lastFetched = new Date(entry.lastFetched);
        if (entry.lastModified) {
          entry.lastModified = new Date(entry.lastModified);
        }
        
        this.contentIndex.set(entry.url, entry);
      }
      
      logger.debug(`Loaded index with ${this.contentIndex.size} entries`);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        logger.debug('No existing index found, starting fresh');
      } else {
        logger.warn('Failed to load index, starting fresh:', error);
      }
      this.contentIndex.clear();
    }
  }

  private async saveIndex(): Promise<void> {
    try {
      const indexArray = Array.from(this.contentIndex.values());
      await fs.writeFile(this.indexFile, JSON.stringify(indexArray, null, 2));
    } catch (error) {
      logger.error('Failed to save index:', error);
    }
  }

  private hashUrl(url: string): string {
    return createHash('sha256').update(url).digest('hex').substring(0, 16);
  }
}

interface OfflineContentIndex {
  url: string;
  urlHash: string;
  title: string;
  lastFetched: Date;
  lastModified?: Date;
  contentLength: number;
  metadata: any;
}
