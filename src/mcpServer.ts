import { WikiSource } from './sources/wikiSource';
import { CodeGenerationAgent } from './agents/CodeGenerationAgent';
import { ContentTransformer } from './transformation/ContentTransformer';
import { TemplateEngine } from './transformation/TemplateEngine';
import { AIService } from './ai/aiService';
import { WikiOfflineIntegration, offlineTools, type OfflineToolName } from './offline/index.js';

export interface MCPRequest {
  jsonrpc: string;
  id: string | number;
  method: string;
  params: any;
}

export interface MCPResponse {
  jsonrpc: string;
  id: string | number;
  result?: any;
  error?: { code: number; message: string };
}

export interface WikiResult {
  title: string;
  content: string;
  url?: string;
  source: string;
  type?: string;
}

export class MCPServer {
  sources = [new WikiSource()];
  version = '1.0.2'; // Updated version for offline support
  private codeGenerationAgent?: CodeGenerationAgent;
  private contentTransformer?: ContentTransformer;
  private offlineIntegration?: WikiOfflineIntegration;

  handleRequest(req: MCPRequest, send: (resp: MCPResponse) => void) {
    try {
      // Debug output to stderr to avoid interfering with stdout JSON-RPC
      console.error(`[DEBUG] Handling MCP request: ${req.method}`);
      
      switch (req.method) {
        case 'initialize':
          this.handleInitialize(req, send);
          break;
          
        case 'tools/list':
          this.handleToolsList(req, send);
          break;
          
        case 'tools/call':
          this.handleToolsCall(req, send);
          break;
          
        case 'resources/list':
          this.handleResourcesList(req, send);
          break;
          
        case 'resources/read':
          this.handleResourcesRead(req, send);
          break;
          
        // Legacy support for custom methods
        case 'getContext':
          this.handleGetContext(req, send);
          break;
          
        case 'listSources':
          this.handleListSources(req, send);
          break;

        // New transformation methods
        case 'wiki/transform':
          this.handleTransform(req, send);
          break;

        case 'wiki/generate':
          this.handleGenerate(req, send);
          break;

        case 'wiki/generateProject':
          this.handleGenerateProject(req, send);
          break;
          
        default:
          send({
            jsonrpc: '2.0',
            id: req.id,
            error: { code: -32601, message: `Method not found: ${req.method}` }
          });
      }
    } catch (error: any) {
      console.error('Error handling request:', error);
      send({
        jsonrpc: '2.0',
        id: req.id,
        error: { code: -32000, message: `Internal server error: ${error?.message || String(error)}` }
      });
    }
  }
  
  private handleInitialize(req: MCPRequest, send: (resp: MCPResponse) => void) {
    send({
      jsonrpc: '2.0',
      id: req.id,
      result: {
        capabilities: {
          tools: {},
          resources: {}
        },
        serverInfo: { 
          name: 'MCP Wiki Server',
          version: this.version
        }
      }
    });
  }
  
  private async handleGetContext(req: MCPRequest, send: (resp: MCPResponse) => void) {
    console.log(`Processing getContext request with params:`, JSON.stringify(req.params));
    
    const resultsPromises = this.sources.map(async (src) => {
      try {
        const sourceResults = await src.getContext(req.params) || [];
        console.log(`Source ${src.name} returned ${sourceResults.length} results`);
        return sourceResults;
      } catch (error) {
        console.error(`Error getting context from source ${src.name}:`, error);
        return [];
      }
    });
    
    const results = (await Promise.all(resultsPromises)).flat();
    
    // Format results properly for MCP protocol
    const formattedResults = results.map((result: any) => ({
      text: typeof result.content === 'string' ? result.content : JSON.stringify(result.content),
      title: result.title || 'Wiki Result',
      url: result.url || '',
      sourceId: result.source || 'wiki',
      metadata: {
        relevanceScore: result.relevanceScore !== undefined ? result.relevanceScore : null,
        summary: result.summary || null,
        type: result.type || 'unknown'
      },
      sourceType: result.type || 'unknown',
      timestamp: new Date().toISOString(),
      startPosition: { line: 0, character: 0 },
      endPosition: { 
        line: typeof result.content === 'string' ? 
          (result.content.split('\n').length - 1) : 0, 
        character: 0 
      }
    }));
    
    send({
      jsonrpc: '2.0',
      id: req.id,
      result: formattedResults
    });
  }
  
  private handleListSources(req: MCPRequest, send: (resp: MCPResponse) => void) {
    send({
      jsonrpc: '2.0',
      id: req.id,
      result: this.sources.map(s => s.name)
    });
  }

  // Standard MCP Protocol Methods
  private handleToolsList(req: MCPRequest, send: (resp: MCPResponse) => void) {
    send({
      jsonrpc: '2.0',
      id: req.id,
      result: {
        tools: [
          {
            name: 'search_wiki',
            description: 'Search for information across configured wiki sources including GitBook, NixOS Wiki, GitHub Docs, and NixOS Manual',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query to find relevant wiki content'
                }
              },
              required: ['query']
            }
          },
          {
            name: 'list_wiki_sources',
            description: 'List all available wiki sources',
            inputSchema: {
              type: 'object',
              properties: {}
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
                  description: 'The markdown or wiki content to transform into code'
                },
                targetLanguage: {
                  type: 'string',
                  description: 'Target programming language (e.g., typescript, python, javascript, etc.)'
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
          {
            name: 'generate_code',
            description: 'Generate code from wiki content using templates and AI',
            inputSchema: {
              type: 'object',
              properties: {
                content: {
                  type: 'string',
                  description: 'The wiki content or documentation to generate code from'
                },
                codeType: {
                  type: 'string',
                  description: 'Type of code to generate (e.g., dockerfile, typescript, python, yaml)'
                },
                templateName: {
                  type: 'string',
                  description: 'Optional template name to use for generation'
                }
              },
              required: ['content', 'codeType']
            }
          },
          {
            name: 'generate_project',
            description: 'Generate complete project structure from wiki documentation',
            inputSchema: {
              type: 'object',
              properties: {
                content: {
                  type: 'string',
                  description: 'The wiki content describing the project requirements'
                },
                projectType: {
                  type: 'string',
                  description: 'Type of project to generate (e.g., express-api, react-app, cli-tool)'
                },
                language: {
                  type: 'string',
                  description: 'Programming language for the project (e.g., typescript, python, javascript)'
                }
              },
              required: ['content', 'projectType', 'language']
            }
          },
          // Add offline tools
          ...offlineTools.map((tool: any) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema
          }))
        ]
      }
    });
  }

  private async handleToolsCall(req: MCPRequest, send: (resp: MCPResponse) => void) {
    const { name, arguments: args } = req.params;
    
    try {
      switch (name) {
        case 'search_wiki':
          await this.handleSearchWithOfflineFallback(args, req.id, send);
          break;
          
        case 'list_wiki_sources':
          const sourceDetails = this.sources[0].getWikiSourceDetails();
          const sourceStats = this.sources[0].getWikiSourceStats();
          
          const formattedOutput = {
            summary: sourceStats,
            sources: sourceDetails
          };
          
          send({
            jsonrpc: '2.0',
            id: req.id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(formattedOutput, null, 2)
                }
              ]
            }
          });
          break;

        case 'transform_content':
          await this.handleTransformTool(args, req.id, send);
          break;

        case 'generate_code':
          await this.handleGenerateCodeTool(args, req.id, send);
          break;

        case 'generate_project':
          await this.handleGenerateProjectTool(args, req.id, send);
          break;

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
          await this.handleOfflineTool(name as OfflineToolName, args, req.id, send);
          break;
          
        default:
          send({
            jsonrpc: '2.0',
            id: req.id,
            error: { code: -32601, message: `Unknown tool: ${name}` }
          });
      }
    } catch (error: any) {
      send({
        jsonrpc: '2.0',
        id: req.id,
        error: { code: -32000, message: `Tool execution error: ${error.message}` }
      });
    }
  }

  private handleResourcesList(req: MCPRequest, send: (resp: MCPResponse) => void) {
    send({
      jsonrpc: '2.0',
      id: req.id,
      result: {
        resources: [
          {
            uri: 'wiki://devops-examples',
            name: 'DevOps Examples from Real Life',
            description: 'GitBook containing DevOps examples and best practices',
            mimeType: 'text/markdown'
          },
          {
            uri: 'wiki://nixos-wiki',
            name: 'NixOS Wiki',
            description: 'Community-maintained NixOS documentation',
            mimeType: 'text/markdown'
          },
          {
            uri: 'wiki://github-docs',
            name: 'GitHub REST API Docs',
            description: 'Official GitHub REST API documentation',
            mimeType: 'text/markdown'
          },
          {
            uri: 'wiki://nixos-manual',
            name: 'NixOS Manual',
            description: 'Official NixOS manual and documentation',
            mimeType: 'text/markdown'
          }
        ]
      }
    });
  }

  private async handleResourcesRead(req: MCPRequest, send: (resp: MCPResponse) => void) {
    const { uri } = req.params;
    
    try {
      // Extract resource identifier from URI
      const resourceId = uri.replace('wiki://', '');
      let content = '';
      
      switch (resourceId) {
        case 'devops-examples':
          // Get content from GitBook source
          const gitbookResults = await this.sources[0].getContext({ query: { text: 'DevOps examples tutorials guides' } });
          content = gitbookResults.map(r => `# ${r.title}\n\n${r.content}`).join('\n\n---\n\n');
          break;
          
        case 'nixos-wiki':
          const nixosResults = await this.sources[0].getContext({ query: { text: 'NixOS configuration installation' } });
          content = nixosResults.map(r => `# ${r.title}\n\n${r.content}`).join('\n\n---\n\n');
          break;
          
        case 'github-docs':
          const githubResults = await this.sources[0].getContext({ query: { text: 'GitHub API REST repositories' } });
          content = githubResults.map(r => `# ${r.title}\n\n${r.content}`).join('\n\n---\n\n');
          break;
          
        case 'nixos-manual':
          const manualResults = await this.sources[0].getContext({ query: { text: 'NixOS manual configuration options' } });
          content = manualResults.map(r => `# ${r.title}\n\n${r.content}`).join('\n\n---\n\n');
          break;
          
        default:
          send({
            jsonrpc: '2.0',
            id: req.id,
            error: { code: -32602, message: `Unknown resource: ${uri}` }
          });
          return;
      }
      
      send({
        jsonrpc: '2.0',
        id: req.id,
        result: {
          contents: [
            {
              uri: uri,
              mimeType: 'text/markdown',
              text: content
            }
          ]
        }
      });
    } catch (error: any) {
      send({
        jsonrpc: '2.0',
        id: req.id,
        error: { code: -32000, message: `Resource read error: ${error.message}` }
      });
    }
  }

  private async initializeTransformationServices(): Promise<void> {
    try {
      // Initialize AI service from config
      const config = require('../mcp.config.json');
      if (config.ai && config.ai.enabled) {
        const aiService = new AIService(config.ai);
        const primaryProvider = aiService.getPrimaryProvider();
        
        if (primaryProvider) {
          this.codeGenerationAgent = new CodeGenerationAgent(primaryProvider);
          await this.codeGenerationAgent.initialize();
          
          // Use absolute path to templates directory
          const path = require('path');
          const templateDirectory = path.join(__dirname, '..', 'templates');
          const templateEngine = new TemplateEngine(templateDirectory);
          await templateEngine.initialize();
          this.contentTransformer = new ContentTransformer(primaryProvider, templateEngine);
          
          console.log('Transformation services initialized');
        }
      }
    } catch (error) {
      console.warn('Failed to initialize transformation services:', error);
    }
  }

  private async handleTransform(req: MCPRequest, send: (resp: MCPResponse) => void) {
    if (!this.contentTransformer) {
      await this.initializeTransformationServices();
    }

    if (!this.contentTransformer) {
      send({
        jsonrpc: '2.0',
        id: req.id,
        error: { code: -32000, message: 'Transformation services not available' }
      });
      return;
    }

    try {
      const { content, targetLanguage, framework, projectType } = req.params;
      
      const result = await this.contentTransformer.transformMarkdownToCode(
        content, 
        targetLanguage,
        { framework, projectType }
      );

      send({
        jsonrpc: '2.0',
        id: req.id,
        result: result
      });
    } catch (error: any) {
      send({
        jsonrpc: '2.0',
        id: req.id,
        error: { code: -32000, message: `Transformation failed: ${error.message}` }
      });
    }
  }

  private async handleGenerate(req: MCPRequest, send: (resp: MCPResponse) => void) {
    if (!this.codeGenerationAgent) {
      await this.initializeTransformationServices();
    }

    if (!this.codeGenerationAgent) {
      send({
        jsonrpc: '2.0',
        id: req.id,
        error: { code: -32000, message: 'Code generation services not available' }
      });
      return;
    }

    try {
      // Map request parameters to what generateFromWikiContent expects
      const { content, codeType, templateName } = req.params;
      const params = {
        wikiContent: content,
        targetLanguage: codeType || 'text',
        template: templateName
      };

      const result = await this.codeGenerationAgent.run(
        'generateFromWikiContent',
        params
      );

      send({
        jsonrpc: '2.0',
        id: req.id,
        result: {
          success: result && result.length > 0,
          generatedCode: result && result.length > 0 ? result[0] : null,
          files: result || []
        }
      });
    } catch (error: any) {
      send({
        jsonrpc: '2.0',
        id: req.id,
        result: {
          success: false,
          generatedCode: null,
          error: error.message
        }
      });
    }
  }

  private async handleGenerateProject(req: MCPRequest, send: (resp: MCPResponse) => void) {
    if (!this.codeGenerationAgent) {
      await this.initializeTransformationServices();
    }

    if (!this.codeGenerationAgent) {
      send({
        jsonrpc: '2.0',
        id: req.id,
        error: { code: -32000, message: 'Code generation services not available' }
      });
      return;
    }

    try {
      const result = await this.codeGenerationAgent.run(
        'generateProjectStructure',
        req.params
      );

      send({
        jsonrpc: '2.0',
        id: req.id,
        result: result
      });
    } catch (error: any) {
      send({
        jsonrpc: '2.0',
        id: req.id,
        error: { code: -32000, message: `Project generation failed: ${error.message}` }
      });
    }
  }

  // Tool handlers for MCP integration
  private async handleTransformTool(args: any, requestId: string | number, send: (resp: MCPResponse) => void) {
    if (!this.contentTransformer) {
      await this.initializeTransformationServices();
    }

    if (!this.contentTransformer) {
      send({
        jsonrpc: '2.0',
        id: requestId,
        error: { code: -32000, message: 'Transformation services not available' }
      });
      return;
    }

    try {
      const { content, targetLanguage, framework, projectType } = args;
      
      const result = await this.contentTransformer.transformMarkdownToCode(
        content, 
        targetLanguage,
        { framework, projectType }
      );

      send({
        jsonrpc: '2.0',
        id: requestId,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        }
      });
    } catch (error: any) {
      send({
        jsonrpc: '2.0',
        id: requestId,
        error: { code: -32000, message: `Transformation failed: ${error.message}` }
      });
    }
  }

  private async handleGenerateCodeTool(args: any, requestId: string | number, send: (resp: MCPResponse) => void) {
    if (!this.codeGenerationAgent) {
      await this.initializeTransformationServices();
    }

    if (!this.codeGenerationAgent) {
      send({
        jsonrpc: '2.0',
        id: requestId,
        error: { code: -32000, message: 'Code generation services not available' }
      });
      return;
    }

    try {
      // Map request parameters to what generateFromWikiContent expects
      const { content, codeType, templateName } = args;
      const params = {
        wikiContent: content,
        targetLanguage: codeType || 'text',
        template: templateName
      };

      const result = await this.codeGenerationAgent.run(
        'generateFromWikiContent',
        params
      );

      send({
        jsonrpc: '2.0',
        id: requestId,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: result && result.length > 0,
                generatedCode: result && result.length > 0 ? result[0] : null,
                files: result || []
              }, null, 2)
            }
          ]
        }
      });
    } catch (error: any) {
      send({
        jsonrpc: '2.0',
        id: requestId,
        error: { code: -32000, message: `Code generation failed: ${error.message}` }
      });
    }
  }

  private async handleGenerateProjectTool(args: any, requestId: string | number, send: (resp: MCPResponse) => void) {
    if (!this.codeGenerationAgent) {
      await this.initializeTransformationServices();
    }

    if (!this.codeGenerationAgent) {
      send({
        jsonrpc: '2.0',
        id: requestId,
        error: { code: -32000, message: 'Code generation services not available' }
      });
      return;
    }

    try {
      const result = await this.codeGenerationAgent.run(
        'generateProjectStructure',
        args
      );

      send({
        jsonrpc: '2.0',
        id: requestId,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        }
      });
    } catch (error: any) {
      send({
        jsonrpc: '2.0',
        id: requestId,
        error: { code: -32000, message: `Project generation failed: ${error.message}` }
      });
    }
  }

  // Offline functionality methods
  private async initializeOfflineIntegration() {
    if (!this.offlineIntegration) {
      try {
        this.offlineIntegration = new WikiOfflineIntegration(this.sources[0], {
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

  private async handleOfflineTool(toolName: OfflineToolName, args: any, requestId: string | number, send: (resp: MCPResponse) => void) {
    try {
      // Initialize offline integration if not already done
      if (!this.offlineIntegration) {
        await this.initializeOfflineIntegration();
      }

      if (!this.offlineIntegration) {
        send({
          jsonrpc: '2.0',
          id: requestId,
          error: { code: -32000, message: 'Offline functionality not available' }
        });
        return;
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
          const maxAgeMs = (args.maxAgeHours || 720) * 60 * 60 * 1000; // Convert hours to ms
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

      send({
        jsonrpc: '2.0',
        id: requestId,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        }
      });

    } catch (error: any) {
      console.error(`[ERROR] Offline tool ${toolName} failed:`, error);
      send({
        jsonrpc: '2.0',
        id: requestId,
        error: { code: -32000, message: `Offline tool error: ${error.message}` }
      });
    }
  }

  // Enhanced search with offline fallback
  private async handleSearchWithOfflineFallback(args: any, requestId: string | number, send: (resp: MCPResponse) => void) {
    try {
      // Try to initialize offline integration if not already done
      if (!this.offlineIntegration) {
        try {
          await this.initializeOfflineIntegration();
        } catch (error) {
          console.error('[WARN] Offline integration not available, using online-only search');
        }
      }

      let results;
      if (this.offlineIntegration) {
        // Use offline integration with fallback
        results = await this.offlineIntegration.getContentWithOfflineFallback(args.query || '');
      } else {
        // Fallback to online-only search
        results = await this.sources[0].getContext({ query: { text: args.query || '' } });
      }

      send({
        jsonrpc: '2.0',
        id: requestId,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }
          ]
        }
      });

    } catch (error: any) {
      console.error('[ERROR] Search with offline fallback failed:', error);
      send({
        jsonrpc: '2.0',
        id: requestId,
        error: { code: -32000, message: `Search error: ${error.message}` }
      });
    }
  }

  // Legacy direct method handlers

  /**
   * Gracefully shutdown the MCP server and cleanup resources
   */
  async shutdown(): Promise<void> {
    console.error('[DEBUG] Shutting down MCP server...');
    
    if (this.offlineIntegration) {
      try {
        await this.offlineIntegration.shutdown();
        console.error('[DEBUG] Offline integration shut down');
      } catch (error) {
        console.error('[ERROR] Error shutting down offline integration:', error);
      }
    }
    
    console.error('[DEBUG] MCP server shutdown complete');
  }
}
