import { createHash } from 'crypto';
import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';

export interface CacheOptions {
  maxSize: number; // Maximum cache size in MB
  ttl: number; // Time to live in milliseconds
  maxItems: number; // Maximum number of items
  enablePersistence: boolean;
  persistencePath?: string;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  totalRequests: number;
  hitRate: number;
  memoryUsage: number;
}

interface CacheEntry<T> {
  value: T;
  expiry: number;
  size: number;
  lastAccessed: number;
}

class SimpleCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxItems: number;
  private maxSize: number;
  private currentSize = 0;

  constructor(maxItems: number, maxSize: number) {
    this.maxItems = maxItems;
    this.maxSize = maxSize;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.delete(key);
      return null;
    }
    
    entry.lastAccessed = Date.now();
    return entry.value;
  }

  set(key: string, value: T, ttl: number): void {
    const size = JSON.stringify(value).length;
    const expiry = Date.now() + ttl;
    
    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      this.delete(key);
    }
    
    // Check if we need to evict items
    while (
      (this.cache.size >= this.maxItems || this.currentSize + size > this.maxSize) &&
      this.cache.size > 0
    ) {
      this.evictLRU();
    }
    
    this.cache.set(key, { value, expiry, size, lastAccessed: Date.now() });
    this.currentSize += size;
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentSize -= entry.size;
      return this.cache.delete(key);
    }
    return false;
  }

  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }

  size(): number {
    return this.cache.size;
  }

  memoryUsage(): number {
    return this.currentSize;
  }

  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.delete(oldestKey);
    }
  }
}

export class CacheManager extends EventEmitter {
  private contentCache!: SimpleCache<any>;
  private metadataCache!: SimpleCache<any>;
  private queryCache!: SimpleCache<any>;
  private metrics: CacheMetrics;
  private logger: Logger;
  private options: CacheOptions;

  constructor(options: CacheOptions) {
    super();
    this.options = options;
    this.logger = new Logger('CacheManager');
    
    // Initialize metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalRequests: 0,
      hitRate: 0,
      memoryUsage: 0
    };

    // Initialize caches
    this.initializeCaches();
    this.startMetricsCollection();
  }

  private initializeCaches(): void {
    const itemsPerCache = Math.floor(this.options.maxItems / 3);
    const sizePerCache = this.options.maxSize * 1024 * 1024 / 3; // Convert MB to bytes

    // Content cache for large wiki pages (60% of space)
    this.contentCache = new SimpleCache(itemsPerCache, sizePerCache * 0.6);

    // Metadata cache for page information (30% of space)
    this.metadataCache = new SimpleCache(itemsPerCache, sizePerCache * 0.3);

    // Query cache for search results (10% of space)
    this.queryCache = new SimpleCache(itemsPerCache, sizePerCache * 0.1);
  }

  async getContent(key: string): Promise<any | null> {
    this.metrics.totalRequests++;
    const cached = this.contentCache.get(key);
    
    if (cached) {
      this.metrics.hits++;
      this.updateHitRate();
      return cached;
    }
    
    this.metrics.misses++;
    this.updateHitRate();
    return null;
  }

  async setContent(key: string, value: any, customTtl?: number): Promise<void> {
    const ttl = customTtl || this.options.ttl;
    this.contentCache.set(key, value, ttl);
    this.updateMemoryUsage();
  }

  async getMetadata(key: string): Promise<any | null> {
    this.metrics.totalRequests++;
    const cached = this.metadataCache.get(key);
    
    if (cached) {
      this.metrics.hits++;
      this.updateHitRate();
      return cached;
    }
    
    this.metrics.misses++;
    this.updateHitRate();
    return null;
  }

  async setMetadata(key: string, value: any): Promise<void> {
    this.metadataCache.set(key, value, this.options.ttl);
    this.updateMemoryUsage();
  }

  async getQuery(key: string): Promise<any | null> {
    this.metrics.totalRequests++;
    const cached = this.queryCache.get(key);
    
    if (cached) {
      this.metrics.hits++;
      this.updateHitRate();
      return cached;
    }
    
    this.metrics.misses++;
    this.updateHitRate();
    return null;
  }

  async setQuery(key: string, value: any): Promise<void> {
    this.queryCache.set(key, value, this.options.ttl);
    this.updateMemoryUsage();
  }

  generateKey(...parts: string[]): string {
    return createHash('sha256').update(parts.join('|')).digest('hex');
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  clear(): void {
    this.contentCache.clear();
    this.metadataCache.clear();
    this.queryCache.clear();
    this.resetMetrics();
  }

  private updateHitRate(): void {
    this.metrics.hitRate = (this.metrics.hits / this.metrics.totalRequests) * 100;
  }

  private updateMemoryUsage(): void {
    this.metrics.memoryUsage = (
      this.contentCache.memoryUsage() +
      this.metadataCache.memoryUsage() +
      this.queryCache.memoryUsage()
    ) / (1024 * 1024); // Convert to MB
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      this.updateMemoryUsage();
      this.emit('metrics', this.getMetrics());
    }, 30000); // Every 30 seconds
  }

  private resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalRequests: 0,
      hitRate: 0,
      memoryUsage: 0
    };
  }
}