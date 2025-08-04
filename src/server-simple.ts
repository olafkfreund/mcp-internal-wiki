import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ConfigManager } from './config/validation.js';
import { HealthMonitor } from './monitoring/health.js';

// Simplified version of WikiSource for basic functionality
class SimpleWikiSource {
  private config: any;
  
  constructor(config: any) {
    this.config = config;
  }

  async getContext(params: any) {
    const query = params?.query?.text || '';
    
    // Return mock data for now
    return [{
      title: `Search Results for "${query}"`,
      content: `Found relevant information about ${query} from configured wiki sources.`,
      url: this.config.wikiUrls?.[0] || 'https://example.com',
      source: 'wiki',
      relevanceScore: 0.8
    }];
  }

  getWikiSourceDetails() {
    return this.config.wikiUrls?.map((url: string, index: number) => ({
      name: `Wiki Source ${index + 1}`,
      url,
      type: 'unknown',
      hasAuth: false,
      cached: false
    })) || [];
  }

  getWikiSourceStats() {
    return {
      totalSources: this.config.wikiUrls?.length || 0,
      sourcesByType: { unknown: this.config.wikiUrls?.length || 0 },
      authenticatedSources: 0,
      cachedSources: 0,
      cacheTimeoutMinutes: this.config.cacheTimeoutMinutes || 30
    };
  }
}

export class SimpleMCPWikiServer {
  private server: Server;
  private wikiSource!: SimpleWikiSource;
  private configManager: ConfigManager;
  private healthMonitor: HealthMonitor;

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-internal-wiki-simple',
        version: '2.0.0-simple'
      },
      {
        capabilities: {
          tools: {},
          resources: {}
        }
      }
    );

    this.configManager = ConfigManager.getInstance();
    this.healthMonitor = new HealthMonitor();
    
    this.setupHandlers();
  }

  private setupHandlers() {
    // Tools handlers
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search_wiki',
          description: 'Search for information across configured wiki sources',
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
        }
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

    const results = await this.wikiSource.getContext({ query: { text: query } });

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
              relevanceScore: result.relevanceScore
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

  async initialize() {
    try {
      // Load and validate configuration
      const config = await this.configManager.loadConfig();
      console.error('[SERVER] Configuration loaded and validated');

      // Initialize simple wiki source
      this.wikiSource = new SimpleWikiSource(config);

      // Initialize health monitoring
      await this.healthMonitor.initialize();
      console.error('[SERVER] Health monitoring initialized');

      console.error('[SERVER] Simple MCP Wiki Server initialized successfully');
    } catch (error) {
      console.error('[SERVER] Initialization failed:', error);
      throw error;
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('[SERVER] Simple MCP Wiki Server running on stdio transport');
  }

  async shutdown() {
    console.error('[SERVER] Shutting down...');
    
    if (this.healthMonitor) {
      this.healthMonitor.stop();
      console.error('[SERVER] Health monitor stopped');
    }
    
    console.error('[SERVER] Shutdown complete');
  }
}

// Handle graceful shutdown
const server = new SimpleMCPWikiServer();

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