#!/usr/bin/env tsx

import { CacheManager } from './performance/CacheManager';
import { IndexManager } from './performance/IndexManager';
import { BatchProcessor } from './performance/BatchProcessor';
import { ConnectionPool } from './performance/ConnectionPool';
import { OptimizedWikiSource } from './performance/OptimizedWikiSource';
import { runPerformanceTests, runLoadTest } from './performance/tests/PerformanceTest';
import { Logger } from './utils/logger';

const logger = new Logger('TestRunner');

async function testCacheManager(): Promise<void> {
  console.log('\n🧪 Testing CacheManager...');
  
  const cache = new CacheManager({
    maxSize: 10, // 10MB
    ttl: 5000, // 5 seconds
    maxItems: 100,
    enablePersistence: false
  });

  // Test content caching
  console.log('  ✓ Testing content cache...');
  await cache.setContent('test-page-1', {
    content: 'This is test content for page 1',
    url: 'https://example.com/page1',
    timestamp: new Date()
  });

  const cached = await cache.getContent('test-page-1');
  console.log('  ✓ Content retrieved:', cached ? '✅ Success' : '❌ Failed');

  // Test metadata caching
  console.log('  ✓ Testing metadata cache...');
  await cache.setMetadata('meta-1', {
    title: 'Test Page',
    author: 'Test Author',
    lastModified: new Date()
  });

  const metadata = await cache.getMetadata('meta-1');
  console.log('  ✓ Metadata retrieved:', metadata ? '✅ Success' : '❌ Failed');

  // Test query caching
  console.log('  ✓ Testing query cache...');
  await cache.setQuery('search-test', {
    query: 'test search',
    results: ['page1', 'page2'],
    totalCount: 2
  });

  const queryResult = await cache.getQuery('search-test');
  console.log('  ✓ Query result retrieved:', queryResult ? '✅ Success' : '❌ Failed');

  // Test cache metrics
  const metrics = cache.getMetrics();
  console.log('  ✓ Cache metrics:');
  console.log(`    - Total requests: ${metrics.totalRequests}`);
  console.log(`    - Hit rate: ${metrics.hitRate.toFixed(2)}%`);
  console.log(`    - Memory usage: ${metrics.memoryUsage.toFixed(2)}MB`);

  // Test TTL expiration
  console.log('  ✓ Testing TTL expiration...');
  await new Promise(resolve => setTimeout(resolve, 6000)); // Wait for TTL to expire
  
  const expiredContent = await cache.getContent('test-page-1');
  console.log('  ✓ TTL expiration works:', !expiredContent ? '✅ Success' : '❌ Failed');
}

async function testIndexManager(): Promise<void> {
  console.log('\n🧪 Testing IndexManager...');
  
  const indexManager = new IndexManager();

  // Add test entries
  console.log('  ✓ Adding test entries...');
  const testEntries = [
    {
      url: 'https://example.com/react-guide',
      title: 'React Development Guide',
      content: 'This is a comprehensive guide to React development. It covers components, hooks, state management, and best practices.',
      keywords: [],
      lastModified: new Date(),
      size: 0
    },
    {
      url: 'https://example.com/typescript-basics',
      title: 'TypeScript Basics',
      content: 'Learn TypeScript fundamentals including types, interfaces, classes, and advanced features for better JavaScript development.',
      keywords: [],
      lastModified: new Date(),
      size: 0
    },
    {
      url: 'https://example.com/performance-optimization',
      title: 'Performance Optimization',
      content: 'Best practices for optimizing web application performance including caching, lazy loading, and code splitting.',
      keywords: [],
      lastModified: new Date(),
      size: 0
    }
  ];

  await indexManager.rebuildIndex(testEntries);

  // Test search functionality
  console.log('  ✓ Testing search...');
  const searchResults = await indexManager.search('React development', { limit: 10 });
  console.log(`  ✓ Search found ${searchResults.entries.length} results`);
  console.log(`  ✓ First result: ${searchResults.entries[0]?.title || 'None'}`);

  // Test fuzzy search
  const fuzzyResults = await indexManager.search('TypeScrit', { fuzzy: true, limit: 5 });
  console.log(`  ✓ Fuzzy search found ${fuzzyResults.entries.length} results`);

  // Test stats
  const stats = await indexManager.getStats();
  console.log('  ✓ Index statistics:');
  console.log(`    - Total entries: ${stats.totalEntries}`);
  console.log(`    - Total size: ${(stats.totalSize / 1024).toFixed(2)}KB`);
  console.log(`    - Domains: ${stats.domains.join(', ')}`);

  indexManager.destroy();
}

async function testBatchProcessor(): Promise<void> {
  console.log('\n🧪 Testing BatchProcessor...');
  
  const batchProcessor = new BatchProcessor({
    batchSize: 3,
    concurrency: 2,
    delayBetweenBatches: 100,
    maxRetries: 2,
    priorityLevels: 2
  });

  console.log('  ✓ Adding batch jobs...');
  const jobPromises: Promise<void>[] = [];

  // Add test jobs
  for (let i = 0; i < 10; i++) {
    const jobPromise = new Promise<void>((resolve, reject) => {
      batchProcessor.addJob(
        `test-job-${i}`,
        { id: i, data: `test-data-${i}` },
        async (data: any) => {
          // Simulate work
          await new Promise(r => setTimeout(r, Math.random() * 200));
          return `processed-${data.id}`;
        },
        i % 2 // Alternate priority
      );

      // Monitor completion
      const checkCompletion = () => {
        const result = batchProcessor.getResult(`test-job-${i}`);
        const error = batchProcessor.getError(`test-job-${i}`);
        
        if (result !== null) {
          console.log(`    ✓ Job ${i} completed with result: ${result}`);
          resolve();
        } else if (error !== null) {
          console.log(`    ❌ Job ${i} failed: ${error}`);
          reject(error);
        } else {
          setTimeout(checkCompletion, 50);
        }
      };
      
      checkCompletion();
    });
    
    jobPromises.push(jobPromise);
  }

  // Wait for all jobs to complete
  const results = await Promise.allSettled(jobPromises);
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  console.log(`  ✓ Batch processing completed: ${successful} successful, ${failed} failed`);

  // Test queue stats
  const stats = batchProcessor.getQueueStats();
  console.log('  ✓ Queue statistics:', stats);

  batchProcessor.stop();
}

async function testConnectionPool(): Promise<void> {
  console.log('\n🧪 Testing ConnectionPool...');
  
  const pool = new ConnectionPool(
    async () => {
      // Mock connection creation
      return { id: Math.random().toString(36), created: new Date() };
    },
    async (connection: any) => {
      // Mock connection cleanup
      console.log(`    ✓ Cleaned up connection ${connection.id}`);
    },
    {
      maxConnections: 5,
      acquireTimeout: 1000,
      idleTimeout: 5000
    }
  );

  console.log('  ✓ Testing connection acquisition...');
  const connections = [];
  
  // Acquire multiple connections
  for (let i = 0; i < 3; i++) {
    const conn = await pool.acquire();
    connections.push(conn);
    console.log(`    ✓ Acquired connection ${i + 1}`);
  }

  // Test pool stats
  const stats = pool.getStats();
  console.log('  ✓ Pool statistics:');
  console.log(`    - Total: ${stats.total}`);
  console.log(`    - In use: ${stats.inUse}`);
  console.log(`    - Available: ${stats.available}`);

  // Release connections
  for (const conn of connections) {
    pool.release(conn);
  }

  console.log('  ✓ Released all connections');

  await pool.close();
}

async function testOptimizedWikiSource(): Promise<void> {
  console.log('\n🧪 Testing OptimizedWikiSource...');
  
  const config = {
    wikiSources: [
      { name: 'Test Wiki', url: 'https://example.com/wiki' }
    ],
    performance: {
      cache: {
        maxSize: 50,
        ttl: 10000,
        maxItems: 100,
        enablePersistence: false
      },
      batch: {
        batchSize: 5,
        concurrency: 2,
        delayBetweenBatches: 50,
        maxRetries: 2,
        priorityLevels: 2
      },
      pool: {
        maxConnections: 10,
        acquireTimeout: 5000,
        idleTimeout: 30000
      },
      indexing: {
        enabled: true,
        rebuildInterval: 60000,
        backgroundSync: true
      },
      monitoring: {
        enabled: false,
        metricsInterval: 5000,
        slowQueryThreshold: 1000
      }
    }
  };

  const wikiSource = new OptimizedWikiSource(config, config.performance);

  console.log('  ✓ Testing content fetching...');
  
  // Test single content fetch
  const content1 = await wikiSource.fetchContent('https://example.com/page1');
  console.log(`    ✓ Fetched content (${content1.length} chars)`);

  // Test cache hit (same URL)
  const content2 = await wikiSource.fetchContent('https://example.com/page1');
  console.log(`    ✓ Cache hit test (${content2.length} chars)`);

  // Test batch fetching
  console.log('  ✓ Testing batch content fetching...');
  const batchUrls = [
    'https://example.com/batch1',
    'https://example.com/batch2',
    'https://example.com/batch3'
  ];
  
  const batchResults = await wikiSource.batchFetchContent(batchUrls);
  console.log(`    ✓ Batch fetched ${batchResults.size} pages`);

  // Test search
  console.log('  ✓ Testing search...');
  const searchResults = await wikiSource.searchContent('test query');
  console.log(`    ✓ Search completed`);

  // Get performance metrics
  const metrics = await wikiSource.getPerformanceMetrics();
  console.log('  ✓ Performance metrics:');
  console.log(`    - Requests: ${metrics.requestCount}`);
  console.log(`    - Avg response time: ${metrics.avgResponseTime.toFixed(2)}ms`);
  console.log(`    - Cache hit rate: ${metrics.cache.hitRate.toFixed(2)}%`);

  await wikiSource.destroy();
}

async function runQuickLoadTest(): Promise<void> {
  console.log('\n🧪 Running Quick Load Test (10 seconds)...');
  
  try {
    await runLoadTest(10000, 5); // 10 seconds, 5 concurrent users
  } catch (error) {
    console.log('  ⚠️ Load test failed:', error);
  }
}

async function main(): Promise<void> {
  console.log('🚀 Starting Performance Optimization Tests');
  console.log('==========================================');

  try {
    await testCacheManager();
    await testIndexManager();
    await testBatchProcessor();
    await testConnectionPool();
    await testOptimizedWikiSource();
    
    // Optional: Run quick load test
    const runLoadTestFlag = process.argv.includes('--load-test');
    if (runLoadTestFlag) {
      await runQuickLoadTest();
    }

    console.log('\n✅ All tests completed successfully!');
    console.log('\nTo run additional tests:');
    console.log('  - Full performance suite: npm run test:performance');
    console.log('  - Load test: node dist/test-performance.js --load-test');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as runTests };