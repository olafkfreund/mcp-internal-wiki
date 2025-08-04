import * as os from 'os';
import * as fs from 'fs';
import { performance } from 'perf_hooks';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
}

export interface DetailedHealthStatus extends HealthStatus {
  system: {
    memory: {
      used: number;
      free: number;
      total: number;
      usage: number;
    };
    cpu: {
      loadAverage: number[];
      usage: number;
    };
    disk: {
      available: number;
      total: number;
      usage: number;
    };
  };
  performance: {
    responseTime: number;
    requestsPerSecond: number;
    errorRate: number;
  };
  dependencies: {
    wikiSources: {
      total: number;
      healthy: number;
      degraded: number;
      unhealthy: number;
    };
    offlineStorage: {
      status: 'available' | 'unavailable';
      size: number;
      itemCount: number;
    };
  };
  metrics: {
    cacheHitRate: number;
    averageResponseTime: number;
    totalRequests: number;
    totalErrors: number;
  };
}

export class HealthMonitor {
  private startTime: number;
  private requestCount = 0;
  private errorCount = 0;
  private responseTimes: number[] = [];
  private cacheHits = 0;
  private cacheMisses = 0;
  private monitoringInterval?: NodeJS.Timeout;

  constructor() {
    this.startTime = Date.now();
  }

  async initialize() {
    // Start background monitoring
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, 30000); // Collect metrics every 30 seconds

    console.error('[HEALTH] Health monitoring initialized');
  }

  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  /**
   * Record a request and its response time
   */
  recordRequest(responseTime: number, isError = false) {
    this.requestCount++;
    this.responseTimes.push(responseTime);
    
    // Keep only last 100 response times for memory efficiency
    if (this.responseTimes.length > 100) {
      this.responseTimes = this.responseTimes.slice(-100);
    }
    
    if (isError) {
      this.errorCount++;
    }
  }

  /**
   * Record cache hit/miss
   */
  recordCacheEvent(isHit: boolean) {
    if (isHit) {
      this.cacheHits++;
    } else {
      this.cacheMisses++;
    }
  }

  /**
   * Get basic health status
   */
  async getBasicHealth(): Promise<HealthStatus> {
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const memoryUsagePercent = (memoryUsage.heapUsed / totalMemory) * 100;
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    // Determine status based on system metrics
    if (memoryUsagePercent > 90) {
      status = 'unhealthy';
    } else if (memoryUsagePercent > 70) {
      status = 'degraded';
    }
    
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;
    if (errorRate > 50) {
      status = 'unhealthy';
    } else if (errorRate > 20) {
      status = 'degraded';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: '2.0.0'
    };
  }

  /**
   * Get detailed health status with system metrics
   */
  async getDetailedHealth(): Promise<DetailedHealthStatus> {
    const basicHealth = await this.getBasicHealth();
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    
    // CPU usage (approximate)
    const cpuUsage = await this.getCpuUsage();
    
    // Disk usage for current directory
    const diskStats = await this.getDiskUsage();
    
    // Calculate metrics
    const avgResponseTime = this.responseTimes.length > 0 
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length 
      : 0;
    
    const cacheHitRate = (this.cacheHits + this.cacheMisses) > 0 
      ? (this.cacheHits / (this.cacheHits + this.cacheMisses)) * 100 
      : 0;
    
    const requestsPerSecond = this.requestCount / ((Date.now() - this.startTime) / 1000);
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;

    return {
      ...basicHealth,
      system: {
        memory: {
          used: memoryUsage.heapUsed,
          free: freeMemory,
          total: totalMemory,
          usage: (memoryUsage.heapUsed / totalMemory) * 100
        },
        cpu: {
          loadAverage: os.loadavg(),
          usage: cpuUsage
        },
        disk: diskStats
      },
      performance: {
        responseTime: avgResponseTime,
        requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
        errorRate: Math.round(errorRate * 100) / 100
      },
      dependencies: {
        wikiSources: {
          total: 0, // Will be updated by wiki source
          healthy: 0,
          degraded: 0,
          unhealthy: 0
        },
        offlineStorage: {
          status: 'unavailable', // Will be updated by offline integration
          size: 0,
          itemCount: 0
        }
      },
      metrics: {
        cacheHitRate: Math.round(cacheHitRate * 100) / 100,
        averageResponseTime: Math.round(avgResponseTime * 100) / 100,
        totalRequests: this.requestCount,
        totalErrors: this.errorCount
      }
    };
  }

  /**
   * Update wiki sources health information
   */
  updateWikiSourcesHealth(healthy: number, degraded: number, unhealthy: number) {
    // This will be called by the wiki source to update health status
  }

  /**
   * Update offline storage health information
   */
  updateOfflineStorageHealth(status: 'available' | 'unavailable', size: number, itemCount: number) {
    // This will be called by offline integration to update health status
  }

  private async getCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = performance.now();
      
      setTimeout(() => {
        const currentUsage = process.cpuUsage(startUsage);
        const currentTime = performance.now();
        
        const elapsedTime = (currentTime - startTime) * 1000; // Convert to microseconds
        const totalUsage = currentUsage.user + currentUsage.system;
        const usage = (totalUsage / elapsedTime) * 100;
        
        resolve(Math.min(100, Math.max(0, usage))); // Clamp between 0-100
      }, 100);
    });
  }

  private async getDiskUsage(): Promise<{ available: number; total: number; usage: number }> {
    try {
      const stats = fs.statSync(process.cwd());
      // This is a simplified version - in practice, you'd want to use a library
      // that can get actual disk space information
      return {
        available: 1024 * 1024 * 1024, // 1GB placeholder
        total: 10 * 1024 * 1024 * 1024, // 10GB placeholder
        usage: 10 // 10% placeholder
      };
    } catch (error) {
      return {
        available: 0,
        total: 0,
        usage: 0
      };
    }
  }

  private collectMetrics() {
    // Background metric collection
    // This could include periodic health checks, cleanup old metrics, etc.
    
    // Reset old response times if they're getting too large
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-100);
    }
  }

  /**
   * Get health status as middleware for request tracking
   */
  createHealthMiddleware() {
    return (req: any, res: any, next: any) => {
      const startTime = performance.now();
      
      res.on('finish', () => {
        const responseTime = performance.now() - startTime;
        const isError = res.statusCode >= 400;
        this.recordRequest(responseTime, isError);
      });
      
      next();
    };
  }
}