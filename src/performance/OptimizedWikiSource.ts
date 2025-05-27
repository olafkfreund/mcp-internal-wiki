import { EventEmitter } from 'events';
import { CacheManager, CacheOptions } from './CacheManager';
import { IndexManager, SearchOptions } from './IndexManager';
import { BatchProcessor, BatchOptions } from './BatchProcessor';
import { ConnectionPool, PoolOptions } from './ConnectionPool';
import { Logger } from '../utils/logger';

export interface WikiConfig {
  wikiSources: Array<{
    name: string;
    url: string;
    type?: string;
  }>;
}

export interface PerformanceConfig {
  cache: Partial<CacheOptions>;
  batch: Partial<BatchOptions>;
  pool: Partial<PoolOptions>;
  indexing: {
    enabled: boolean;
    rebuildInterval: number; // milliseconds
    backgroundSync: boolean;
  };
  monitoring: {
    enabled: boolean;
    metricsInterval: number;
    slowQueryThreshold: number;
  };
}

export interface PerformanceMetrics {
  requestCount: number;
  totalResponseTime: number;
  avgResponseTime: number;
  slowQueries: number;
  cache: {
    hitRate: number;
    memoryUsage: number;
    evictions: number;
  };
  pool: {
    total: number;
    inUse: number;
    available: number;
  };
}

export class OptimizedWikiSource extends EventEmitter {
  private cacheManager!: CacheManager;
  private indexManager!: IndexManager;
  private batchProcessor!: BatchProcessor<any, any>;
  private connectionPool!: ConnectionPool;
  private config: WikiConfig;
  private performanceConfig: PerformanceConfig;
  private logger: Logger;
  private metrics: PerformanceMetrics;

  constructor(config: WikiConfig, performanceConfig: PerformanceConfig) {
    super();
    this.config = config;
    this.performanceConfig = performanceConfig;
    this.logger = new Logger('OptimizedWikiSource');
    
    // Initialize performance components
    this.initializeComponents();
    
    // Initialize metrics
    this.metrics = {
      requestCount: 0,
      totalResponseTime: 0,
      avgResponseTime: 0,
      slowQueries: 0,
      cache: { hitRate: 0, memoryUsage: 0, evictions: 0 },
      pool: { total: 0, inUse: 0, available: 0 }
    };
  }

  private initializeComponents(): void {
    // Initialize cache manager with performance config
    this.cacheManager = new CacheManager({
      maxSize: 100, // 100MB default
      ttl: 3600000, // 1 hour
      maxItems: 10000,
      enablePersistence: false,
      ...this.performanceConfig.cache
    });

    // Initialize index manager
    this.indexManager = new IndexManager();

    // Initialize batch processor
    this.batchProcessor = new BatchProcessor({
      batchSize: 10,
      concurrency: 5,
      delayBetweenBatches: 100,
      maxRetries: 3,
      priorityLevels: 3,
      ...this.performanceConfig.batch
    });

    // Initialize connection pool
    this.connectionPool = new ConnectionPool(
      async () => {
        // Create HTTP client or connection
        return { id: Math.random().toString(36), created: new Date() };
      },
      async (client: any) => {
        // Cleanup connection
        console.log(`Cleaning up connection ${client.id}`);
      },
      {
        maxConnections: 10,
        acquireTimeout: 5000,
        idleTimeout: 30000,
        ...this.performanceConfig.pool
      }
    );

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Cache events
    this.cacheManager.on('metrics', (metrics) => {
      this.metrics.cache.hitRate = metrics.hitRate;
    });

    // Index events
    this.indexManager.on('rebuildCompleted', () => {
      this.logger.info('Index rebuild completed');
    });

    // Batch processor events
    this.batchProcessor.on('jobCompleted', ({ id, result }) => {
      this.logger.debug(`Batch job completed: ${id}`);
    });

    this.batchProcessor.on('jobFailed', ({ id, error }) => {
      this.logger.error(`Batch job failed: ${id}`, error);
    });
  }

  async fetchContent(url: string): Promise<string> {
    const startTime = Date.now();
    this.metrics.requestCount++;

    try {
      // Check cache first
      const cacheKey = this.cacheManager.generateKey('content', url);
      const cached = await this.cacheManager.getContent(cacheKey);
      
      if (cached) {
        this.updateMetrics(startTime);
        return cached.content;
      }

      // Fetch from source
      const connection = await this.connectionPool.acquire();
      
      try {
        // Simple HTTP fetch implementation
        const content = await this.performHttpFetch(url);
        
        // Cache the result
        await this.cacheManager.setContent(cacheKey, {
          content,
          timestamp: new Date(),
          url
        });

        // Add to index asynchronously
        if (this.performanceConfig.indexing.enabled) {
          this.addToIndexAsync(url, content);
        }

        this.updateMetrics(startTime);
        return content;
        
      } finally {
        this.connectionPool.release(connection);
      }

    } catch (error) {
      this.updateMetrics(startTime, true);
      throw error;
    }
  }

  private async performHttpFetch(url: string): Promise<string> {
    // Basic HTTP fetch implementation
    // In a real implementation, this would use axios or fetch
    return `Mock content for ${url}`;
  }

  async searchContent(query: string, options: SearchOptions = {}): Promise<any> {
    const startTime = Date.now();

    try {
      // Check query cache
      const cacheKey = this.cacheManager.generateKey('search', query, JSON.stringify(options));
      const cached = await this.cacheManager.getQuery(cacheKey);
      
      if (cached) {
        this.updateMetrics(startTime);
        return cached;
      }

      // Perform search
      const results = await this.indexManager.search(query, options);
      
      // Cache results
      await this.cacheManager.setQuery(cacheKey, results);
      
      this.updateMetrics(startTime);
      return results;

    } catch (error) {
      this.updateMetrics(startTime, true);
      throw error;
    }
  }

  async batchFetchContent(urls: string[], priority: number = 1): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    
    // Add batch jobs
    const jobPromises = urls.map(url => {
      return new Promise<void>((resolve, reject) => {
        this.batchProcessor.addJob(
          `fetch-${url}`,
          { url },
          async ({ url }) => {
            const content = await this.fetchContent(url);
            results.set(url, content);
            return content;
          },
          priority
        );

        // Monitor job completion
        const checkCompletion = () => {
          const result = this.batchProcessor.getResult(`fetch-${url}`);
          const error = this.batchProcessor.getError(`fetch-${url}`);
          
          if (result !== null) {
            resolve();
          } else if (error !== null) {
            reject(error);
          } else {
            setTimeout(checkCompletion, 100);
          }
        };
        
        checkCompletion();
      });
    });

    await Promise.allSettled(jobPromises);
    return results;
  }

  async rebuildIndex(): Promise<void> {
    if (!this.performanceConfig.indexing.enabled) {
      throw new Error('Indexing is disabled');
    }

    this.logger.info('Starting index rebuild...');
    
    // Get all wiki sources
    const sources = this.getWikiSources();
    const entries = [];
    
    for (const source of sources) {
      try {
        const content = await this.fetchContent(source.url);
        entries.push({
          url: source.url,
          title: source.name || this.extractTitleFromUrl(source.url),
          content,
          keywords: [], // Will be populated by IndexManager
          lastModified: new Date(),
          size: content.length
        });
      } catch (error) {
        this.logger.error(`Failed to fetch content for indexing: ${source.url}`, error);
      }
    }

    await this.indexManager.rebuildIndex(entries);
    this.logger.info(`Index rebuilt with ${entries.length} entries`);
  }

  getPerformanceMetrics(): any {
    return {
      ...this.metrics,
      cache: this.cacheManager.getMetrics(),
      index: this.indexManager.getStats(),
      batch: this.batchProcessor.getQueueStats(),
      pool: this.connectionPool.getStats()
    };
  }

  async optimizeCache(): Promise<void> {
    // Implement cache optimization strategies
    const metrics = this.cacheManager.getMetrics();
    
    if (metrics.hitRate < 50) {
      this.logger.warn('Low cache hit rate detected, consider increasing cache size');
    }
    
    if (metrics.memoryUsage > 80) {
      this.logger.warn('High cache memory usage, triggering cleanup');
      // Implement selective cache cleanup based on usage patterns
    }
  }

  private addToIndexAsync(url: string, content: string): void {
    this.batchProcessor.addJob(
      `index-${url}`,
      { url, content },
      async ({ url, content }) => {
        await this.indexManager.addEntry({
          url,
          title: this.extractTitleFromUrl(url),
          content,
          keywords: [], // Will be populated by IndexManager
          lastModified: new Date(),
          size: content.length
        });
      },
      0 // Low priority for indexing
    );
  }

  private updateMetrics(startTime: number, isError: boolean = false): void {
    const responseTime = Date.now() - startTime;
    
    // Update average response time
    this.metrics.totalResponseTime += responseTime;
    this.metrics.avgResponseTime = this.metrics.totalResponseTime / this.metrics.requestCount;
    
    // Track slow queries
    if (responseTime > this.performanceConfig.monitoring.slowQueryThreshold) {
      this.metrics.slowQueries++;
    }
  }

  private setupMonitoring(): void {
    if (!this.performanceConfig.monitoring.enabled) return;

    setInterval(() => {
      const metrics = this.getPerformanceMetrics();
      this.logger.info('Performance metrics:', metrics);
      
      // Emit metrics for external monitoring
      this.emit('performanceMetrics', metrics);
      
    }, this.performanceConfig.monitoring.metricsInterval);
  }

  private extractTitleFromUrl(url: string): string {
    try {
      const pathname = new URL(url).pathname;
      return pathname.split('/').pop()?.replace(/[-_]/g, ' ') || 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  private getWikiSources(): Array<{ name: string; url: string; type?: string }> {
    return this.config.wikiSources;
  }

  async destroy(): Promise<void> {
    await this.connectionPool.close();
    this.indexManager.destroy();
    this.batchProcessor.stop();
    // Call parent destroy if it exists
  }
}