#!/usr/bin/env node

/**
 * MCP Wiki Server Query Test
 * This script sends specific queries to the MCP server and displays the results.
 */

const { spawn } = require('child_process');
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

console.log(`${colors.bright}${colors.blue}=== MCP Wiki Server Query Test ===${colors.reset}\n`);

// Start the server process
console.log(`${colors.cyan}Starting MCP server...${colors.reset}`);
const serverProcess = spawn('node', ['dist/server.js'], {
  stdio: ['pipe', 'pipe', process.stderr]
});

let requestId = 1;
let initialized = false;

// Buffer to accumulate partial JSON data
let buffer = '';

// Process server output
serverProcess.stdout.on('data', (data) => {
  // Add incoming data to buffer
  buffer += data.toString();
  
  // Try to extract complete JSON objects from the buffer
  processBuffer();
});

// Function to process the buffer and extract JSON messages
function processBuffer() {
  // Look for lines that might be JSON (starting with '{')
  const lines = buffer.split('\n');
  let newBuffer = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) continue;
    
    // If it looks like a debug message, print it with context
    if (!line.startsWith('{')) {
      console.log(`${colors.cyan}[Server Debug] ${line}${colors.reset}`);
      continue;
    }
    
    try {
      // Try to parse as JSON
      const response = JSON.parse(line);
      
      console.log(`${colors.yellow}Received response for request ${response.id}${colors.reset}`);
      
      if (response.id === 1 && response.result) {
        console.log(`${colors.green}Server initialized successfully${colors.reset}`);
        initialized = true;
        sendQuery("What is the MCP protocol?");
      }
      
      if (response.id > 1 && response.result) {
        console.log(`\n${colors.bright}Query Results:${colors.reset}`);
        
        // Handle both result formats: direct array or items property
        const contextItems = Array.isArray(response.result) ? response.result : (response.result.items || []);
        
        if (contextItems.length === 0) {
          console.log("No results found for this query.");
        } else {
          contextItems.forEach((item, index) => {
            console.log(`\n${colors.bright}Result ${index + 1}:${colors.reset}`);
            console.log(`${colors.cyan}Title:${colors.reset} ${item.title || 'No title'}`);
            console.log(`${colors.cyan}Content:${colors.reset} ${item.text ? item.text.substring(0, 150) + '...' : (item.content ? item.content.substring(0, 150) + '...' : 'No content')}`);
            console.log(`${colors.cyan}Source:${colors.reset} ${item.sourceId || item.uri || 'Unknown source'}`);
            console.log(`${colors.cyan}URL:${colors.reset} ${item.url || 'No URL'}`);
          });
        }
        
        // Send another query after the first one completes
        if (response.id === 2) {
          sendQuery("How to set up NixOS for development?");
        } else if (response.id === 3) {
          sendQuery("NixOS flake configuration example");
        } else if (response.id === 4) {
          console.log(`\n${colors.bright}${colors.green}Testing complete. Press Ctrl+C to exit.${colors.reset}`);
        }
      }
    } catch (err) {
      // If it's not valid JSON, add it back to the buffer
      // (might be an incomplete JSON message)
      if (line.startsWith('{')) {
        newBuffer += line + '\n';
      }
    }
  }
  
  // Update buffer with any incomplete JSON data
  buffer = newBuffer;
}

// Send initialize request
console.log(`${colors.cyan}Sending initialize request...${colors.reset}`);
const initRequest = {
  jsonrpc: '2.0',
  id: requestId++,
  method: 'initialize',
  params: {}
};
serverProcess.stdin.write(JSON.stringify(initRequest) + '\n');

// Function to send a query to the server
function sendQuery(queryText) {
  if (!initialized) {
    console.error("Cannot send query - server not initialized");
    return;
  }
  
  console.log(`\n${colors.cyan}Sending query: "${queryText}"${colors.reset}`);
  
  const queryRequest = {
    jsonrpc: '2.0',
    id: requestId++,
    method: 'getContext',
    params: {
      query: {
        text: queryText
      }
    }
  };
  
  serverProcess.stdin.write(JSON.stringify(queryRequest) + '\n');
}

// Handle cleanup
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}Shutting down test...${colors.reset}`);
  serverProcess.kill();
  process.exit(0);
});
