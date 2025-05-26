// MCP stdio JSON-RPC server entry point
import { MCPServer } from './mcpServer';

const server = new MCPServer();

process.stdin.setEncoding('utf8');
let buffer = '';

process.stdin.on('data', (chunk) => {
  buffer += chunk;
  let boundary;
  while ((boundary = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, boundary);
    buffer = buffer.slice(boundary + 1);
    if (line.trim()) {
      try {
        const req = JSON.parse(line);
        server.handleRequest(req, (resp) => {
          process.stdout.write(JSON.stringify(resp) + '\n');
        });
      } catch (e) {
        // Optionally log parse errors
      }
    }
  }
});
