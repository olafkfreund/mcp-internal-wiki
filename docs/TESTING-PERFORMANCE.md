# Performance Testing Documentation

## Quick Performance Validation

To immediately validate the performance optimizations work correctly:

```bash
npm run test:cache
```

This runs JavaScript-based tests that validate:
- Multi-level caching functionality
- TTL expiration handling
- LRU eviction when cache is full
- Memory usage tracking
- Hit/miss rate calculations
- Performance benchmarking

## Expected Output

```
🚀 Running Performance Cache Tests (JavaScript Version)
====================================================

🧪 Testing JavaScript Cache Implementation...
  ✓ Cache initialized
  ✓ Content retrieved: ✅ Success
  ✓ Metadata retrieved: ✅ Success
  ✓ Cache metrics:
    - Total requests: 4
    - Hit rate: 66.67%
    - Memory usage: 0.0012MB

✅ All tests passed! The cache system is working correctly.
```

## Full Performance Test Suite

After building the TypeScript:

```bash
npm run build
npm run test:performance
```

This validates all performance components:
- CacheManager with multi-level caching
- IndexManager with full-text search
- BatchProcessor with priority queues
- ConnectionPool with resource management
- OptimizedWikiSource integration

## Load Testing

```bash
npm run test:load
```

Simulates production load with concurrent users and performance metrics.

## Components Tested

- ✅ **CacheManager**: Multi-level caching with LRU eviction
- ✅ **IndexManager**: Full-text search indexing
- ✅ **BatchProcessor**: Priority-based job processing
- ✅ **ConnectionPool**: HTTP connection management
- ✅ **OptimizedWikiSource**: Integrated performance layer

For detailed configuration and tuning, see [PERFORMANCE.md](PERFORMANCE.md).