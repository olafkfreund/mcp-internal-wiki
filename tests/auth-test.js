#!/usr/bin/env node

/**
 * Wiki Authentication Test Utility
 * 
 * This script tests authentication for private wiki sources
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

console.log(`${colors.bright}${colors.blue}=== Wiki Authentication Test ===${colors.reset}\n`);

// Load config to get authenticated URLs
const configPath = path.join(process.cwd(), 'mcp.config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Find authenticated wiki URLs
const authConfig = config.auth || [];
const authUrls = [];

// Extract authenticated URLs from config
if (authConfig.length > 0) {
  console.log(`Found ${authConfig.length} authentication configurations`);
  
  // Check each URL against auth patterns
  (config.wikiUrls || []).forEach(url => {
    const matchingAuth = authConfig.find(auth => {
      try {
        const pattern = new RegExp(auth.urlPattern);
        return pattern.test(url);
      } catch (error) {
        return false;
      }
    });
    
    if (matchingAuth) {
      authUrls.push({
        url,
        authType: matchingAuth.type
      });
    }
  });
  
  console.log(`Found ${authUrls.length} URLs requiring authentication`);
} else {
  console.log(`${colors.yellow}No authentication configurations found in mcp.config.json${colors.reset}`);
}

// Start the server
console.log(`${colors.cyan}Starting MCP server...${colors.reset}`);
const server = spawn('node', ['dist/server.js'], {
  stdio: ['pipe', 'pipe', process.stderr]
});

// Initialize request counter
let requestId = 1;

// Process server output
server.stdout.on('data', (data) => {
  const output = data.toString().trim();
  
  // Look for authentication success/failure messages
  if (output.includes('Authentication') || output.includes('auth')) {
    console.log(`${colors.dim}${output}${colors.reset}`);
  }
  
  try {
    // Check for JSON responses
    if (output.startsWith('{') && output.endsWith('}')) {
      const response = JSON.parse(output);
      processResponse(response);
    }
  } catch (error) {
    // Not JSON, that's fine
  }
});

// Process MCP responses
function processResponse(response) {
  if (response.id === 1) {
    console.log(`${colors.green}Server initialized successfully${colors.reset}`);
    
    // Test each authenticated URL
    if (authUrls.length > 0) {
      testNextAuthUrl();
    } else {
      console.log(`\n${colors.yellow}No URLs to test. Add authenticated URLs to mcp.config.json${colors.reset}`);
      shutdown();
    }
    
    return;
  }
  
  // Handle query response
  if (response.result) {
    const results = Array.isArray(response.result) ? response.result : [];
    
    console.log(`\n${colors.bright}Found ${results.length} results${colors.reset}\n`);
    
    results.forEach((item, i) => {
      const success = !item.title?.includes('Error') && 
                      !item.title?.includes('Simulated') && 
                      !item.content?.includes('Error');
      
      const statusColor = success ? colors.green : colors.red;
      const statusText = success ? 'SUCCESS' : 'FAILED';
      
      console.log(`${colors.bright}#${i+1}: ${colors.yellow}${item.title || 'No title'}${colors.reset}`);
      console.log(`Source: ${item.sourceId || 'unknown'} | URL: ${item.url || 'N/A'}`);
      console.log(`Authentication: ${statusColor}${statusText}${colors.reset}`);
      
      if (!success) {
        console.log(`\n${colors.dim}${item.content?.substring(0, 200)}...${colors.reset}`);
      }
      
      console.log('\n' + '-'.repeat(50));
    });
  }
  
  // Test the next URL if available
  testNextAuthUrl();
}

let currentUrlIndex = 0;

// Test the next authenticated URL
function testNextAuthUrl() {
  if (currentUrlIndex >= authUrls.length) {
    console.log(`\n${colors.bright}${colors.green}All authentication tests completed!${colors.reset}`);
    shutdown();
    return;
  }
  
  const current = authUrls[currentUrlIndex++];
  console.log(`\n${colors.bright}${colors.blue}Testing authenticated URL: ${current.url}${colors.reset}`);
  console.log(`Auth type: ${current.authType}\n`);
  
  // Create a simple query that should work on any wiki
  const request = {
    jsonrpc: '2.0',
    id: requestId++,
    method: 'getContext',
    params: {
      query: {
        text: 'documentation'
      }
    }
  };
  
  server.stdin.write(JSON.stringify(request) + '\n');
}

// Initialize the MCP server
console.log('Sending initialize request...');
server.stdin.write(JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {}
}) + '\n');

function shutdown() {
  server.kill();
  process.exit();
}

// Handle exit
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}Test interrupted${colors.reset}`);
  shutdown();
});
