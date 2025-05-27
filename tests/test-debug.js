#!/usr/bin/env node

const { spawn } = require('child_process');

console.log('Starting MCP server and testing generate_project tool...');

// Start the MCP server
const server = spawn('node', ['dist/mcpServer.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: __dirname
});

// Log all server output
server.stdout.on('data', (data) => {
  console.log('[Server STDOUT]:', data.toString());
});

server.stderr.on('data', (data) => {
  console.log('[Server STDERR]:', data.toString());
});

server.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
});

server.on('error', (error) => {
  console.error('Server error:', error);
});

// Send initialization request
setTimeout(() => {
  console.log('Sending initialization request...');
  const initRequest = {
    jsonrpc: '2.0',
    id: 'init',
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {}
      },
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  };
  
  server.stdin.write(JSON.stringify(initRequest) + '\n');
}, 1000);

// Keep process alive for a bit
setTimeout(() => {
  console.log('Test timeout reached, killing server...');
  server.kill();
  process.exit(0);
}, 10000);
