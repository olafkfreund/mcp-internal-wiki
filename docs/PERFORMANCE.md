# Performance Optimization for Large Wiki Datasets

This document describes the comprehensive performance optimization features implemented for handling enterprise-scale wiki deployments with millions of pages and high concurrent user loads.

## 🚀 Key Performance Features

### 1. Intelligent Caching System
- **Multi-level caching** with memory and optional persistent storage
- **Automatic cache invalidation** based on TTL and content changes
- **Cache warming** strategies for frequently accessed content
- **Memory-efficient** LRU eviction policies
- **Compression** for stored cache entries

### 2. Full-Text Search Indexing
- **Real-time indexing** of wiki content
- **Incremental updates** for changed content
- **Fuzzy search** capabilities with ranking
- **Background index rebuilding** to maintain performance
- **Memory-optimized** inverted index structure

### 3. Batch Processing Engine
- **Priority-based job queuing** for background tasks
- **Configurable concurrency** limits
- **Automatic retry** mechanisms with exponential backoff
- **Job deduplication** to prevent redundant work
- **Progress tracking** and monitoring

### 4. Connection Pool Management
- **Intelligent connection reuse** for HTTP requests
- **Automatic failover** and load balancing
- **Connection health monitoring**
- **Configurable timeouts** and retry policies
- **Resource cleanup** and garbage collection

## 📊 Performance Metrics

The system provides comprehensive monitoring of:
- Request throughput and response times
- Cache hit/miss ratios and memory usage
- Search index performance and size
- Connection pool utilization
- Background job processing rates

## 🛠 Configuration

### Basic Configuration
```json
{
  "performance": {
    "cache": {
      "maxSize": 500,
      "ttl": 7200000,
      "maxItems": 50000,
      "enablePersistence": true
    },
    "batch": {
      "batchSize": 20,
      "concurrency": 10,
      "maxRetries": 5
    },
    "pool": {
      "maxConnections": 50,
      "acquireTimeout": 30000
    },
    "indexing": {
      "enabled": true,
      "rebuildInterval": 86400000,
      "backgroundSync": true
    }
  }
}
```

### Environment Variables
```bash
# Memory settings
NODE_OPTIONS="--max-old-space-size=8192 --gc-global"
UV_THREADPOOL_SIZE=128

# Performance features
CACHE_ENABLED=true
INDEXING_ENABLED=true
PERFORMANCE_MONITORING=true

# Limits
CACHE_SIZE_MB=500
MAX_CONNECTIONS=50
BATCH_SIZE=20
```

## 🔧 Usage Examples

### Basic Setup
```typescript
import { OptimizedWikiSource } from './performance/OptimizedWikiSource';

const config = {
  wikiSources: [
    { name: 'Enterprise Wiki', url: 'https://wiki.company.com' }
  ],
  performance: {
    cache: { maxSize: 500, ttl: 3600000 },
    batch: { batchSize: 20, concurrency: 10 },
    // ... other settings
  }
};

const wikiSource = new OptimizedWikiSource(config, config.performance);
```

### Batch Content Fetching
```typescript
// Fetch multiple pages efficiently
const urls = [
  'https://wiki.company.com/page1',
  'https://wiki.company.com/page2',
  'https://wiki.company.com/page3'
];

const results = await wikiSource.batchFetchContent(urls);
```

### Search with Performance Optimization
```typescript
// Search with caching and indexing
const searchResults = await wikiSource.searchContent('query', {
  limit: 20,
  fuzzy: true,
  useCache: true
});
```

## 📈 Performance Testing

### Running Benchmarks
```bash
# Install dependencies
npm install

# Run performance test suite
npm run test:performance

# Run load testing
npm run test:load

# Run with custom parameters
node -e "
import('./src/performance/tests/PerformanceTest.js').then(m => 
  m.runLoadTest(300000, 50) // 5 minutes, 50 concurrent users
)"
```

### Using the CLI Tools
```bash
# Performance benchmarking
npm run perf benchmark --duration 60 --concurrency 10

# Cache optimization
npm run perf optimize --strategy cache

# Real-time monitoring
npm run perf monitor --interval 5

# Performance statistics
npm run perf stats --format json
```

## 🐳 Docker Deployment

### Performance-Optimized Container
```bash
# Build performance container
docker build -f docker/Dockerfile.performance -t mcp-wiki-perf .

# Run with performance settings
docker run -d \
  --name mcp-wiki-performance \
  --memory=8g \
  --cpus=4 \
  -p 3000:3000 \
  -e CACHE_SIZE_MB=500 \
  -e MAX_CONNECTIONS=50 \
  -v ./data:/app/data \
  mcp-wiki-perf
```

### Full Performance Stack
```bash
# Start with monitoring
docker-compose -f docker-compose.performance.yml up -d

# Run load tests
docker-compose -f docker-compose.performance.yml --profile loadtest up

# View monitoring dashboards
open http://localhost:3001 # Grafana
open http://localhost:9090 # Prometheus
```

## 🔍 Monitoring and Observability

### Performance Metrics Dashboard
- **Request Metrics**: Throughput, latency, error rates
- **Cache Performance**: Hit ratio, memory usage, eviction rates  
- **Search Index**: Size, update frequency, query performance
- **Resource Usage**: CPU, memory, connection pool status

### Health Checks
```bash
# Application health
curl http://localhost:3000/health

# Performance metrics endpoint
curl http://localhost:3000/metrics

# Cache statistics
curl http://localhost:3000/cache/stats
```

## ⚡ Performance Recommendations

### For Large Datasets (>1M pages)
- Increase cache size to 1GB+ (`maxSize: 1000`)
- Enable persistent caching for faster restarts
- Use higher batch sizes (`batchSize: 50`)
- Implement distributed caching with Redis
- Schedule regular index rebuilds during low-traffic periods

### For High Concurrency (>100 users)
- Increase connection pool size (`maxConnections: 100`)
- Use cluster mode with PM2
- Enable connection keep-alive
- Implement request queuing and rate limiting
- Use CDN for static content

### Memory Optimization
```bash
# Increase Node.js heap size
NODE_OPTIONS="--max-old-space-size=16384"

# Enable garbage collection optimization
NODE_OPTIONS="--gc-global --expose-gc"

# Optimize thread pool
UV_THREADPOOL_SIZE=256
```

## 🔧 Troubleshooting

### High Memory Usage
1. Check cache size limits in configuration
2. Monitor for memory leaks with `--expose-gc`
3. Adjust `maxItems` and `ttl` settings
4. Enable cache persistence to reduce memory pressure

### Slow Search Performance  
1. Verify index is being built (`rebuildInterval`)
2. Check index size and fragmentation
3. Optimize search query complexity
4. Consider distributed search with Elasticsearch

### Connection Pool Exhaustion
1. Increase `maxConnections` limit
2. Reduce `acquireTimeout` for faster failover
3. Monitor connection reuse efficiency
4. Implement request queuing

## 📚 API Reference

### OptimizedWikiSource
- `fetchContent(url)` - Cached content retrieval
- `batchFetchContent(urls)` - Batch processing
- `searchContent(query, options)` - Indexed search
- `rebuildIndex()` - Manual index rebuild
- `getPerformanceMetrics()` - Real-time metrics
- `optimizeCache()` - Cache maintenance

### Performance Configuration
- `CacheOptions` - Cache behavior settings
- `BatchOptions` - Batch processing configuration  
- `PoolOptions` - Connection pool settings
- `PerformanceConfig` - Complete performance configuration

## 🤝 Contributing

When contributing performance improvements:
1. Include benchmarks for your changes
2. Test with large datasets (>100K pages)
3. Monitor memory usage and resource consumption
4. Update performance documentation
5. Add appropriate test coverage

## 📄 License

This performance optimization module is part of the MCP Internal Wiki project and follows the same license terms.

# 🚀 Performance Testing and Optimization

This guide covers the performance optimization features and testing capabilities of the MCP Internal Wiki Server.

## ⚡ Performance Features

### Multi-Level Caching System

The server implements an intelligent caching system optimized for wiki content:

- **Content Cache (60%)**: Large wiki pages and documentation
- **Metadata Cache (30%)**: Page titles, authors, and timestamps  
- **Query Cache (10%)**: Search results and frequently accessed queries
- **LRU Eviction**: Automatic cleanup based on least recently used algorithm
- **TTL Management**: Time-based expiration with configurable timeouts

### Full-Text Search Indexing

Real-time search capabilities with enterprise-grade performance:

- **Background Indexing**: Non-blocking index rebuilds
- **Fuzzy Search**: Typo-tolerant search with configurable similarity
- **Memory Optimization**: Efficient inverted index structure
- **Incremental Updates**: Add new content without full rebuilds

### Batch Processing Engine

Priority-based job queue for background operations:

- **Configurable Concurrency**: Adjust based on system resources
- **Priority Levels**: Critical vs. background task prioritization
- **Automatic Retries**: Exponential backoff for failed jobs
- **Job Deduplication**: Prevent redundant processing

### HTTP Connection Pool

Efficient network resource management:

- **Connection Reuse**: Reduce overhead for multiple requests
- **Health Monitoring**: Automatic failover for unhealthy connections
- **Resource Cleanup**: Proper connection lifecycle management
- **Configurable Limits**: Tune pool size for your deployment

## 🧪 Testing Commands

### Quick Cache Test (Works Immediately)

```bash
npm run test:cache
```

This runs JavaScript-based cache tests without requiring TypeScript compilation:

- ✅ Cache functionality validation
- ✅ TTL expiration testing
- ✅ LRU eviction verification
- ✅ Memory usage tracking
- ✅ Performance benchmarking

### Full Performance Suite

```bash
# Install dependencies if needed
npm install

# Build TypeScript
npm run build

# Run comprehensive performance tests
npm run test:performance
```

This tests all optimization components:

- CacheManager with 1000+ items
- IndexManager with full-text search
- BatchProcessor with concurrent jobs
- ConnectionPool utilization
- End-to-end performance integration

### Load Testing

```bash
npm run test:load
```

Simulates high-traffic scenarios:

- Multiple concurrent users
- Performance metrics collection
- Memory usage monitoring
- Cache efficiency validation

### Setup and Installation Test

```bash
npm run test:setup
```

Comprehensive setup that:

- Installs missing dependencies
- Builds TypeScript files
- Runs performance tests
- Falls back to JavaScript tests if needed

## 📊 Performance Metrics

### Expected Results

When running `npm run test:cache`, you should see:

```
🧪 Testing JavaScript Cache Implementation...
  ✓ Cache initialized
  ✓ Content retrieved: ✅ Success
  ✓ Cache metrics:
    - Total requests: 4
    - Hit rate: 66.67%
    - Memory usage: 0.0012MB

✅ All tests passed!
```

### Performance Targets

| Component | Metric | Target | Command |
|-----------|--------|--------|---------|
| Cache | Hit Rate | > 60% | `npm run test:cache` |
| Cache | Memory | < 100MB | `npm run test:cache` |
| Search | Response | < 100ms | `npm run test:performance` |
| Batch | Throughput | > 20 jobs/sec | `npm run test:performance` |
| Pool | Utilization | > 80% | `npm run test:load` |

## ⚙️ Configuration

### Performance Settings

Add performance configuration to your `mcp.config.json`:

```json
{
  "wikiUrls": ["https://your-wiki.com"],
  "performance": {
    "cache": {
      "maxSize": 100,           // Cache size in MB
      "ttl": 3600000,          // Time to live in ms
      "maxItems": 10000,       // Maximum cached items
      "enablePersistence": false
    },
    "indexing": {
      "enabled": true,
      "rebuildInterval": 300000, // 5 minutes
      "backgroundSync": true
    },
    "batch": {
      "batchSize": 10,
      "concurrency": 5,
      "maxRetries": 3,
      "priorityLevels": 3
    },
    "pool": {
      "maxConnections": 20,
      "acquireTimeout": 5000,
      "idleTimeout": 30000
    },
    "monitoring": {
      "enabled": true,
      "metricsInterval": 30000,
      "slowQueryThreshold": 1000
    }
  }
}
```

### Scaling Guidelines

| Scale | Pages | Users | Cache Size | Expected RPS |
|-------|-------|-------|------------|-------------|
| Small | < 10K | < 10 | 100MB | > 50 |
| Medium | < 100K | < 50 | 500MB | > 100 |
| Large | < 1M | < 200 | 2GB | > 200 |
| Enterprise | > 1M | > 500 | 8GB | > 500 |

## 🔧 Troubleshooting

### Common Issues

**Memory or timeout errors:**
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
npm run test:performance
```

**Cache eviction too aggressive:**
- Increase `maxSize` in cache configuration
- Increase `maxItems` limit
- Extend `ttl` for longer retention

**Connection pool exhaustion:**
- Increase `maxConnections` in pool configuration
- Extend `acquireTimeout` for slower networks
- Monitor `idleTimeout` for cleanup

### Debug Mode

```bash
# Run with detailed logging
DEBUG=* npm run test:cache

# Test specific components
DEBUG=cache:* npm run test:performance
DEBUG=index:* npm run test:performance
```

## 📈 Production Monitoring

### Health Endpoints

```bash
# Check cache statistics
curl http://localhost:3000/cache/stats

# Performance metrics
curl http://localhost:3000/metrics

# System health
curl http://localhost:3000/health
```

### Performance CLI

```bash
# Benchmark current configuration
npm run perf benchmark

# Monitor real-time metrics
npm run perf monitor

# Analyze cache efficiency
npm run perf analyze
```

## 🚀 Next Steps

After validating performance:

1. **Tune Configuration**: Adjust cache sizes and concurrency based on test results
2. **Monitor Production**: Set up alerts for hit rates and response times
3. **Scale Resources**: Use scaling guidelines to plan infrastructure
4. **Regular Testing**: Run performance tests before deployments

For more detailed testing documentation, see [TESTING-PERFORMANCE.md](TESTING-PERFORMANCE.md).