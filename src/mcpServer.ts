import { WikiSource } from './sources/wikiSource';

export class MCPServer {
  sources = [new WikiSource()];

  handleRequest(req: any, send: (resp: any) => void) {
    if (req.method === 'initialize') {
      send({
        jsonrpc: '2.0',
        id: req.id,
        result: {
          capabilities: {
            getContext: true,
            listSources: true
          },
          serverInfo: { name: 'Custom Wiki MCP', version: '1.0.0' }
        }
      });
    } else if (req.method === 'getContext') {
      const results = this.sources.flatMap(src => src.getContext(req.params));
      send({ jsonrpc: '2.0', id: req.id, result: results });
    } else if (req.method === 'listSources') {
      send({ jsonrpc: '2.0', id: req.id, result: this.sources.map(s => s.name) });
    } else {
      send({ jsonrpc: '2.0', id: req.id, error: { code: -32601, message: 'Method not found' } });
    }
  }
}
