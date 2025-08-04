/**
 * Plugin Interface for MCP Internal Wiki Server
 * 
 * This interface defines the contract that all wiki source adapter plugins must implement.
 * Plugins allow extending the MCP server with support for additional wiki platforms
 * beyond the built-in adapters.
 */

export interface WikiSourcePlugin {
  /** Unique identifier for the plugin */
  id: string;
  
  /** Human-readable name of the plugin */
  name: string;
  
  /** Plugin version */
  version: string;
  
  /** Plugin description */
  description: string;
  
  /** Supported wiki platforms/types */
  supportedTypes: string[];
  
  /** Plugin configuration schema (optional) */
  configSchema?: PluginConfigSchema;
  
  /**
   * Initialize the plugin with configuration
   * @param config Plugin-specific configuration
   */
  initialize(config: any): Promise<void>;
  
  /**
   * Check if this plugin can handle the given URL
   * @param url Wiki URL to check
   * @returns true if this plugin can handle the URL
   */
  canHandle(url: string): boolean;
  
  /**
   * Fetch content from the wiki source
   * @param url Wiki URL
   * @param options Fetch options
   * @returns Fetched content
   */
  fetchContent(url: string, options?: WikiFetchOptions): Promise<WikiContent>;
  
  /**
   * Search content in the wiki source
   * @param query Search query
   * @param options Search options
   * @returns Search results
   */
  searchContent?(query: string, options?: WikiSearchOptions): Promise<WikiSearchResult[]>;
  
  /**
   * Get metadata about the wiki source
   * @param url Wiki URL
   * @returns Wiki metadata
   */
  getMetadata?(url: string): Promise<WikiMetadata>;
  
  /**
   * Cleanup resources when the plugin is unloaded
   */
  cleanup?(): Promise<void>;
}

export interface PluginConfigSchema {
  type: 'object';
  properties: Record<string, any>;
  required?: string[];
}

export interface WikiFetchOptions {
  timeout?: number;
  headers?: Record<string, string>;
  authentication?: WikiAuthentication;
  cache?: boolean;
  retries?: number;
}

export interface WikiSearchOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'date' | 'title';
  filters?: Record<string, any>;
}

export interface WikiContent {
  url: string;
  title: string;
  content: string;
  lastModified?: Date;
  metadata?: Record<string, any>;
  sections?: WikiSection[];
}

export interface WikiSection {
  title: string;
  content: string;
  level: number;
  id?: string;
}

export interface WikiSearchResult {
  url: string;
  title: string;
  excerpt: string;
  relevance: number;
  metadata?: Record<string, any>;
}

export interface WikiMetadata {
  title: string;
  description?: string;
  version?: string;
  lastUpdated?: Date;
  capabilities: string[];
}

export interface WikiAuthentication {
  type: 'basic' | 'bearer' | 'api-key' | 'oauth';
  credentials: Record<string, string>;
}

/**
 * Plugin Manager Interface
 */
export interface PluginManager {
  /**
   * Register a plugin
   * @param plugin Plugin instance
   */
  registerPlugin(plugin: WikiSourcePlugin): Promise<void>;
  
  /**
   * Unregister a plugin
   * @param pluginId Plugin ID
   */
  unregisterPlugin(pluginId: string): Promise<void>;
  
  /**
   * Get all registered plugins
   */
  getPlugins(): WikiSourcePlugin[];
  
  /**
   * Get plugin by ID
   * @param pluginId Plugin ID
   */
  getPlugin(pluginId: string): WikiSourcePlugin | undefined;
  
  /**
   * Find plugins that can handle a URL
   * @param url Wiki URL
   */
  findPluginsForUrl(url: string): WikiSourcePlugin[];
  
  /**
   * Load plugins from directory
   * @param pluginDir Directory containing plugins
   */
  loadPluginsFromDirectory(pluginDir: string): Promise<void>;
}
