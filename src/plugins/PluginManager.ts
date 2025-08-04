import { WikiSourcePlugin, PluginManager, WikiFetchOptions, WikiContent, WikiSearchOptions, WikiSearchResult, WikiMetadata } from './types.js';
import { logger } from '../utils/logger.js';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Plugin Manager Implementation
 * 
 * Manages the loading, registration, and lifecycle of wiki source adapter plugins.
 * Provides a centralized system for plugin discovery and execution.
 */
export class WikiPluginManager implements PluginManager {
  private plugins: Map<string, WikiSourcePlugin> = new Map();
  private initialized: boolean = false;

  constructor() {
    logger.info('WikiPluginManager initialized');
  }

  /**
   * Initialize the plugin manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Load built-in plugins
      await this.loadBuiltinPlugins();
      
      // Load external plugins from configured directories
      const pluginDirs = this.getPluginDirectories();
      for (const dir of pluginDirs) {
        try {
          await this.loadPluginsFromDirectory(dir);
        } catch (error) {
          logger.warn(`Failed to load plugins from directory ${dir}:`, error);
        }
      }

      this.initialized = true;
      logger.info(`Plugin manager initialized with ${this.plugins.size} plugins`);
    } catch (error) {
      logger.error('Failed to initialize plugin manager:', error);
      throw error;
    }
  }

  /**
   * Register a plugin
   */
  async registerPlugin(plugin: WikiSourcePlugin): Promise<void> {
    try {
      // Validate plugin
      this.validatePlugin(plugin);

      // Check for conflicts
      if (this.plugins.has(plugin.id)) {
        throw new Error(`Plugin with ID '${plugin.id}' is already registered`);
      }

      // Initialize plugin
      await plugin.initialize({});

      // Register plugin
      this.plugins.set(plugin.id, plugin);
      
      logger.info(`Plugin registered: ${plugin.name} (${plugin.id}) v${plugin.version}`);
      logger.debug(`Plugin supports types: ${plugin.supportedTypes.join(', ')}`);
    } catch (error) {
      logger.error(`Failed to register plugin ${plugin.id}:`, error);
      throw error;
    }
  }

  /**
   * Unregister a plugin
   */
  async unregisterPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      logger.warn(`Plugin ${pluginId} not found for unregistration`);
      return;
    }

    try {
      // Cleanup plugin resources
      if (plugin.cleanup) {
        await plugin.cleanup();
      }

      // Remove from registry
      this.plugins.delete(pluginId);
      
      logger.info(`Plugin unregistered: ${plugin.name} (${pluginId})`);
    } catch (error) {
      logger.error(`Failed to unregister plugin ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * Get all registered plugins
   */
  getPlugins(): WikiSourcePlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugin by ID
   */
  getPlugin(pluginId: string): WikiSourcePlugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Find plugins that can handle a URL
   */
  findPluginsForUrl(url: string): WikiSourcePlugin[] {
    return this.getPlugins().filter(plugin => {
      try {
        return plugin.canHandle(url);
      } catch (error) {
        logger.warn(`Plugin ${plugin.id} failed canHandle check for ${url}:`, error);
        return false;
      }
    });
  }

  /**
   * Load plugins from directory
   */
  async loadPluginsFromDirectory(pluginDir: string): Promise<void> {
    try {
      // Check if directory exists
      const stat = await fs.stat(pluginDir);
      if (!stat.isDirectory()) {
        logger.warn(`Plugin path is not a directory: ${pluginDir}`);
        return;
      }

      // Read directory contents
      const entries = await fs.readdir(pluginDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const pluginPath = path.join(pluginDir, entry.name);
          await this.loadPluginFromDirectory(pluginPath);
        }
      }
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        logger.debug(`Plugin directory does not exist: ${pluginDir}`);
        return;
      }
      throw error;
    }
  }

  /**
   * Fetch content using appropriate plugin
   */
  async fetchContent(url: string, options?: WikiFetchOptions): Promise<WikiContent | null> {
    const plugins = this.findPluginsForUrl(url);
    
    if (plugins.length === 0) {
      logger.warn(`No plugins found to handle URL: ${url}`);
      return null;
    }

    // Try plugins in order of registration
    for (const plugin of plugins) {
      try {
        logger.debug(`Attempting to fetch content with plugin: ${plugin.id}`);
        const content = await plugin.fetchContent(url, options);
        logger.debug(`Successfully fetched content with plugin: ${plugin.id}`);
        return content;
      } catch (error) {
        logger.warn(`Plugin ${plugin.id} failed to fetch content from ${url}:`, error);
        continue;
      }
    }

    logger.error(`All plugins failed to fetch content from: ${url}`);
    return null;
  }

  /**
   * Search content using appropriate plugins
   */
  async searchContent(query: string, options?: WikiSearchOptions): Promise<WikiSearchResult[]> {
    const results: WikiSearchResult[] = [];
    
    for (const plugin of this.getPlugins()) {
      if (!plugin.searchContent) {
        continue;
      }

      try {
        const pluginResults = await plugin.searchContent(query, options);
        results.push(...pluginResults);
      } catch (error) {
        logger.warn(`Plugin ${plugin.id} failed to search content:`, error);
      }
    }

    // Sort by relevance
    return results.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Get plugin statistics
   */
  getStats(): PluginStats {
    const plugins = this.getPlugins();
    const supportedTypes = new Set<string>();
    
    plugins.forEach(plugin => {
      plugin.supportedTypes.forEach(type => supportedTypes.add(type));
    });

    return {
      totalPlugins: plugins.length,
      supportedTypes: Array.from(supportedTypes),
      pluginDetails: plugins.map(plugin => ({
        id: plugin.id,
        name: plugin.name,
        version: plugin.version,
        supportedTypes: plugin.supportedTypes
      }))
    };
  }

  /**
   * Cleanup all plugins
   */
  async cleanup(): Promise<void> {
    const cleanupPromises = this.getPlugins()
      .filter(plugin => plugin.cleanup)
      .map(plugin => plugin.cleanup!());

    await Promise.allSettled(cleanupPromises);
    this.plugins.clear();
    this.initialized = false;
    logger.info('Plugin manager cleaned up');
  }

  // Private methods

  private validatePlugin(plugin: WikiSourcePlugin): void {
    if (!plugin.id || typeof plugin.id !== 'string') {
      throw new Error('Plugin must have a valid string ID');
    }
    
    if (!plugin.name || typeof plugin.name !== 'string') {
      throw new Error('Plugin must have a valid string name');
    }
    
    if (!plugin.version || typeof plugin.version !== 'string') {
      throw new Error('Plugin must have a valid string version');
    }
    
    if (!Array.isArray(plugin.supportedTypes) || plugin.supportedTypes.length === 0) {
      throw new Error('Plugin must support at least one wiki type');
    }
    
    if (typeof plugin.canHandle !== 'function') {
      throw new Error('Plugin must implement canHandle method');
    }
    
    if (typeof plugin.fetchContent !== 'function') {
      throw new Error('Plugin must implement fetchContent method');
    }
    
    if (typeof plugin.initialize !== 'function') {
      throw new Error('Plugin must implement initialize method');
    }
  }

  private async loadBuiltinPlugins(): Promise<void> {
    // Load built-in plugins - these would be the existing wiki source adapters
    try {
      const { GitBookPlugin } = await import('./builtin/GitBookPlugin.js');
      await this.registerPlugin(new GitBookPlugin());
      
      const { GenericWikiPlugin } = await import('./builtin/GenericWikiPlugin.js');
      await this.registerPlugin(new GenericWikiPlugin());
      
      logger.info('Built-in plugins loaded successfully');
    } catch (error) {
      logger.warn('Some built-in plugins failed to load:', error);
    }
  }

  private async loadPluginFromDirectory(pluginPath: string): Promise<void> {
    try {
      // Look for package.json to identify plugin
      const packageJsonPath = path.join(pluginPath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      // Check if it's a valid MCP wiki plugin
      if (!packageJson.mcpWikiPlugin) {
        logger.debug(`Skipping directory ${pluginPath} - not an MCP wiki plugin`);
        return;
      }

      // Load the plugin entry point
      const entryPoint = packageJson.main || 'index.js';
      const pluginModulePath = path.join(pluginPath, entryPoint);
      
      const pluginModule = await import(pluginModulePath);
      const PluginClass = pluginModule.default || pluginModule[packageJson.mcpWikiPlugin.className];
      
      if (!PluginClass) {
        throw new Error(`Plugin class not found in ${pluginModulePath}`);
      }

      const plugin = new PluginClass();
      await this.registerPlugin(plugin);
      
      logger.info(`External plugin loaded: ${plugin.name} from ${pluginPath}`);
    } catch (error) {
      logger.error(`Failed to load plugin from ${pluginPath}:`, error);
    }
  }

  private getPluginDirectories(): string[] {
    const dirs: string[] = [];
    
    // Add standard plugin directories
    dirs.push(
      path.join(process.cwd(), 'plugins'),
      path.join(process.cwd(), 'node_modules/@mcp-wiki'),
      path.join(process.cwd(), 'src/plugins/external')
    );

    // Add directories from environment variable
    const envDirs = process.env.MCP_PLUGIN_DIRS;
    if (envDirs) {
      dirs.push(...envDirs.split(path.delimiter));
    }

    return dirs;
  }
}

export interface PluginStats {
  totalPlugins: number;
  supportedTypes: string[];
  pluginDetails: Array<{
    id: string;
    name: string;
    version: string;
    supportedTypes: string[];
  }>;
}
