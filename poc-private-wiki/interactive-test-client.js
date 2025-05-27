#!/usr/bin/env node

/**
 * POC Interactive Test Client
 * 
 * This is a simple interactive test client for the MCP Private Wiki POC
 */

const axios = require('axios');
const readline = require('readline');

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

const MCP_URL = 'http://localhost:3000';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Display banner
console.log(`${colors.bright}${colors.blue}=======================================`);
console.log(`MCP Private Wiki POC - Interactive Test Client`);
console.log(`=======================================${colors.reset}\n`);
console.log(`This client connects to the MCP server at ${MCP_URL}`);
console.log(`The MCP server will authenticate with the private wiki server.`);
console.log(`Type a query to get wiki context, or 'exit' to quit.\n`);

// Create axios instance with retry functionality
const axiosWithRetry = async (config, maxRetries = 3, delay = 1000) => {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      return await axios(config);
    } catch (error) {
      retries++;
      if (retries >= maxRetries) {
        throw error;
      }
      
      console.log(`${colors.yellow}⚠ Request failed, retrying (${retries}/${maxRetries}): ${error.message}${colors.reset}`);
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, retries - 1)));
    }
  }
};

// Check if the MCP server is running with retry logic
console.log(`${colors.dim}Checking connection to MCP server...${colors.reset}`);

axiosWithRetry({
  method: 'post',
  url: MCP_URL,
  data: {
    jsonrpc: "2.0",
    id: "check",
    method: "initialize", 
    params: {}
  },
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json'
  }
}, 5, 2000) // 5 retries with 2 second initial delay
.then(response => {
  console.log(`${colors.green}✓ Connected to MCP server${colors.reset}`);
  
  if (response.data && response.data.result && response.data.result.sources) {
    console.log(`${colors.cyan}Available sources: ${response.data.result.sources.join(', ')}${colors.reset}\n`);
  }
  
  startInteractiveSession();
}).catch(error => {
  console.log(`${colors.red}× Failed to connect to MCP server: ${error.message}${colors.reset}`);
  console.log(`Make sure the Docker containers are running with 'npm run start'`);
  console.log(`You can restart the containers with 'npm run restart'`);
  process.exit(1);
});

function startInteractiveSession() {
  askForQuery();
}

function askForQuery() {
  rl.question(`\n${colors.yellow}Enter query${colors.reset} > `, async (query) => {
    if (query.toLowerCase() === 'exit') {
      console.log(`\n${colors.blue}Goodbye!${colors.reset}`);
      rl.close();
      return;
    }
    
    try {
      console.log(`\n${colors.dim}Sending query to MCP server...${colors.reset}`);
      
      const response = await axiosWithRetry({
        method: 'post',
        url: MCP_URL,
        data: {
          jsonrpc: "2.0",
          id: Date.now().toString(),
          method: "getContext",
          params: {
            query: {
              text: query
            }
          }
        },
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      }, 3, 1500); // 3 retries with 1.5 second initial delay
      
      if (response.data && response.data.result) {
        const results = response.data.result;
        
        if (results.length === 0) {
          console.log(`\n${colors.yellow}No results found for "${query}"${colors.reset}`);
        } else {
          console.log(`\n${colors.green}Found ${results.length} results:${colors.reset}\n`);
          
          results.forEach((result, index) => {
            console.log(`${colors.bright}${colors.blue}=== Result ${index + 1} ===${colors.reset}`);
            console.log(`${colors.bright}Title:${colors.reset} ${result.title}`);
            console.log(`${colors.bright}Source:${colors.reset} ${result.source}`);
            if (result.url) {
              console.log(`${colors.bright}URL:${colors.reset} ${result.url}`);
            }
            console.log(`${colors.bright}Content:${colors.reset} ${result.content.substring(0, 200)}...`);
            console.log('');
          });
        }
      } else if (response.data && response.data.error) {
        console.log(`\n${colors.red}Error: ${response.data.error.message}${colors.reset}`);
      }
    } catch (error) {
      console.log(`\n${colors.red}Error: ${error.message}${colors.reset}`);
      if (error.response && error.response.data) {
        console.log(`\n${colors.red}Response: ${JSON.stringify(error.response.data)}${colors.reset}`);
      }
    }
    
    // Ask for another query
    askForQuery();
  });
}
