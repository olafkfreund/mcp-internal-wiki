import { OptimizedWikiSource, PerformanceConfig, WikiConfig } from '../OptimizedWikiSource';
import { CacheManager } from '../CacheManager';
import { IndexManager } from '../IndexManager';
import { BatchProcessor } from '../BatchProcessor';
import { Logger } from '../../utils/logger';

export class PerformanceTestSuite {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('PerformanceTest');
  }

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Performance Test Suite');
    console.log('=================================\n');

    await this.testCachePerformance();
    await this.testIndexPerformance();
    await this.testBatchProcessing();
    await this.testOptimizedWikiSource();
    await this.testMemoryUsage();
    await this.testConcurrency();

    console.log('\n✅ All performance tests completed');
  }

  private async testCachePerformance(): Promise<void> {
    console.log('🔍 Testing Cache Performance...');
    
    const cache = new CacheManager({
      maxSize: 10, // 10MB
      ttl: 5000, // 5 seconds
      maxItems: 1000,
      enablePersistence: false
    });

    const startTime = Date.now();
    
    // Test cache writes
    for (let i = 0; i < 1000; i++) {
      await cache.setContent(`key-${i}`, {
        content: `Content for item ${i}`.repeat(100),
        timestamp: new Date()
      });
    }

    // Test cache reads
    let hits = 0;
    for (let i = 0; i < 1000; i++) {
      const result = await cache.getContent(`key-${i}`);
      if (result) hits++;
    }

    const metrics = cache.getMetrics();
    const duration = Date.now() - startTime;

    console.log(`  ✓ Cache operations: ${duration}ms`);
    console.log(`  ✓ Hit rate: ${metrics.hitRate.toFixed(2)}%`);
    console.log(`  ✓ Memory usage: ${metrics.memoryUsage.toFixed(2)}MB`);
    console.log(`  ✓ Items cached: ${hits}/1000\n`);
  }

  private async testIndexPerformance(): Promise<void> {
    console.log('📚 Testing Index Performance...');
    
    const index = new IndexManager();
    const startTime = Date.now();

    // Add test entries
    const entries = [];
    for (let i = 0; i < 500; i++) {
      entries.push({
        url: `https://example.com/page-${i}`,
        title: `Test Page ${i}`,
        content: `This is test content for page ${i}. `.repeat(50),
        keywords: [],
        lastModified: new Date(),
        size: 0
      });
    }

    await index.rebuildIndex(entries);
    const indexTime = Date.now() - startTime;

    // Test search performance
    const searchStart = Date.now();
    const results = await index.search('test content', { limit: 20 });
    const searchTime = Date.now() - searchStart;

    const stats = await index.getStats();

    console.log(`  ✓ Index build time: ${indexTime}ms`);
    console.log(`  ✓ Search time: ${searchTime}ms`);
    console.log(`  ✓ Total entries: ${stats.totalEntries}`);
    console.log(`  ✓ Search results: ${results.entries.length}`);
    console.log(`  ✓ Index size: ${(stats.totalSize / (1024 * 1024)).toFixed(2)}MB\n`);

    index.destroy();
  }

  private async testBatchProcessing(): Promise<void> {
    console.log('⚡ Testing Batch Processing...');
    
    const batchProcessor = new BatchProcessor({
      batchSize: 10,
      concurrency: 5,
      delayBetweenBatches: 10,
      maxRetries: 2,
      priorityLevels: 3
    });

    const startTime = Date.now();
    const jobPromises: Promise<void>[] = [];

    // Add 100 test jobs
    for (let i = 0; i < 100; i++) {
      const jobPromise = new Promise<void>((resolve, reject) => {
        batchProcessor.addJob(
          `test-job-${i}`,
          { value: i },
          async (data: any) => {
            // Simulate work
            await new Promise(r => setTimeout(r, Math.random() * 50));
            return data.value * 2;
          },
          Math.floor(Math.random() * 3) // Random priority
        );

        // Monitor completion
        const checkCompletion = () => {
          const result = batchProcessor.getResult(`test-job-${i}`);
          const error = batchProcessor.getError(`test-job-${i}`);
          
          if (result !== null) {
            resolve();
          } else if (error !== null) {
            reject(error);
          } else {
            setTimeout(checkCompletion, 10);
          }
        };
        
        checkCompletion();
      });
      
      jobPromises.push(jobPromise);
    }

    await Promise.allSettled(jobPromises);
    const duration = Date.now() - startTime;
    
    const stats = batchProcessor.getQueueStats();
    const completedJobs = jobPromises.length;

    console.log(`  ✓ Batch processing time: ${duration}ms`);
    console.log(`  ✓ Jobs per second: ${(completedJobs / (duration / 1000)).toFixed(2)}`);
    console.log(`  ✓ Queue stats: ${JSON.stringify(stats[0])}\n`);

    batchProcessor.stop();
  }

  private async testOptimizedWikiSource(): Promise<void> {
    console.log('🚀 Testing Optimized Wiki Source...');
    
    const config: WikiConfig & { performance: PerformanceConfig } = {
      wikiSources: [
        { name: 'Test Wiki', url: 'https://example.com/wiki' }
      ],
      performance: {
        cache: {
          maxSize: 50,
          ttl: 10000,
          maxItems: 1000,
          enablePersistence: false
        },
        batch: {
          batchSize: 5,
          concurrency: 3,
          delayBetweenBatches: 10,
          maxRetries: 2,
          priorityLevels: 3
        },
        pool: {
          maxConnections: 10,
          acquireTimeout: 5000,
          idleTimeout: 60000
        },
        indexing: {
          enabled: true,
          rebuildInterval: 3600000,
          backgroundSync: true
        },
        monitoring: {
          enabled: false,
          metricsInterval: 10000,
          slowQueryThreshold: 1000
        }
      }
    };

    const wikiSource = new OptimizedWikiSource(config, config.performance);
    const startTime = Date.now();

    // Test multiple fetches (should hit cache after first)
    const urls = [
      'https://example.com/page1',
      'https://example.com/page2',
      'https://example.com/page1', // Cache hit
      'https://example.com/page3',
      'https://example.com/page2'  // Cache hit
    ];

    for (const url of urls) {
      await wikiSource.fetchContent(url);
    }

    // Test batch fetch
    await wikiSource.batchFetchContent([
      'https://example.com/batch1',
      'https://example.com/batch2',
      'https://example.com/batch3'
    ]);

    // Test search
    await wikiSource.searchContent('test query');

    const duration = Date.now() - startTime;
    const metrics = await wikiSource.getPerformanceMetrics();

    console.log(`  ✓ Total operation time: ${duration}ms`);
    console.log(`  ✓ Requests processed: ${metrics.requestCount}`);
    console.log(`  ✓ Average response time: ${metrics.avgResponseTime.toFixed(2)}ms`);
    console.log(`  ✓ Cache hit rate: ${metrics.cache.hitRate.toFixed(2)}%\n`);

    await wikiSource.destroy();
  }

  private async testMemoryUsage(): Promise<void> {
    console.log('💾 Testing Memory Usage...');
    
    const cache = new CacheManager({
      maxSize: 5, // 5MB limit
      ttl: 60000,
      maxItems: 10000,
      enablePersistence: false
    });

    const initialMemory = process.memoryUsage();
    
    // Fill cache with large objects
    for (let i = 0; i < 1000; i++) {
      await cache.setContent(`large-${i}`, {
        content: 'x'.repeat(10000), // 10KB per item
        metadata: { size: 10000, index: i }
      });
    }

    const metrics = cache.getMetrics();
    const finalMemory = process.memoryUsage();
    const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / (1024 * 1024);

    console.log(`  ✓ Cache memory usage: ${metrics.memoryUsage.toFixed(2)}MB`);
    console.log(`  ✓ Process memory increase: ${memoryIncrease.toFixed(2)}MB`);
    console.log(`  ✓ Cache evictions: ${metrics.evictions}`);
    console.log(`  ✓ Memory efficiency: ${(metrics.memoryUsage / memoryIncrease * 100).toFixed(1)}%\n`);
  }

  private async testConcurrency(): Promise<void> {
    console.log('🔄 Testing Concurrency...');
    
    const config: WikiConfig & { performance: PerformanceConfig } = {
      wikiSources: [],
      performance: {
        cache: { maxSize: 100, ttl: 60000, maxItems: 5000, enablePersistence: false },
        batch: { batchSize: 10, concurrency: 20, delayBetweenBatches: 1, maxRetries: 1, priorityLevels: 2 },
        pool: { maxConnections: 25, acquireTimeout: 1000, idleTimeout: 10000 },
        indexing: { enabled: false, rebuildInterval: 0, backgroundSync: false },
        monitoring: { enabled: false, metricsInterval: 1000, slowQueryThreshold: 500 }
      }
    };

    const wikiSource = new OptimizedWikiSource(config, config.performance);
    const startTime = Date.now();
    const concurrentRequests = 50;

    // Create concurrent requests
    const promises = [];
    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(
        wikiSource.fetchContent(`https://example.com/concurrent-${i % 10}`)
      );
    }

    const results = await Promise.allSettled(promises);
    const duration = Date.now() - startTime;
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    const metrics = await wikiSource.getPerformanceMetrics();

    console.log(`  ✓ Concurrent requests: ${concurrentRequests}`);
    console.log(`  ✓ Successful: ${successful}, Failed: ${failed}`);
    console.log(`  ✓ Total time: ${duration}ms`);
    console.log(`  ✓ Requests per second: ${(concurrentRequests / (duration / 1000)).toFixed(2)}`);
    console.log(`  ✓ Cache hit rate: ${metrics.cache.hitRate.toFixed(2)}%`);
    console.log(`  ✓ Pool utilization: ${metrics.pool.inUse}/${metrics.pool.total}\n`);

    await wikiSource.destroy();
  }
}

// Example usage and benchmark runner
export async function runPerformanceTests(): Promise<void> {
  const testSuite = new PerformanceTestSuite();
  await testSuite.runAllTests();
}

// Load testing function
export async function runLoadTest(
  duration: number = 60000, 
  concurrency: number = 10
): Promise<void> {
  console.log(`🔥 Starting Load Test (${duration/1000}s, ${concurrency} concurrent users)`);
  console.log('==================================================================\n');

  const config: WikiConfig & { performance: PerformanceConfig } = {
    wikiSources: [
      { name: 'Load Test Wiki', url: 'https://example.com/wiki' }
    ],
    performance: {
      cache: { maxSize: 200, ttl: 30000, maxItems: 10000, enablePersistence: false },
      batch: { batchSize: 20, concurrency: 15, delayBetweenBatches: 5, maxRetries: 3, priorityLevels: 3 },
      pool: { maxConnections: 50, acquireTimeout: 10000, idleTimeout: 120000 },
      indexing: { enabled: true, rebuildInterval: 300000, backgroundSync: true },
      monitoring: { enabled: true, metricsInterval: 5000, slowQueryThreshold: 2000 }
    }
  };

  const wikiSource = new OptimizedWikiSource(config, config.performance);
  const startTime = Date.now();
  const endTime = startTime + duration;
  
  let totalRequests = 0;
  let successfulRequests = 0;
  let failedRequests = 0;
  let totalResponseTime = 0;

  const workers = [];
  const testUrls = Array.from({ length: 20 }, (_, i) => `https://example.com/load-test-${i}`);

  // Start workers
  for (let i = 0; i < concurrency; i++) {
    workers.push((async () => {
      while (Date.now() < endTime) {
        const url = testUrls[Math.floor(Math.random() * testUrls.length)];
        const requestStart = Date.now();
        
        try {
          await wikiSource.fetchContent(url);
          const responseTime = Date.now() - requestStart;
          
          totalRequests++;
          successfulRequests++;
          totalResponseTime += responseTime;
          
        } catch (error) {
          totalRequests++;
          failedRequests++;
        }
        
        // Small delay to simulate realistic usage
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      }
    })());
  }

  // Monitor progress
  const progressInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const progress = (elapsed / duration * 100).toFixed(1);
    const rps = totalRequests / (elapsed / 1000);
    
    process.stdout.write(`\r📊 Progress: ${progress}% | Requests: ${totalRequests} | RPS: ${rps.toFixed(2)} | Success Rate: ${(successfulRequests/totalRequests*100).toFixed(1)}%`);
  }, 1000);

  await Promise.all(workers);
  clearInterval(progressInterval);

  const actualDuration = Date.now() - startTime;
  const metrics = await wikiSource.getPerformanceMetrics();

  console.log('\n\n🏁 Load Test Results:');
  console.log('=====================');
  console.log(`Duration: ${(actualDuration/1000).toFixed(2)}s`);
  console.log(`Total Requests: ${totalRequests}`);
  console.log(`Successful: ${successfulRequests} (${(successfulRequests/totalRequests*100).toFixed(2)}%)`);
  console.log(`Failed: ${failedRequests} (${(failedRequests/totalRequests*100).toFixed(2)}%)`);
  console.log(`Average Response Time: ${(totalResponseTime/successfulRequests).toFixed(2)}ms`);
  console.log(`Requests per Second: ${(totalRequests/(actualDuration/1000)).toFixed(2)}`);
  console.log(`Cache Hit Rate: ${metrics.cache.hitRate.toFixed(2)}%`);
  console.log(`Slow Queries: ${metrics.slowQueries}`);

  await wikiSource.destroy();
}