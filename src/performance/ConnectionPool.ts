import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';

export interface PoolOptions {
  maxConnections: number;
  acquireTimeout: number;
  idleTimeout: number;
  maxRetries: number;
  retryDelay: number;
}

export interface Connection {
  id: string;
  inUse: boolean;
  createdAt: Date;
  lastUsed: Date;
  client: any;
}

export class ConnectionPool extends EventEmitter {
  private connections: Map<string, Connection> = new Map();
  private waiting: Array<{
    resolve: (connection: Connection) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = [];
  private options: PoolOptions;
  private logger: Logger;
  private cleanupTimer: NodeJS.Timeout;

  constructor(
    private createConnection: () => Promise<any>,
    private destroyConnection: (client: any) => Promise<void>,
    options: Partial<PoolOptions> = {}
  ) {
    super();
    this.options = {
      maxConnections: 20,
      acquireTimeout: 30000,
      idleTimeout: 300000, // 5 minutes
      maxRetries: 3,
      retryDelay: 1000,
      ...options
    };
    this.logger = new Logger('ConnectionPool');
    
    // Start cleanup timer
    this.cleanupTimer = setInterval(() => {
      this.cleanupIdleConnections();
    }, 60000); // Check every minute
  }

  async acquire(): Promise<Connection> {
    // Try to find an available connection
    for (const connection of this.connections.values()) {
      if (!connection.inUse) {
        connection.inUse = true;
        connection.lastUsed = new Date();
        return connection;
      }
    }

    // Create new connection if under limit
    if (this.connections.size < this.options.maxConnections) {
      try {
        const client = await this.createConnection();
        const connection: Connection = {
          id: this.generateId(),
          inUse: true,
          createdAt: new Date(),
          lastUsed: new Date(),
          client
        };
        
        this.connections.set(connection.id, connection);
        this.emit('connectionCreated', connection.id);
        return connection;
      } catch (error) {
        this.logger.error('Failed to create connection:', error);
        throw error;
      }
    }

    // Wait for available connection
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.waiting.findIndex(w => w.resolve === resolve);
        if (index !== -1) {
          this.waiting.splice(index, 1);
        }
        reject(new Error('Connection acquire timeout'));
      }, this.options.acquireTimeout);

      this.waiting.push({ resolve, reject, timeout });
    });
  }

  release(connection: Connection): void {
    const existingConnection = this.connections.get(connection.id);
    if (!existingConnection) {
      this.logger.warn(`Attempted to release unknown connection: ${connection.id}`);
      return;
    }

    existingConnection.inUse = false;
    existingConnection.lastUsed = new Date();

    // Serve waiting requests
    if (this.waiting.length > 0) {
      const waiter = this.waiting.shift()!;
      clearTimeout(waiter.timeout);
      
      existingConnection.inUse = true;
      existingConnection.lastUsed = new Date();
      waiter.resolve(existingConnection);
    }

    this.emit('connectionReleased', connection.id);
  }

  async destroy(connection: Connection): Promise<void> {
    try {
      await this.destroyConnection(connection.client);
      this.connections.delete(connection.id);
      this.emit('connectionDestroyed', connection.id);
    } catch (error) {
      this.logger.error(`Failed to destroy connection ${connection.id}:`, error);
    }
  }

  async close(): Promise<void> {
    clearInterval(this.cleanupTimer);

    // Reject all waiting requests
    this.waiting.forEach(waiter => {
      clearTimeout(waiter.timeout);
      waiter.reject(new Error('Connection pool is closing'));
    });
    this.waiting = [];

    // Destroy all connections
    const destroyPromises = Array.from(this.connections.values()).map(conn => 
      this.destroy(conn)
    );
    
    await Promise.allSettled(destroyPromises);
    this.connections.clear();
  }

  getStats(): {
    total: number;
    inUse: number;
    available: number;
    waiting: number;
  } {
    const inUse = Array.from(this.connections.values()).filter(c => c.inUse).length;
    
    return {
      total: this.connections.size,
      inUse,
      available: this.connections.size - inUse,
      waiting: this.waiting.length
    };
  }

  private cleanupIdleConnections(): void {
    const now = new Date();
    const connectionsToDestroy: Connection[] = [];

    for (const connection of this.connections.values()) {
      if (!connection.inUse) {
        const idleTime = now.getTime() - connection.lastUsed.getTime();
        if (idleTime > this.options.idleTimeout) {
          connectionsToDestroy.push(connection);
        }
      }
    }

    connectionsToDestroy.forEach(connection => {
      this.destroy(connection);
      this.logger.debug(`Cleaned up idle connection: ${connection.id}`);
    });
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}