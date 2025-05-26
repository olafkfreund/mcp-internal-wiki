#!/usr/bin/env node

/**
 * Wiki Content Fetching Test Utility
 * 
 * This script tests fetching real content from configured wiki sources
 * and shows the results in a readable format.
 */

const { spawn } = require('child_process');
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

// Default test queries to try
const TEST_QUERIES = [
  'NixOS configuration',
  'Docker container example',
  'GitHub API authentication',
  'Kubernetes deployment',
  'Flake inputs',
  'REST API endpoints'
];

console.log(`${colors.bright}${colors.blue}=== Wiki Content Fetching Test ===${colors.reset}\n`);

// Get query from command line args or use defaults
const queryArg = process.argv[2];
const queries = queryArg ? [queryArg] : TEST_QUERIES;

// Start the server
console.log(`${colors.cyan}Starting MCP server...${colors.reset}`);
const server = spawn('node', ['dist/server.js'], {
  stdio: ['pipe', 'pipe', process.stderr]
});

// Initialize request counter
let requestId = 1;
let currentQuery = null;
let queryStartTime = null;

// Parse partial JSON responses
let buffer = '';

// Process server output
server.stdout.on('data', (data) => {
  buffer += data.toString();
  
  try {
    // Extract complete JSON responses
    const lines = buffer.split('\n');
    buffer = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      if (trimmedLine.startsWith('{') && trimmedLine.endsWith('}')) {
        const response = JSON.parse(trimmedLine);
        processResponse(response);
      } else {
        buffer += line + '\n';
      }
    }
  } catch (error) {
    // If we can't parse the JSON yet, keep accumulating data
  }
});

// Process MCP responses
function processResponse(response) {
  if (response.id === 1) {
    console.log(`${colors.green}Server initialized successfully${colors.reset}`);
    runNextQuery();
    return;
  }
  
  const elapsed = Date.now() - queryStartTime;
  console.log(`${colors.bright}Results for "${currentQuery}" (${elapsed}ms):${colors.reset}`);
  
  const results = Array.isArray(response.result) ? response.result : [];
  console.log(`${colors.bright}Found ${results.length} results${colors.reset}\n`);
  
  results.forEach((item, i) => {
    console.log(`${colors.bright}#${i+1}: ${colors.yellow}${item.title || 'No title'}${colors.reset}`);
    console.log(`Source: ${item.sourceId || 'unknown'} | URL: ${item.url || 'N/A'}`);
    
    // Extract code blocks
    const codeBlocks = extractCodeBlocks(item.text);
    if (codeBlocks.length > 0) {
      console.log(`\n${colors.bright}Code blocks found:${colors.reset} ${codeBlocks.length}`);
      codeBlocks.forEach((block, j) => {
        if (j < 2) { // Only show first 2 code blocks
          console.log(`\n${colors.cyan}\`\`\`${block.lang}${colors.reset}`);
          console.log(truncate(block.code, 200));
          console.log(`${colors.cyan}\`\`\`${colors.reset}`);
        }
      });
    } else {
      // Show a preview of the content
      console.log(`\n${colors.dim}${truncate(item.text, 200)}${colors.reset}`);
    }
    
    console.log('\n' + '-'.repeat(50));
  });
  
  runNextQuery();
}

// Extract code blocks from Markdown-like text
function extractCodeBlocks(text) {
  if (!text) return [];
  
  const blocks = [];
  const regex = /\`\`\`([a-z]*)\n([\s\S]*?)\`\`\`/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    blocks.push({
      lang: match[1] || 'text',
      code: match[2]
    });
  }
  
  return blocks;
}

// Truncate text to a specific length
function truncate(text, maxLength) {
  if (!text) return '';
  return text.length > maxLength ? text.substr(0, maxLength) + '...' : text;
}

// Run the next query in the queue
function runNextQuery() {
  if (queries.length === 0) {
    console.log(`\n${colors.bright}${colors.green}All tests completed!${colors.reset}`);
    server.kill();
    return;
  }
  
  currentQuery = queries.shift();
  console.log(`\n${colors.bright}${colors.blue}Testing query: "${currentQuery}"${colors.reset}\n`);
  queryStartTime = Date.now();
  
  const request = {
    jsonrpc: '2.0',
    id: requestId++,
    method: 'getContext',
    params: {
      query: {
        text: currentQuery
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

// Handle exit
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}Test interrupted${colors.reset}`);
  server.kill();
  process.exit();
});
