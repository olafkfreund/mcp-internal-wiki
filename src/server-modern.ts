import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { WikiSource } from './sources/wikiSource.js';
import { ConfigManager } from './config/validation.js';
import { HealthMonitor } from './monitoring/health.js';
import { WikiOfflineIntegration, offlineTools, type OfflineToolName } from './offline/index.js';

export class ModernMCPWikiServer {
  private server: Server;
  private wikiSource: WikiSource;
  private configManager: ConfigManager;
  private healthMonitor: HealthMonitor;
  private offlineIntegration?: WikiOfflineIntegration;

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-internal-wiki',
        version: '2.0.0'
      },
      {
        capabilities: {
          tools: {},
          resources: {}
        }
      }
    );

    this.configManager = ConfigManager.getInstance();
    this.wikiSource = new WikiSource();
    this.healthMonitor = new HealthMonitor();
    
    this.setupHandlers();
  }

  private setupHandlers() {
    // Tools handlers
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search_wiki',
          description: 'Search for information across configured wiki sources including GitBook, NixOS Wiki, GitHub Docs, and NixOS Manual',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query to find relevant wiki content',
                minLength: 1,
                maxLength: 500
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results to return',
                minimum: 1,
                maximum: 20,
                default: 10
              }
            },
            required: ['query']
          }
        },
        {
          name: 'list_wiki_sources',
          description: 'List all available wiki sources with their status',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'health_check',
          description: 'Check server and data source health status',
          inputSchema: {
            type: 'object',
            properties: {
              detailed: {
                type: 'boolean',
                description: 'Include detailed health information',
                default: false
              }
            }
          }
        },
        {
          name: 'transform_content',
          description: 'Transform wiki content or markdown into executable code in specified programming language',
          inputSchema: {
            type: 'object',
            properties: {
              content: {
                type: 'string',
                description: 'The markdown or wiki content to transform into code',
                minLength: 1
              },
              targetLanguage: {
                type: 'string',
                description: 'Target programming language (e.g., typescript, python, javascript, etc.)',
                enum: ['typescript', 'javascript', 'python', 'go', 'rust', 'java', 'csharp', 'php']
              },
              framework: {
                type: 'string',
                description: 'Optional framework to use (e.g., express, fastapi, react)'
              },
              projectType: {
                type: 'string',
                description: 'Optional project type (e.g., api, library, cli)'
              }
            },
            required: ['content', 'targetLanguage']
          }
        },
        // Add offline tools
        ...offlineTools.map((tool: any) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema
        }))
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_wiki':
            return await this.handleSearchWiki(args);
            
          case 'list_wiki_sources':
            return await this.handleListWikiSources();
            
          case 'health_check':
            return await this.handleHealthCheck(args);
            
          case 'transform_content':
            return await this.handleTransformContent(args);

          // Offline tools
          case 'sync_all_wikis':
          case 'sync_wiki_source':
          case 'search_offline':
          case 'get_offline_stats':
          case 'get_sync_status':
          case 'check_offline_availability':
          case 'cleanup_offline_content':
          case 'start_auto_sync':
          case 'stop_auto_sync':
          case 'list_offline_content':
            return await this.handleOfflineTool(name as OfflineToolName, args);
            
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error executing tool '${name}': ${error.message}`
            }
          ],
          isError: true
        };
      }
    });

    // Resources handlers
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'wiki://health',
          name: 'Server Health Status',
          description: 'Real-time server and data source health information',
          mimeType: 'application/json'
        },
        {
          uri: 'wiki://config',
          name: 'Server Configuration',
          description: 'Current server configuration (sanitized)',
          mimeType: 'application/json'
        },
        {
          uri: 'wiki://sources',
          name: 'Wiki Sources Status',
          description: 'Status and statistics for all configured wiki sources',
          mimeType: 'application/json'
        }
      ]
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      
      switch (uri) {
        case 'wiki://health':
          const healthStatus = await this.healthMonitor.getDetailedHealth();
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(healthStatus, null, 2)
              }
            ]
          };
          
        case 'wiki://config':
          const config = this.configManager.getConfig();
          // Sanitize sensitive information
          const sanitizedConfig = {
            ...config,
            auth: config.auth?.map(auth => ({
              ...auth,
              username: auth.username ? '***' : undefined,
              password: auth.password ? '***' : undefined,
              token: auth.token ? '***' : undefined,
              headerValue: auth.headerValue ? '***' : undefined
            }))
          };
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(sanitizedConfig, null, 2)
              }
            ]
          };
          
        case 'wiki://sources':
          const sourceDetails = this.wikiSource.getWikiSourceDetails();
          const sourceStats = this.wikiSource.getWikiSourceStats();
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({ stats: sourceStats, sources: sourceDetails }, null, 2)
              }
            ]
          };
          
        default:
          throw new Error(`Unknown resource: ${uri}`);
      }
    });
  }

  private async handleSearchWiki(args: any) {
    const { query, limit = 10 } = args;
    
    if (!query || typeof query !== 'string') {
      throw new Error('Query parameter is required and must be a string');
    }
    
    if (query.length > 500) {
      throw new Error('Query too long (maximum 500 characters)');
    }

    let results;
    if (this.offlineIntegration) {
      results = await this.offlineIntegration.getContentWithOfflineFallback(query);
    } else {
      results = await this.wikiSource.getContext({ query: { text: query } });
    }

    // Limit results
    const limitedResults = results.slice(0, Math.min(limit, 20));

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            query,
            resultsCount: limitedResults.length,
            totalResults: results.length,
            results: limitedResults.map(result => ({
              title: result.title,
              content: result.content.substring(0, 1000) + (result.content.length > 1000 ? '...' : ''),
              url: result.url,
              source: result.source,
              relevanceScore: result.relevanceScore,
              summary: result.summary
            }))
          }, null, 2)
        }
      ]
    };
  }

  private async handleListWikiSources() {
    const sourceDetails = this.wikiSource.getWikiSourceDetails();
    const sourceStats = this.wikiSource.getWikiSourceStats();
    
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            summary: sourceStats,
            sources: sourceDetails
          }, null, 2)
        }
      ]
    };
  }

  private async handleHealthCheck(args: any) {
    const { detailed = false } = args;
    
    const healthStatus = detailed 
      ? await this.healthMonitor.getDetailedHealth()
      : await this.healthMonitor.getBasicHealth();
    
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(healthStatus, null, 2)
        }
      ]
    };
  }

  private async handleTransformContent(args: any) {
    const { content, targetLanguage, framework, projectType } = args;
    
    // This would integrate with your existing transformation logic
    // For now, return a placeholder response
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            message: 'Content transformation feature will be integrated with existing transformation logic',
            input: { content: content.substring(0, 100) + '...', targetLanguage, framework, projectType },
            status: 'not_implemented_yet'
          }, null, 2)
        }
      ]
    };
  }

  private async initializeOfflineIntegration() {
    if (!this.offlineIntegration) {
      try {
        this.offlineIntegration = new WikiOfflineIntegration(this.wikiSource, {
          storageDir: './offline-storage',
          autoSync: false,
          maxStorageSize: 5 * 1024 * 1024 * 1024, // 5GB
          contentExpirationMs: 30 * 24 * 60 * 60 * 1000, // 30 days
          maxConcurrentDownloads: 3
        });
        await this.offlineIntegration.initialize();
        console.error('[DEBUG] Offline integration initialized');
      } catch (error) {
        console.error('[ERROR] Failed to initialize offline integration:', error);
        throw error;
      }
    }
  }

  private async handleOfflineTool(toolName: OfflineToolName, args: any) {
    // Initialize offline integration if not already done
    if (!this.offlineIntegration) {
      await this.initializeOfflineIntegration();
    }

    if (!this.offlineIntegration) {
      throw new Error('Offline functionality not available');
    }

    let result: any;

    switch (toolName) {
      case 'sync_all_wikis':
        result = await this.offlineIntegration.syncAllSources(args.forceFullSync || false);
        break;

      case 'sync_wiki_source':
        if (!args.url) {
          throw new Error('URL parameter is required for sync_wiki_source');
        }
        result = await this.offlineIntegration.syncWikiSource(args.url, args.forceFullSync || false);
        break;

      case 'search_offline':
        if (!args.query) {
          throw new Error('Query parameter is required for search_offline');
        }
        const searchResults = await this.offlineIntegration.searchOffline({
          query: args.query,
          limit: args.limit || 10,
          wikiSource: args.wikiSource,
          contentType: args.contentType,
          fuzzyTolerance: args.fuzzyTolerance || 0.3,
          includeContent: true
        });
        
        result = {
          results: searchResults.map(r => ({
            title: r.content.title,
            content: r.content.content,
            url: r.content.sourceUrl,
            score: r.score,
            highlights: r.highlights,
            source: r.content.metadata.wikiSource,
            contentType: r.content.contentType
          })),
          totalResults: searchResults.length
        };
        break;

      case 'get_offline_stats':
        result = await this.offlineIntegration.getOfflineStats();
        break;

      case 'get_sync_status':
        result = {
          syncStatuses: this.offlineIntegration.getAllSyncStatuses()
        };
        break;

      case 'check_offline_availability':
        if (!args.url) {
          throw new Error('URL parameter is required for check_offline_availability');
        }
        const isAvailable = await this.offlineIntegration.isAvailableOffline(args.url);
        result = { url: args.url, available: isAvailable };
        break;

      case 'cleanup_offline_content':
        const maxAgeMs = (args.maxAgeHours || 720) * 60 * 60 * 1000;
        const cleanedCount = await this.offlineIntegration.cleanup(maxAgeMs);
        result = { cleanedItems: cleanedCount };
        break;

      case 'start_auto_sync':
        await this.offlineIntegration.startAutoSync();
        result = { message: 'Auto-sync started successfully' };
        break;

      case 'stop_auto_sync':
        this.offlineIntegration.stopAutoSync();
        result = { message: 'Auto-sync stopped successfully' };
        break;

      case 'list_offline_content':
        const contentList = await this.offlineIntegration.listOfflineContent(
          args.wikiSource,
          args.limit || 50,
          args.offset || 0
        );
        
        result = {
          content: contentList.map(c => ({
            id: c.id,
            title: c.title,
            url: c.sourceUrl,
            contentType: c.contentType,
            lastFetched: c.lastFetched,
            size: c.metadata.size,
            source: c.metadata.wikiSource
          })),
          totalItems: contentList.length
        };
        break;

      default:
        throw new Error(`Unknown offline tool: ${toolName}`);
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  async initialize() {
    try {
      // Load and validate configuration
      await this.configManager.loadConfig();
      console.error('[SERVER] Configuration loaded and validated');

      // Initialize health monitoring
      await this.healthMonitor.initialize();
      console.error('[SERVER] Health monitoring initialized');

      // Initialize wiki source with validated config
      // Note: WikiSource constructor should be updated to use ConfigManager
      console.error('[SERVER] Wiki sources initialized');

      console.error('[SERVER] Modern MCP Wiki Server initialized successfully');
    } catch (error) {
      console.error('[SERVER] Initialization failed:', error);
      throw error;
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('[SERVER] MCP Wiki Server running on stdio transport');
  }

  async shutdown() {
    console.error('[SERVER] Shutting down...');
    
    if (this.offlineIntegration) {
      try {
        await this.offlineIntegration.shutdown();
        console.error('[SERVER] Offline integration shut down');
      } catch (error) {
        console.error('[ERROR] Error shutting down offline integration:', error);
      }
    }
    
    if (this.healthMonitor) {
      this.healthMonitor.stop();
      console.error('[SERVER] Health monitor stopped');
    }
    
    console.error('[SERVER] Shutdown complete');
  }
}

// Handle graceful shutdown
const server = new ModernMCPWikiServer();

const shutdown = async () => {
  console.error('[INFO] Received shutdown signal, cleaning up...');
  try {
    await server.shutdown();
    process.exit(0);
  } catch (error) {
    console.error('[ERROR] Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('exit', () => {
  console.error('[INFO] MCP server process exiting');
});

// Start server
async function main() {
  try {
    await server.initialize();
    await server.run();
  } catch (error) {
    console.error('[FATAL] Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}