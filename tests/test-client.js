#!/usr/bin/env node

const { spawn } = require('child_process');
const readline = require('readline');

const serverProcess = spawn('node', ['dist/server.js'], {
  stdio: ['pipe', 'pipe', process.stderr]
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('MCP Wiki Server Test Client');
console.log('Type "exit" to quit\n');

// Initialize request
const initRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {}
};

serverProcess.stdin.write(JSON.stringify(initRequest) + '\n');

// Process server responses
serverProcess.stdout.on('data', (data) => {
  const responses = data.toString().trim().split('\n');
  for (const response of responses) {
    try {
      const parsedResponse = JSON.parse(response);
      console.log('\nServer response:', JSON.stringify(parsedResponse, null, 2));
    } catch (error) {
      console.error('Error parsing response:', error);
    }
  }
  promptUser();
});

// Handle user input
function promptUser() {
  rl.question('\nEnter a query (or "exit" to quit, "list" for sources): ', (input) => {
    if (input.toLowerCase() === 'exit') {
      serverProcess.kill();
      rl.close();
      return;
    }

    if (input.toLowerCase() === 'list') {
      const listRequest = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'listSources',
        params: {}
      };
      serverProcess.stdin.write(JSON.stringify(listRequest) + '\n');
    } else {
      const contextRequest = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'getContext',
        params: {
          query: {
            text: input
          }
        }
      };
      serverProcess.stdin.write(JSON.stringify(contextRequest) + '\n');
    }
  });
}

serverProcess.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
  rl.close();
});

// Initialize the prompt
setTimeout(promptUser, 500);
