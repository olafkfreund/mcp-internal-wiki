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
  version = '1.0.0';

  handleRequest(req: MCPRequest, send: (resp: MCPResponse) => void) {
    try {
      console.log(`Handling MCP request: ${req.method}`);
      
      switch (req.method) {
        case 'initialize':
          this.handleInitialize(req, send);
          break;
          
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
          getContext: true,
          listSources: true
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
}
