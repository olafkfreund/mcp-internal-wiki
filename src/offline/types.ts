/**
 * Offline Storage Interface for MCP Internal Wiki Server
 * 
 * Defines the contract for offline content storage and retrieval systems.
 * Supports multiple storage backends including file system, SQLite, and in-memory.
 */

/**
 * Content metadata for offline storage
 */
export interface OfflineContentMetadata {
  source: string;
  plugin: string;
  contentType: string;
  contentLength: number;
  language?: string;
  tags?: string[];
  wikiSource: string;
  path: string;
  [key: string]: any;
}

/**
 * Content section for hierarchical content
 */
export interface ContentSection {
  id: string;
  title: string;
  content: string;
  level: number;
  parent?: string;
}

/**
 * Represents a piece of content stored offline
 */
export interface OfflineContent {
  /** Unique identifier for the content */
  id: string;
  /** Source URL where the content originated */
  url: string;
  /** Title of the content */
  title: string;
  /** Main content body */
  content: string;
  /** Content type (markdown, html, etc.) */
  contentType?: string;
  /** When the content was last fetched */
  lastFetched: Date;
  /** When the content was last modified at source */
  lastModified?: Date;
  /** ETag or other cache validation headers */
  etag?: string;
  /** When content expires */
  expiresAt?: Date;
  /** Content metadata */
  metadata: OfflineContentMetadata;
  /** Content sections */
  sections?: ContentSection[];
}

/**
 * Search options for offline content
 */
export interface SearchOptions {
  /** Query string */
  query?: string;
  /** Maximum number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Filter by wiki source */
  wikiSource?: string;
  /** Filter by content type */
  contentType?: string;
  /** Filter by tags */
  tags?: string[];
  /** Include content in results */
  includeContent?: boolean;
  /** Fuzzy search tolerance (0-1) */
  fuzzyTolerance?: number;
  /** Sort by field */
  sortBy?: 'relevance' | 'date' | 'title';
  /** Include sections in results */
  includeSections?: boolean;
  /** Filter by content types */
  contentTypes?: string[];
  /** Filter by sources */
  sources?: string[];
  /** Date range filter */
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

/**
 * Search result from offline storage
 */
export interface OfflineSearchResult {
  /** Source URL */
  url: string;
  /** Content title */
  title: string;
  /** Content excerpt */
  excerpt: string;
  /** Relevance score (0-1) */
  relevance: number;
  /** When content was last fetched */
  lastFetched: Date;
  /** Content metadata */
  metadata: OfflineContentMetadata;
  /** Matched content sections */
  matchedSections?: Array<{
    sectionId: string;
    sectionTitle: string;
    excerpt: string;
  }>;
  /** Full content item (optional) */
  content?: OfflineContent;
  /** Match score */
  score?: number;
  /** Highlighted text snippets */
  highlights?: string[];
}

/**
 * Storage statistics
 */
export interface StorageStats {
  /** Total number of content items */
  totalContent: number;
  /** Total storage size in bytes */
  totalSize: number;
  /** Oldest content date */
  oldestContent: Date | null;
  /** Newest content date */
  newestContent: Date | null;
  /** Content count by source */
  contentBySource: Record<string, number>;
  /** Content count by type */
  contentByType: Record<string, number>;
  /** Average content size */
  averageContentSize: number;
  /** Additional legacy stats for compatibility */
  totalItems?: number;
  sources?: number;
  lastUpdate?: Date;
  health?: 'healthy' | 'degraded' | 'error';
}

/**
 * Sync status for a wiki source
 */
export interface SyncStatus {
  /** Wiki source identifier */
  wikiSource?: string;
  /** Last successful sync */
  lastSync: Date;
  /** Sync in progress */
  inProgress?: boolean;
  /** Is sync currently running */
  isRunning?: boolean;
  /** Number of items synced */
  itemsSynced?: number;
  /** Total items available */
  totalItems?: number;
  /** Sync progress */
  progress?: {
    completed: number;
    total: number;
    currentUrl?: string;
  };
  /** Next scheduled sync */
  nextScheduledSync?: Date | null;
  /** Sync errors */
  errors?: string[];
}

/**
 * Offline storage interface
 */
export interface OfflineStorage {
  /**
   * Initialize the storage backend
   */
  initialize(): Promise<void>;

  /**
   * Store content offline
   */
  store?(content: OfflineContent): Promise<void>;

  /**
   * Store multiple content items in batch
   */
  storeBatch?(contents: OfflineContent[]): Promise<void>;

  /**
   * Store content offline (legacy method name)
   */
  storeContent?(content: OfflineContent): Promise<void>;

  /**
   * Retrieve content by ID
   */
  get?(id: string): Promise<OfflineContent | null>;

  /**
   * Get content by URL (legacy method name)
   */
  getContent?(url: string): Promise<OfflineContent | null>;

  /**
   * Search stored content
   */
  search?(options: SearchOptions): Promise<OfflineSearchResult[]>;

  /**
   * Search content by query (legacy method name)
   */
  searchContent?(query: string, options?: SearchOptions): Promise<OfflineSearchResult[]>;

  /**
   * List all content with optional filtering
   */
  list?(wikiSource?: string, limit?: number, offset?: number): Promise<OfflineContent[]>;

  /**
   * Get stored URLs (legacy method name)
   */
  getStoredUrls?(): Promise<string[]>;

  /**
   * Update existing content
   */
  update?(id: string, updates: Partial<OfflineContent>): Promise<void>;

  /**
   * Delete content by ID
   */
  delete?(id: string): Promise<void>;

  /**
   * Delete all content from a wiki source
   */
  deleteBySource?(wikiSource: string): Promise<void>;

  /**
   * Check if content exists
   */
  exists?(id: string): Promise<boolean>;

  /**
   * Get storage statistics
   */
  getStats?(): Promise<StorageStats>;

  /**
   * Get statistics (legacy method name)
   */
  getStatistics?(): Promise<StorageStats>;

  /**
   * Clean up expired or stale content
   */
  cleanup?(maxAge?: number): Promise<number>;

  /**
   * Close the storage connection
   */
  close(): Promise<void>;
}

/**
 * Search index interface
 */
export interface OfflineIndex {
  /** Initialize the search index */
  initialize(): Promise<void>;
  
  /** Index content for search */
  indexContent(content: OfflineContent): Promise<void>;
  
  /** Remove content from index */
  removeFromIndex(url: string): Promise<void>;
  
  /** Search indexed content */
  search(query: string, options?: SearchOptions): Promise<OfflineSearchResult[]>;
  
  /** Rebuild the entire index */
  rebuildIndex(contents: OfflineContent[]): Promise<void>;
  
  /** Get index statistics */
  getIndexStats(): Promise<IndexStats>;
  
  /** Close index connections */
  close(): Promise<void>;
}

/**
 * Index statistics
 */
export interface IndexStats {
  totalDocuments: number;
  totalTerms: number;
  indexSize: number; // bytes
  lastRebuild: Date | null;
}

/**
 * Sync options for content synchronization
 */
export interface SyncOptions {
  forceRefresh?: boolean;
  maxConcurrency?: number;
  timeout?: number;
  includeLinked?: boolean;
  maxDepth?: number;
  skipErrors?: boolean;
}

/**
 * Sync result
 */
export interface SyncResult {
  totalUrls: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  totalSize: number;
  duration: number;
  errors: SyncError[];
}

/**
 * Sync error
 */
export interface SyncError {
  url: string;
  error: string;
  retry: boolean;
}

/**
 * Cleanup options
 */
export interface CleanupOptions {
  maxAge?: number; // milliseconds
  maxSize?: number; // bytes
  keepCount?: number; // minimum number to keep
  dryRun?: boolean;
}

/**
 * Cleanup result
 */
export interface CleanupResult {
  removedCount: number;
  freedSize: number;
  remainingCount: number;
  errors: string[];
}

/**
 * Offline manager configuration
 */
export interface OfflineConfig {
  /** Storage backend type */
  storageType: 'filesystem' | 'sqlite' | 'memory';
  /** Storage directory (for filesystem/sqlite) */
  storageDir?: string;
  /** Maximum storage size in bytes */
  maxStorageSize?: number;
  /** Content expiration time in ms */
  contentExpirationMs?: number;
  /** Enable automatic sync */
  autoSync?: boolean;
  /** Sync interval in ms */
  syncIntervalMs?: number;
  /** Maximum concurrent downloads */
  maxConcurrentDownloads?: number;
  /** Request timeout in ms */
  requestTimeoutMs?: number;
  /** Retry failed downloads */
  retryFailedDownloads?: boolean;
  /** Maximum retry attempts */
  maxRetryAttempts?: number;
}

/**
 * Offline manager interface
 */
export interface OfflineManager {
  /** Initialize offline manager */
  initialize(): Promise<void>;
  
  /** Enable offline mode */
  enableOfflineMode(): Promise<void>;
  
  /** Disable offline mode */
  disableOfflineMode(): Promise<void>;
  
  /** Check if offline mode is enabled */
  isOfflineModeEnabled(): boolean;
  
  /** Sync content for offline access */
  syncContent(urls: string[], options?: SyncOptions): Promise<SyncResult>;
  
  /** Get content (online or offline) */
  getContent(url: string): Promise<OfflineContent | null>;
  
  /** Search content (online or offline) */
  searchContent(query: string, options?: SearchOptions): Promise<OfflineSearchResult[]>;
  
  /** Get sync status */
  getSyncStatus(): Promise<SyncStatus>;
  
  /** Cleanup old content */
  cleanup(options?: CleanupOptions): Promise<CleanupResult>;
}
