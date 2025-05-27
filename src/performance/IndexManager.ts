import { Worker } from 'worker_threads';
import { createHash } from 'crypto';
import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';

export interface IndexEntry {
  id: string;
  url: string;
  title: string;
  content: string;
  keywords: string[];
  lastModified: Date;
  size: number;
  hash: string;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  fuzzy?: boolean;
  includeContent?: boolean;
  sortBy?: 'relevance' | 'date' | 'title';
  filters?: {
    domain?: string;
    dateRange?: { start: Date; end: Date };
    minSize?: number;
    maxSize?: number;
  };
}

export interface SearchResult {
  entries: (IndexEntry & { score?: number })[];
  total: number;
  took: number;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export class IndexManager extends EventEmitter {
  private index: Map<string, IndexEntry> = new Map();
  private keywordIndex: Map<string, Set<string>> = new Map();
  private domainIndex: Map<string, Set<string>> = new Map();
  private logger: Logger;
  private isBuilding: boolean = false;

  constructor() {
    super();
    this.logger = new Logger('IndexManager');
  }

  private extractKeywords(content: string, title: string): string[] {
    const text = (title + ' ' + content).toLowerCase();
    const words = text.match(/\b\w{3,}\b/g) || [];
    const stopWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 
      'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 
      'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 
      'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'
    ]);
    
    const frequency = new Map<string, number>();
    words.forEach(word => {
      if (!stopWords.has(word) && word.length > 2) {
        frequency.set(word, (frequency.get(word) || 0) + 1);
      }
    });
    
    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([word]) => word);
  }

  async addEntry(entry: Omit<IndexEntry, 'id' | 'hash'>): Promise<string> {
    const id = this.generateId(entry.url);
    const hash = this.generateHash(entry.content);
    const keywords = this.extractKeywords(entry.content, entry.title);
    
    const fullEntry: IndexEntry = {
      ...entry,
      id,
      hash,
      keywords,
      size: entry.content.length
    };

    this.index.set(id, fullEntry);
    this.updateDomainIndex(id, entry.url);
    this.updateKeywordIndex(id, keywords);

    this.emit('entryAdded', fullEntry);
    return id;
  }

  async updateEntry(id: string, updates: Partial<IndexEntry>): Promise<boolean> {
    const existing = this.index.get(id);
    if (!existing) return false;

    const updated = { ...existing, ...updates };
    
    // Check if content changed
    if (updates.content && updates.content !== existing.content) {
      updated.hash = this.generateHash(updates.content);
      updated.size = updates.content.length;
      updated.keywords = this.extractKeywords(updates.content, updated.title);
      
      // Update keyword index
      this.removeFromKeywordIndex(id);
      this.updateKeywordIndex(id, updated.keywords);
    }

    this.index.set(id, updated);
    this.emit('entryUpdated', updated);
    return true;
  }

  async removeEntry(id: string): Promise<boolean> {
    const entry = this.index.get(id);
    if (!entry) return false;

    this.index.delete(id);
    this.removeFromKeywordIndex(id);
    this.removeFromDomainIndex(id, entry.url);

    this.emit('entryRemoved', id);
    return true;
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult> {
    const startTime = Date.now();
    const {
      limit = 20,
      offset = 0,
      fuzzy = false,
      includeContent = false,
      sortBy = 'relevance',
      filters = {}
    } = options;

    let results = Array.from(this.index.values());

    // Apply filters
    results = this.applyFilters(results, filters);

    // Search by query
    if (query.trim()) {
      results = this.searchByQuery(results, query, fuzzy);
    }

    // Sort results
    results = this.sortResults(results, sortBy, query);

    // Pagination
    const total = results.length;
    const paginatedResults = results.slice(offset, offset + limit);

    // Remove content if not requested
    if (!includeContent) {
      paginatedResults.forEach(entry => {
        delete (entry as any).content;
      });
    }

    const took = Date.now() - startTime;

    return {
      entries: paginatedResults,
      total,
      took,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < total
      }
    };
  }

  async getEntry(id: string): Promise<IndexEntry | null> {
    return this.index.get(id) || null;
  }

  async getStats(): Promise<{
    totalEntries: number;
    totalSize: number;
    averageSize: number;
    domains: string[];
    oldestEntry: Date | null;
    newestEntry: Date | null;
  }> {
    const entries = Array.from(this.index.values());
    
    return {
      totalEntries: entries.length,
      totalSize: entries.reduce((sum, entry) => sum + entry.size, 0),
      averageSize: entries.length ? entries.reduce((sum, entry) => sum + entry.size, 0) / entries.length : 0,
      domains: Array.from(this.domainIndex.keys()),
      oldestEntry: entries.length ? new Date(Math.min(...entries.map(e => e.lastModified.getTime()))) : null,
      newestEntry: entries.length ? new Date(Math.max(...entries.map(e => e.lastModified.getTime()))) : null
    };
  }

  async rebuildIndex(entries: Array<Omit<IndexEntry, 'id' | 'hash'>>): Promise<void> {
    if (this.isBuilding) {
      throw new Error('Index rebuild already in progress');
    }

    this.isBuilding = true;
    this.emit('rebuildStarted');

    try {
      // Clear existing indexes
      this.index.clear();
      this.keywordIndex.clear();
      this.domainIndex.clear();

      // Add entries in batches
      const batchSize = 100;
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);
        await Promise.all(batch.map(entry => this.addEntry(entry)));
        
        this.emit('rebuildProgress', {
          processed: Math.min(i + batchSize, entries.length),
          total: entries.length
        });

        // Yield control to event loop
        await new Promise(resolve => setImmediate(resolve));
      }

      this.emit('rebuildCompleted');
    } catch (error) {
      this.emit('rebuildError', error);
      throw error;
    } finally {
      this.isBuilding = false;
    }
  }

  private applyFilters(results: IndexEntry[], filters: SearchOptions['filters'] = {}): IndexEntry[] {
    return results.filter(entry => {
      if (filters.domain) {
        const domain = new URL(entry.url).hostname;
        if (!domain.includes(filters.domain)) return false;
      }

      if (filters.dateRange) {
        const { start, end } = filters.dateRange;
        if (entry.lastModified < start || entry.lastModified > end) return false;
      }

      if (filters.minSize && entry.size < filters.minSize) return false;
      if (filters.maxSize && entry.size > filters.maxSize) return false;

      return true;
    });
  }

  private searchByQuery(results: IndexEntry[], query: string, fuzzy: boolean): (IndexEntry & { score: number })[] {
    const queryTerms = query.toLowerCase().split(/\s+/);
    
    return results.map(entry => {
      let score = 0;
      const titleLower = entry.title.toLowerCase();
      const contentLower = entry.content.toLowerCase();

      // Exact matches in title get highest score
      queryTerms.forEach(term => {
        if (titleLower.includes(term)) score += 10;
        if (contentLower.includes(term)) score += 1;
        
        // Keyword matches
        if (entry.keywords.some(keyword => keyword.includes(term))) {
          score += 5;
        }

        // Fuzzy matching (simple implementation)
        if (fuzzy) {
          entry.keywords.forEach(keyword => {
            if (this.fuzzyMatch(keyword, term)) score += 2;
          });
        }
      });

      return { ...entry, score };
    }).filter(entry => entry.score > 0);
  }

  private sortResults(results: any[], sortBy: string, query?: string): IndexEntry[] {
    switch (sortBy) {
      case 'relevance':
        return results.sort((a, b) => (b.score || 0) - (a.score || 0));
      case 'date':
        return results.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
      case 'title':
        return results.sort((a, b) => a.title.localeCompare(b.title));
      default:
        return results;
    }
  }

  private fuzzyMatch(str1: string, str2: string): boolean {
    // Simple fuzzy matching using Levenshtein distance
    const maxDistance = Math.floor(Math.max(str1.length, str2.length) * 0.3);
    return this.levenshteinDistance(str1, str2) <= maxDistance;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[j][i] = matrix[j - 1][i - 1];
        } else {
          matrix[j][i] = Math.min(
            matrix[j - 1][i] + 1,
            matrix[j][i - 1] + 1,
            matrix[j - 1][i - 1] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private updateKeywordIndex(id: string, keywords: string[]): void {
    keywords.forEach(keyword => {
      if (!this.keywordIndex.has(keyword)) {
        this.keywordIndex.set(keyword, new Set());
      }
      this.keywordIndex.get(keyword)!.add(id);
    });
  }

  private removeFromKeywordIndex(id: string): void {
    for (const [keyword, ids] of this.keywordIndex) {
      ids.delete(id);
      if (ids.size === 0) {
        this.keywordIndex.delete(keyword);
      }
    }
  }

  private updateDomainIndex(id: string, url: string): void {
    const domain = new URL(url).hostname;
    if (!this.domainIndex.has(domain)) {
      this.domainIndex.set(domain, new Set());
    }
    this.domainIndex.get(domain)!.add(id);
  }

  private removeFromDomainIndex(id: string, url: string): void {
    const domain = new URL(url).hostname;
    const ids = this.domainIndex.get(domain);
    if (ids) {
      ids.delete(id);
      if (ids.size === 0) {
        this.domainIndex.delete(domain);
      }
    }
  }

  private generateId(url: string): string {
    return createHash('sha256').update(url).digest('hex').substring(0, 16);
  }

  private generateHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  destroy(): void {
    // Cleanup any resources
    this.index.clear();
    this.keywordIndex.clear();
    this.domainIndex.clear();
  }
}