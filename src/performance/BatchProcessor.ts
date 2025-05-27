import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';

export interface BatchJob<T, R> {
  id: string;
  data: T;
  priority: number;
  retries: number;
  maxRetries: number;
  createdAt: Date;
  processor: (data: T) => Promise<R>;
}

export interface BatchOptions {
  batchSize: number;
  concurrency: number;
  delayBetweenBatches: number;
  maxRetries: number;
  priorityLevels: number;
}

export class BatchProcessor<T, R> extends EventEmitter {
  private queues: Map<number, BatchJob<T, R>[]> = new Map();
  private processing: Set<string> = new Set();
  private results: Map<string, R> = new Map();
  private errors: Map<string, Error> = new Map();
  private options: BatchOptions;
  private logger: Logger;
  private isRunning: boolean = false;
  private processingTimer: NodeJS.Timeout | null = null;

  constructor(options: BatchOptions) {
    super();
    this.options = options;
    this.logger = new Logger('BatchProcessor');
    
    // Initialize priority queues
    for (let i = 0; i < options.priorityLevels; i++) {
      this.queues.set(i, []);
    }
  }

  addJob(
    id: string,
    data: T,
    processor: (data: T) => Promise<R>,
    priority: number = 0,
    maxRetries?: number
  ): void {
    if (this.processing.has(id) || this.results.has(id)) {
      this.logger.warn(`Job ${id} already exists`);
      return;
    }

    const job: BatchJob<T, R> = {
      id,
      data,
      priority: Math.max(0, Math.min(priority, this.options.priorityLevels - 1)),
      retries: 0,
      maxRetries: maxRetries ?? this.options.maxRetries,
      createdAt: new Date(),
      processor
    };

    const queue = this.queues.get(job.priority)!;
    queue.push(job);
    
    this.emit('jobAdded', { id, priority: job.priority });
    
    if (!this.isRunning) {
      this.start();
    }
  }

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.logger.info('Batch processor started');
    this.scheduleNextBatch();
  }

  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
      this.processingTimer = null;
    }
    
    this.logger.info('Batch processor stopped');
  }

  getResult(id: string): R | null {
    return this.results.get(id) || null;
  }

  getError(id: string): Error | null {
    return this.errors.get(id) || null;
  }

  getQueueStats(): {
    priority: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }[] {
    const stats = [];
    
    for (let priority = 0; priority < this.options.priorityLevels; priority++) {
      const queue = this.queues.get(priority)!;
      stats.push({
        priority,
        pending: queue.length,
        processing: Array.from(this.processing).filter(id => 
          queue.some(job => job.id === id)
        ).length,
        completed: this.results.size,
        failed: this.errors.size
      });
    }
    
    return stats;
  }

  clearCompleted(): void {
    this.results.clear();
    this.errors.clear();
  }

  private scheduleNextBatch(): void {
    if (!this.isRunning) return;
    
    this.processingTimer = setTimeout(() => {
      this.processBatch().finally(() => {
        if (this.isRunning && this.hasPendingJobs()) {
          this.scheduleNextBatch();
        } else if (this.isRunning && !this.hasActiveJobs()) {
          this.stop();
        }
      });
    }, this.options.delayBetweenBatches);
  }

  private async processBatch(): Promise<void> {
    const batch = this.getNextBatch();
    if (batch.length === 0) return;

    this.logger.debug(`Processing batch of ${batch.length} jobs`);
    
    const promises = batch.map(job => this.processJob(job));
    await Promise.allSettled(promises);
  }

  private getNextBatch(): BatchJob<T, R>[] {
    const batch: BatchJob<T, R>[] = [];
    
    // Process higher priority queues first
    for (let priority = this.options.priorityLevels - 1; priority >= 0; priority--) {
      const queue = this.queues.get(priority)!;
      
      while (batch.length < this.options.batchSize && queue.length > 0) {
        const job = queue.shift()!;
        if (!this.processing.has(job.id)) {
          batch.push(job);
          this.processing.add(job.id);
        }
      }
      
      if (batch.length >= this.options.batchSize) break;
    }
    
    return batch;
  }

  private async processJob(job: BatchJob<T, R>): Promise<void> {
    try {
      this.emit('jobStarted', { id: job.id, attempt: job.retries + 1 });
      
      const result = await job.processor(job.data);
      
      this.results.set(job.id, result);
      this.processing.delete(job.id);
      
      this.emit('jobCompleted', { id: job.id, result });
      
    } catch (error) {
      job.retries++;
      
      if (job.retries <= job.maxRetries) {
        // Retry the job
        this.processing.delete(job.id);
        const queue = this.queues.get(job.priority)!;
        queue.push(job);
        
        this.emit('jobRetry', { 
          id: job.id, 
          attempt: job.retries, 
          maxRetries: job.maxRetries,
          error 
        });
      } else {
        // Job failed permanently
        this.errors.set(job.id, error as Error);
        this.processing.delete(job.id);
        
        this.emit('jobFailed', { id: job.id, error });
      }
    }
  }

  private hasPendingJobs(): boolean {
    return Array.from(this.queues.values()).some(queue => queue.length > 0);
  }

  private hasActiveJobs(): boolean {
    return this.processing.size > 0 || this.hasPendingJobs();
  }
}