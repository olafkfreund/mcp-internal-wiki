module.exports = {
  apps: [{
    name: 'mcp-wiki-performance',
    script: './src/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    
    // Performance optimizations
    node_args: [
      '--max-old-space-size=8192',
      '--optimize-for-size',
      '--gc-global',
      '--expose-gc'
    ],
    
    // Environment variables
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      PERFORMANCE_MONITORING: 'true',
      CACHE_ENABLED: 'true',
      INDEXING_ENABLED: 'true',
      UV_THREADPOOL_SIZE: 128
    },
    
    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Performance monitoring
    monitoring: true,
    pmx: true,
    
    // Memory management
    max_memory_restart: '2G',
    
    // Restart policies
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Health checks
    health_check_grace_period: 10000,
    health_check_fatal_exceptions: true,
    
    // Performance features
    source_map_support: false,
    disable_trace: true,
    
    // Cluster settings
    listen_timeout: 10000,
    kill_timeout: 5000,
    
    // Advanced features
    merge_logs: true,
    autorestart: true,
    watch: false,
    
    // Performance metrics
    instance_var: 'INSTANCE_ID',
    
    // Resource limits
    cron_restart: '0 2 * * *', // Daily restart at 2 AM for memory cleanup
    
    // Custom environment for performance
    env_production: {
      NODE_ENV: 'production',
      CACHE_SIZE_MB: 500,
      BATCH_SIZE: 20,
      MAX_CONNECTIONS: 50,
      INDEX_REBUILD_INTERVAL: 86400000, // 24 hours
      MONITORING_INTERVAL: 60000, // 1 minute
      SLOW_QUERY_THRESHOLD: 5000 // 5 seconds
    }
  }]
};