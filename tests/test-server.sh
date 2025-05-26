#!/bin/bash
# A script to test the MCP server

# Send an initialize request
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | node -e "
const fs = require('fs');
const { spawn } = require('child_process');
const server = spawn('node', ['dist/server.js']);

// Send the initialize request
server.stdin.write(process.argv[1] + '\n');

// Wait for and display the response
server.stdout.on('data', (data) => {
  console.log('Server response:');
  console.log(data.toString());
  
  // Now send a getContext request
  server.stdin.write('{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"getContext\",\"params\":{\"query\":{\"text\":\"DevOps examples\"}}}\n');
});

// Keep the process alive for responses
setTimeout(() => {
  console.log('Test completed');
  server.kill();
  process.exit(0);
}, 3000);
"
