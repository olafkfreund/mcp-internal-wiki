#!/usr/bin/env node

/**
 * POC Authentication Test
 * 
 * This script tests authentication between MCP server and the private Markdown server
 * Includes retry logic for improved reliability
 */

const axios = require('axios');
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

// Configure axios with retry functionality
async function axiosWithRetry(config, maxRetries = 3, delay = 1000) {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      return await axios(config);
    } catch (error) {
      // Don't retry on 401 (unauthorized) - that's expected in some tests
      if (error.response && error.response.status === 401) {
        throw error;
      }
      
      retries++;
      if (retries >= maxRetries) {
        throw error;
      }
      
      console.log(`${colors.yellow}⚠ Request failed, retrying (${retries}/${maxRetries}): ${error.message}${colors.reset}`);
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, retries - 1)));
    }
  }
}

console.log(`${colors.bright}${colors.blue}=== MCP Private Wiki Authentication POC Test ===${colors.reset}\n`);

const MCP_URL = 'http://localhost:3000';
const MARKDOWN_URL = 'http://localhost:3001';

async function testMarkdownServerDirectAccess() {
  console.log(`${colors.yellow}Testing direct access to Markdown server without authentication...${colors.reset}`);
  
  let noAuthSuccess = false;
  let withAuthSuccess = false;
  
  try {
    // Try accessing without auth - should fail with 401
    const response = await axios({ 
      method: 'get',
      url: MARKDOWN_URL,
      timeout: 5000,
      validateStatus: status => true // Accept any status code for validation
    });
    
    if (response.status === 401) {
      console.log(`${colors.green}✓ Success: Server requires authentication (401 Unauthorized)${colors.reset}`);
      noAuthSuccess = true; // This is a success case for our test
    } else {
      console.log(`${colors.red}✗ Failed: Server allowed access without authentication (status: ${response.status})${colors.reset}`);
    }
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log(`${colors.green}✓ Success: Server requires authentication (401 Unauthorized)${colors.reset}`);
      noAuthSuccess = true; // This is also a success case for our test
    } else {
      console.log(`${colors.red}✗ Error: ${error.message || 'Unknown error'}${colors.reset}`);
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        console.log(`${colors.red}✗ Could not connect to Markdown server at ${MARKDOWN_URL}. Make sure it's running.${colors.reset}`);
        return null;
      }
    }
  }
  
  console.log(`${colors.yellow}Testing direct access to Markdown server with authentication...${colors.reset}`);
  
  try {
    // Try accessing with auth - should succeed
    const response = await axiosWithRetry({
      method: 'get',
      url: MARKDOWN_URL,
      timeout: 5000,
      auth: {
        username: 'admin',
        password: 'secret'
      }
    });
    
    if (response.status === 200) {
      console.log(`${colors.green}✓ Success: Server allowed access with authentication${colors.reset}`);
      withAuthSuccess = true;
    } else {
      console.log(`${colors.red}✗ Failed: Unexpected response status: ${response.status}${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}✗ Error: ${error.message || 'Unknown error'}${colors.reset}`);
    if (error.response) {
      console.log(`${colors.red}Response status: ${error.response.status}${colors.reset}`);
    }
  }
  
  return {
    noAuth: noAuthSuccess,
    withAuth: withAuthSuccess
  };
}

async function testMCPServerWikiAccess() {
  console.log(`${colors.yellow}Testing MCP server access to wiki content...${colors.reset}`);
  let success = false;
  
  try {
    // Check if MCP server is available first
    console.log(`${colors.dim}Checking if MCP server is available...${colors.reset}`);
    try {
      await axiosWithRetry({
        method: 'post',
        url: MCP_URL,
        data: {
          jsonrpc: "2.0",
          id: "health-check",
          method: "initialize",
          params: {}
        },
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log(`${colors.green}✓ MCP server is available${colors.reset}`);
    } catch (error) {
      console.log(`${colors.red}✗ MCP server health check failed: ${error.message}${colors.reset}`);
      console.log(`${colors.red}Cannot continue with MCP server wiki access test${colors.reset}`);
      return false;
    }
    
    // Send MCP getContext request with retry logic
    console.log(`${colors.dim}Sending getContext request to MCP server...${colors.reset}`);
    const response = await axiosWithRetry({
      method: 'post',
      url: MCP_URL,
      data: {
        jsonrpc: "2.0",
        id: "1",
        method: "getContext",
        params: {
          query: {
            text: "aws server"
          }
        }
      },
      timeout: 15000, // Longer timeout as MCP server needs to fetch from markdown server
      headers: {
        'Content-Type': 'application/json'
      }
    }, 5, 2000); // 5 retries with 2 second initial delay
    
    if (response.data && response.data.result) {
      const results = response.data.result;
      if (results.length > 0) {
        console.log(`${colors.green}✓ Success: MCP server returned ${results.length} wiki entries${colors.reset}`);
        console.log(`${colors.cyan}Sample title: ${results[0].title}${colors.reset}`);
        success = true;
      } else {
        console.log(`${colors.yellow}⚠ Warning: MCP server returned 0 wiki entries${colors.reset}`);
        console.log(`${colors.yellow}This might indicate the MCP server could not access the markdown server content${colors.reset}`);
      }
    } else if (response.data && response.data.error) {
      console.log(`${colors.red}✗ Failed: MCP server returned an error: ${response.data.error.message}${colors.reset}`);
      if (response.data.error.data) {
        console.log(`${colors.red}Error data: ${JSON.stringify(response.data.error.data)}${colors.reset}`);
      }
    } else {
      console.log(`${colors.red}✗ Failed: MCP server did not return expected results${colors.reset}`);
    }
    
    return success;
  } catch (error) {
    console.log(`${colors.red}✗ Error accessing MCP server: ${error.message || 'Unknown error'}${colors.reset}`);
    if (error.response && error.response.data) {
      console.log(`${colors.red}Response data:`, error.response.data, colors.reset);
    }
    
    return false;
  }
}

// Check if a service is ready
async function checkServiceReadiness(url, maxRetries = 5, delay = 2000) {
  console.log(`${colors.dim}Checking if service at ${url} is ready...${colors.reset}`);
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      await axios({
        method: 'get',
        url,
        timeout: 3000,
        validateStatus: () => true // Accept any status code for health check
      });
      console.log(`${colors.green}✓ Service at ${url} is reachable${colors.reset}`);
      return true;
    } catch (error) {
      retries++;
      if (retries >= maxRetries) {
        console.log(`${colors.red}✗ Service at ${url} is not reachable after ${maxRetries} attempts${colors.reset}`);
        return false;
      }
      
      console.log(`${colors.yellow}⚠ Service at ${url} is not ready (attempt ${retries}/${maxRetries}), waiting...${colors.reset}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return false;
}

// Run tests
async function runTests() {
  try {
    console.log(`${colors.bright}${colors.blue}Starting POC Test Suite${colors.reset}`);
    console.log(`${colors.dim}Testing connectivity to servers...${colors.reset}`);
    
    // Check services readiness with progressive retries instead of just waiting
    const markdownServerReady = await checkServiceReadiness(MARKDOWN_URL);
    const mcpServerReady = await checkServiceReadiness(MCP_URL);
    
    if (!markdownServerReady || !mcpServerReady) {
      console.log(`${colors.red}✗ One or more services are not ready. Please check the Docker containers.${colors.reset}`);
      console.log(`${colors.yellow}Tip: Run 'npm run restart' to rebuild and restart the containers${colors.reset}`);
      process.exit(1);
    }
    
    console.log(`${colors.dim}All services are ready, proceeding with tests...${colors.reset}\n`);
    
    // Track test results
    const testResults = {
      markdownNoAuth: false,
      markdownWithAuth: false,
      mcpServerAccess: false
    };
    
    // Run the tests and collect results
    const markdownResults = await testMarkdownServerDirectAccess()
      .then(results => {
        if (results) {
          testResults.markdownNoAuth = results.noAuth;
          testResults.markdownWithAuth = results.withAuth;
        }
        return results;
      })
      .catch(() => null);
    
    console.log(''); // Add spacing
    
    const mcpResults = await testMCPServerWikiAccess()
      .then(success => {
        testResults.mcpServerAccess = success;
        return success;
      })
      .catch(() => false);
    
    // Display summary
    console.log(`\n${colors.bright}${colors.blue}=== POC Test Results ===${colors.reset}`);
    console.log(`${colors.bright}Markdown server authentication:${colors.reset} ${testResults.markdownNoAuth ? '✓' : '✗'}`);
    console.log(`${colors.bright}Markdown server with credentials:${colors.reset} ${testResults.markdownWithAuth ? '✓' : '✗'}`);
    console.log(`${colors.bright}MCP server wiki access:${colors.reset} ${testResults.mcpServerAccess ? '✓' : '✗'}`);
    
    if (testResults.markdownNoAuth && testResults.markdownWithAuth && testResults.mcpServerAccess) {
      console.log(`\n${colors.green}✅ All tests passed successfully! The POC is working correctly.${colors.reset}`);
      console.log(`${colors.cyan}🔒 Private wiki authentication is working properly.${colors.reset}`);
    } else {
      console.log(`\n${colors.red}❌ Some tests failed. The POC needs attention.${colors.reset}`);
      console.log(`${colors.yellow}Try running 'npm run restart' to rebuild and restart the containers.${colors.reset}`);
      process.exit(1);
    }
  } catch (error) {
    console.log(`${colors.red}Test suite error: ${error.message || 'Unknown error'}${colors.reset}`);
    process.exit(1);
  }
}

// Run the tests
runTests();
