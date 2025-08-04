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

// Handle graceful shutdown
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
