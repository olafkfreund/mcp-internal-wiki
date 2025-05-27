import { OptimizedWikiSource, PerformanceConfig, WikiConfig } from '../performance/OptimizedWikiSource';
import { Logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

interface BenchmarkOptions {
  config: string;
  duration: string;
  concurrency: string;
}

interface OptimizeOptions {
  config: string;
  strategy: string;
}

interface MonitorOptions {
  config: string;
  interval: string;
}

interface StatsOptions {
  config: string;
  format: string;
}

export class PerformanceCLI {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('PerformanceCLI');
  }

  async runBenchmark(options: BenchmarkOptions): Promise<void> {
    try {
      console.log('🚀 Starting performance benchmark...');
      
      const config = this.loadConfig(options.config);
      const wikiSource = new OptimizedWikiSource(config, config.performance);
      
      const duration = parseInt(options.duration) * 1000;
      const concurrency = parseInt(options.concurrency);
      
      const results = await this.performBenchmark(wikiSource, duration, concurrency);
      
      console.log('\n📊 Benchmark Results:');
      console.log('=====================');
      console.log(`Total Requests: ${results.totalRequests}`);
      console.log(`Successful Requests: ${results.successfulRequests}`);
      console.log(`Failed Requests: ${results.failedRequests}`);
      console.log(`Average Response Time: ${results.avgResponseTime.toFixed(2)}ms`);
      console.log(`Requests per Second: ${results.requestsPerSecond.toFixed(2)}`);
      console.log(`Cache Hit Rate: ${results.cacheHitRate.toFixed(2)}%`);
      
      await wikiSource.destroy();
      
    } catch (error) {
      this.logger.error('Benchmark failed:', error);
      throw error;
    }
  }

  async runOptimization(options: OptimizeOptions): Promise<void> {
    try {
      console.log('⚡ Running optimization strategies...');
      
      const config = this.loadConfig(options.config);
      const wikiSource = new OptimizedWikiSource(config, config.performance);
      
      if (options.strategy === 'cache' || options.strategy === 'all') {
        console.log('🔧 Optimizing cache...');
        await wikiSource.optimizeCache();
      }
      
      if (options.strategy === 'index' || options.strategy === 'all') {
        console.log('📚 Rebuilding search index...');
        await wikiSource.rebuildIndex();
      }
      
      console.log('✅ Optimization completed');
      await wikiSource.destroy();
      
    } catch (error) {
      this.logger.error('Optimization failed:', error);
      throw error;
    }
  }

  async startMonitoring(options: MonitorOptions): Promise<void> {
    try {
      console.log('📊 Starting performance monitoring...');
      console.log('Press Ctrl+C to stop\n');
      
      const config = this.loadConfig(options.config);
      const wikiSource = new OptimizedWikiSource(config, config.performance);
      const interval = parseInt(options.interval) * 1000;
      
      const monitorTimer = setInterval(async () => {
        const metrics = await wikiSource.getPerformanceMetrics();
        
        console.clear();
        console.log('📊 Performance Monitor - ' + new Date().toLocaleTimeString());
        console.log('='.repeat(60));
        
        console.log('\n🚀 Request Metrics:');
        console.log(`  Total Requests: ${metrics.requestCount}`);
        console.log(`  Avg Response Time: ${metrics.avgResponseTime.toFixed(2)}ms`);
        console.log(`  Slow Queries: ${metrics.slowQueries}`);
        
        console.log('\n💾 Cache Metrics:');
        console.log(`  Hit Rate: ${metrics.cache.hitRate.toFixed(2)}%`);
        console.log(`  Memory Usage: ${metrics.cache.memoryUsage.toFixed(2)}MB`);
        console.log(`  Total Requests: ${metrics.cache.totalRequests}`);
        console.log(`  Hits: ${metrics.cache.hits} | Misses: ${metrics.cache.misses}`);
        
        console.log('\n📚 Index Metrics:');
        const indexStats = await metrics.index;
        console.log(`  Total Entries: ${indexStats.totalEntries}`);
        console.log(`  Total Size: ${(indexStats.totalSize / (1024 * 1024)).toFixed(2)}MB`);
        console.log(`  Domains: ${indexStats.domains.length}`);
        
        console.log('\n🔄 Connection Pool:');
        console.log(`  Total: ${metrics.pool.total} | In Use: ${metrics.pool.inUse}`);
        console.log(`  Available: ${metrics.pool.available} | Waiting: ${metrics.pool.waiting}`);
        
      }, interval);
      
      process.on('SIGINT', async () => {
        clearInterval(monitorTimer);
        console.log('\n\n🛑 Monitoring stopped');
        await wikiSource.destroy();
        process.exit(0);
      });
      
    } catch (error) {
      this.logger.error('Monitoring failed:', error);
      throw error;
    }
  }

  async rebuildIndex(configPath: string): Promise<void> {
    try {
      console.log('📚 Rebuilding search index...');
      
      const config = this.loadConfig(configPath);
      const wikiSource = new OptimizedWikiSource(config, config.performance);
      
      await wikiSource.rebuildIndex();
      
      console.log('✅ Index rebuild completed');
      await wikiSource.destroy();
      
    } catch (error) {
      this.logger.error('Index rebuild failed:', error);
      throw error;
    }
  }

  async showStats(options: StatsOptions): Promise<void> {
    try {
      const config = this.loadConfig(options.config);
      const wikiSource = new OptimizedWikiSource(config, config.performance);
      
      const metrics = await wikiSource.getPerformanceMetrics();
      
      if (options.format === 'json') {
        console.log(JSON.stringify(metrics, null, 2));
      } else {
        console.log('\n📊 Performance Statistics');
        console.log('=========================');
        
        console.log('\n🚀 Request Statistics:');
        console.log(`  Total Requests: ${metrics.requestCount}`);
        console.log(`  Average Response Time: ${metrics.avgResponseTime.toFixed(2)}ms`);
        console.log(`  Slow Queries: ${metrics.slowQueries}`);
        
        console.log('\n💾 Cache Statistics:');
        console.log(`  Hit Rate: ${metrics.cache.hitRate.toFixed(2)}%`);
        console.log(`  Memory Usage: ${metrics.cache.memoryUsage.toFixed(2)}MB`);
        console.log(`  Hits: ${metrics.cache.hits}`);
        console.log(`  Misses: ${metrics.cache.misses}`);
        console.log(`  Evictions: ${metrics.cache.evictions}`);
        
        const indexStats = await metrics.index;
        console.log('\n📚 Index Statistics:');
        console.log(`  Total Entries: ${indexStats.totalEntries}`);
        console.log(`  Total Size: ${(indexStats.totalSize / (1024 * 1024)).toFixed(2)}MB`);
        console.log(`  Average Entry Size: ${(indexStats.averageSize / 1024).toFixed(2)}KB`);
        console.log(`  Domains: ${indexStats.domains.join(', ')}`);
        
        console.log('\n🔄 Connection Pool Statistics:');
        console.log(`  Total Connections: ${metrics.pool.total}`);
        console.log(`  In Use: ${metrics.pool.inUse}`);
        console.log(`  Available: ${metrics.pool.available}`);
        console.log(`  Waiting: ${metrics.pool.waiting}`);
      }
      
      await wikiSource.destroy();
      
    } catch (error) {
      this.logger.error('Failed to get statistics:', error);
      throw error;
    }
  }

  private async performBenchmark(
    wikiSource: OptimizedWikiSource, 
    duration: number, 
    concurrency: number
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    avgResponseTime: number;
    requestsPerSecond: number;
    cacheHitRate: number;
  }> {
    const startTime = Date.now();
    const endTime = startTime + duration;
    
    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;
    let totalResponseTime = 0;
    
    const workers = [];
    
    for (let i = 0; i < concurrency; i++) {
      workers.push(this.runWorker(wikiSource, endTime, (success, responseTime) => {
        totalRequests++;
        if (success) {
          successfulRequests++;
          totalResponseTime += responseTime;
        } else {
          failedRequests++;
        }
      }));
    }
    
    await Promise.all(workers);
    
    const actualDuration = Date.now() - startTime;
    const metrics = await wikiSource.getPerformanceMetrics();
    
    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      avgResponseTime: successfulRequests > 0 ? totalResponseTime / successfulRequests : 0,
      requestsPerSecond: (totalRequests / actualDuration) * 1000,
      cacheHitRate: metrics.cache.hitRate
    };
  }

  private async runWorker(
    wikiSource: OptimizedWikiSource,
    endTime: number,
    callback: (success: boolean, responseTime: number) => void
  ): Promise<void> {
    const testUrls = [
      'https://example.com/page1',
      'https://example.com/page2',
      'https://example.com/page3',
      'https://example.com/page4',
      'https://example.com/page5'
    ];
    
    while (Date.now() < endTime) {
      const url = testUrls[Math.floor(Math.random() * testUrls.length)];
      const startTime = Date.now();
      
      try {
        await wikiSource.fetchContent(url);
        const responseTime = Date.now() - startTime;
        callback(true, responseTime);
      } catch (error) {
        const responseTime = Date.now() - startTime;
        callback(false, responseTime);
      }
      
      // Small delay to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  private loadConfig(configPath: string): WikiConfig & { performance: PerformanceConfig } {
    try {
      const fullPath = path.resolve(configPath);
      const configData = fs.readFileSync(fullPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      this.logger.error(`Failed to load config from ${configPath}:`, error);
      throw new Error(`Configuration file not found or invalid: ${configPath}`);
    }
  }
}