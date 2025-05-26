#!/usr/bin/env node

// Simple MCP Server Test
const { spawn } = require('child_process');
const server = spawn('node', ['dist/server.js']);

console.log('Testing MCP server...');

// Send initialize request
const initRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {}
};

console.log('Sending initialize request...');
server.stdin.write(JSON.stringify(initRequest) + '\n');

// Send getContext request after 1 second
setTimeout(() => {
  const contextRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'getContext',
    params: {
      query: {
        text: 'NixOS configuration'
      }
    }
  };
  
  console.log('Sending getContext request...');
  server.stdin.write(JSON.stringify(contextRequest) + '\n');
  
  // End test after 3 seconds
  setTimeout(() => {
    console.log('Test complete.');
    server.kill();
    process.exit(0);
  }, 3000);
}, 1000);

// Process server responses
server.stdout.on('data', (data) => {
  console.log('\nServer response:');
  console.log(data.toString());
});

// Process errors
server.stderr.on('data', (data) => {
  console.error('Server error:', data.toString());
});

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
});
