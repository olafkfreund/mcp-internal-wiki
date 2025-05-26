#!/usr/bin/env node

/**
 * Advanced MCP Server Test Client
 * This script tests the MCP server with various requests and provides detailed feedback.
 */

const { spawn } = require('child_process');
const readline = require('readline');

// Set up colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

console.log(`${colors.bright}${colors.blue}=== MCP Wiki Server Test Client ===${colors.reset}\n`);

// Start the server process
console.log(`${colors.cyan}Starting MCP server...${colors.reset}`);
const serverProcess = spawn('node', ['dist/server.js'], {
  stdio: ['pipe', 'pipe', process.stderr]
});

// Keep track of requests and responses
const requests = new Map();
let requestId = 1;

// Set up readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Process server responses
serverProcess.stdout.on('data', (data) => {
  const responses = data.toString().trim().split('\n');
  
  for (const response of responses) {
    try {
      const parsedResponse = JSON.parse(response);
      const requestInfo = requests.get(parsedResponse.id);
      
      if (requestInfo) {
        const elapsedTime = Date.now() - requestInfo.timestamp;
        console.log(`\n${colors.green}✓ Response received for "${requestInfo.method}" (${elapsedTime}ms):${colors.reset}`);
        console.log(JSON.stringify(parsedResponse.result || parsedResponse.error, null, 2));
        requests.delete(parsedResponse.id);
      } else {
        console.log(`\n${colors.yellow}? Unexpected response:${colors.reset}`, parsedResponse);
      }
    } catch (error) {
      console.error(`\n${colors.red}✗ Error parsing response:${colors.reset}`, error.message);
      console.log('Raw data:', data.toString());
    }
  }
});

// Helper function to send a request
function sendRequest(method, params = {}) {
  const id = requestId++;
  const request = {
    jsonrpc: '2.0',
    id,
    method,
    params
  };
  
  requests.set(id, {
    method,
    timestamp: Date.now()
  });
  
  console.log(`\n${colors.cyan}➤ Sending "${method}" request:${colors.reset}`);
  console.log(JSON.stringify(params, null, 2));
  
  serverProcess.stdin.write(JSON.stringify(request) + '\n');
  return id;
}

// Helper to display available commands
function showHelp() {
  console.log(`\n${colors.bright}Available Commands:${colors.reset}`);
  console.log(`  ${colors.yellow}init${colors.reset}          - Initialize the MCP server`);
  console.log(`  ${colors.yellow}sources${colors.reset}       - List available sources`);
  console.log(`  ${colors.yellow}query <text>${colors.reset}  - Send a context query`);
  console.log(`  ${colors.yellow}help${colors.reset}          - Show this help message`);
  console.log(`  ${colors.yellow}exit${colors.reset}          - Exit the test client\n`);
}

// Initialize the MCP server
function initialize() {
  sendRequest('initialize');
}

// Handle user commands
function handleCommand(input) {
  const parts = input.trim().split(' ');
  const command = parts[0].toLowerCase();
  const args = parts.slice(1).join(' ');
  
  switch (command) {
    case 'init':
    case 'initialize':
      initialize();
      break;
      
    case 'sources':
    case 'list':
      sendRequest('listSources');
      break;
      
    case 'query':
    case 'q':
      if (!args) {
        console.log(`${colors.yellow}! Please provide a query text${colors.reset}`);
        break;
      }
      sendRequest('getContext', { query: { text: args } });
      break;
      
    case 'help':
    case '?':
      showHelp();
      break;
      
    case 'exit':
    case 'quit':
      console.log(`${colors.bright}${colors.blue}Goodbye!${colors.reset}`);
      serverProcess.kill();
      rl.close();
      process.exit(0);
      break;
      
    default:
      console.log(`${colors.yellow}! Unknown command: ${command}${colors.reset}`);
      showHelp();
  }
}

// Set up cleanup
process.on('SIGINT', () => {
  console.log(`\n${colors.bright}${colors.blue}Shutting down...${colors.reset}`);
  serverProcess.kill();
  rl.close();
  process.exit(0);
});

serverProcess.on('close', (code) => {
  console.log(`\n${colors.red}Server process exited with code ${code}${colors.reset}`);
  rl.close();
  process.exit(1);
});

// Start the interactive prompt
function prompt() {
  rl.question(`\n${colors.bright}${colors.blue}mcp-test>${colors.reset} `, (input) => {
    if (input.trim()) {
      handleCommand(input);
    }
    setTimeout(prompt, 100);
  });
}

// Initialize and show help
console.log(`${colors.cyan}Initializing...${colors.reset}`);
initialize();
showHelp();
setTimeout(prompt, 500);
