import { WikiSource } from './sources/wikiSource';
import { CodeGenerationAgent } from './agents/CodeGenerationAgent';
import { ContentTransformer } from './transformation/ContentTransformer';
import { TemplateEngine } from './transformation/TemplateEngine';
import { AIService } from './ai/aiService';

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
  version = '1.0.1'; // Updated version to force reload
  private codeGenerationAgent?: CodeGenerationAgent;
  private contentTransformer?: ContentTransformer;

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
          }
        ]
      }
    });
  }

  private async handleToolsCall(req: MCPRequest, send: (resp: MCPResponse) => void) {
    const { name, arguments: args } = req.params;
    
    try {
      switch (name) {
        case 'search_wiki':
          const results = await this.sources[0].getContext({ query: { text: args.query || '' } });
          send({
            jsonrpc: '2.0',
            id: req.id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(results, null, 2)
                }
              ]
            }
          });
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

  // Legacy direct method handlers
}
