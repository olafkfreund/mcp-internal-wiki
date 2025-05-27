import { WikiSource } from './sources/wikiSource';

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
}
