#!/usr/bin/env node

/**
 * Authentication Integration Tester
 * 
 * This script tests various authentication methods with the MCP server
 * to validate that wiki authentication is working properly.
 */

const axios = require('axios');
const fs = require('fs').promises;
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

const MCP_URL = 'http://localhost:3000';
const MARKDOWN_URL = 'http://localhost:3001';

// Axios with retry functionality
async function axiosWithRetry(config, maxRetries = 3, delay = 1000) {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      return await axios(config);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        throw error;
      }
      
      retries++;
      if (retries >= maxRetries) {
        throw error;
      }
      
      console.log(`${colors.yellow}⚠ Request failed, retrying (${retries}/${maxRetries}): ${error.message}${colors.reset}`);
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, retries - 1)));
    }
  }
}

// Test different authentication methods
async function testBasicAuth() {
  console.log(`${colors.bright}Testing Basic Authentication${colors.reset}`);
  
  try {
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
      console.log(`${colors.green}✓ Basic Auth Success: Server responded with status ${response.status}${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.red}✗ Basic Auth Failed: Unexpected response status: ${response.status}${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗ Basic Auth Error: ${error.message || 'Unknown error'}${colors.reset}`);
    return false;
  }
}

async function testTokenAuth() {
  console.log(`${colors.bright}Testing Token Authentication${colors.reset}`);
  
  try {
    const response = await axiosWithRetry({
      method: 'get',
      url: MARKDOWN_URL,
      timeout: 5000,
      headers: {
        'Authorization': 'Bearer sample_token_not_implemented_in_poc'
      }
    });
    
    // NOTE: The current POC doesn't actually implement token auth
    // This test is for demonstration purposes only
    
    if (response.status === 200) {
      console.log(`${colors.green}✓ Token Auth Success (unexpected): Server responded with status ${response.status}${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.yellow}⚠ Token Auth Not Implemented: Response status: ${response.status}${colors.reset}`);
      return false;
    }
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log(`${colors.yellow}⚠ Token Auth Not Implemented: Server returned 401 as expected${colors.reset}`);
    } else {
      console.log(`${colors.red}✗ Token Auth Error: ${error.message || 'Unknown error'}${colors.reset}`);
    }
    return false;
  }
}

// Test MCP server with configured authentication
async function testMCPAuth() {
  console.log(`${colors.bright}Testing MCP Server Authentication Integration${colors.reset}`);
  
  try {
    const response = await axiosWithRetry({
      method: 'post',
      url: MCP_URL,
      data: {
        jsonrpc: "2.0",
        id: "auth-test",
        method: "getContext",
        params: {
          query: {
            text: "aws server"
          }
        }
      },
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    }, 4, 2000); // 4 retries with 2 second initial delay
    
    if (response.data && response.data.result) {
      const results = response.data.result;
      if (results.length > 0) {
        console.log(`${colors.green}✓ MCP Auth Success: MCP server returned ${results.length} wiki entries${colors.reset}`);
        return true;
      } else {
        console.log(`${colors.yellow}⚠ MCP Auth Warning: MCP server returned 0 wiki entries${colors.reset}`);
        return false;
      }
    } else if (response.data && response.data.error) {
      console.log(`${colors.red}✗ MCP Auth Failed: MCP server returned an error: ${response.data.error.message}${colors.reset}`);
      return false;
    } else {
      console.log(`${colors.red}✗ MCP Auth Failed: MCP server did not return expected results${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗ MCP Auth Error: ${error.message || 'Unknown error'}${colors.reset}`);
    if (error.response && error.response.data) {
      console.log(`${colors.red}Response data:${colors.reset}`, error.response.data);
    }
    return false;
  }
}

// Check MCP server config for auth settings
async function checkMCPConfig() {
  console.log(`${colors.bright}Checking MCP Server Configuration${colors.reset}`);
  
  try {
    const configPath = path.join(__dirname, 'mcp-server', 'mcp.config.json');
    const configData = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    if (config.auth && Array.isArray(config.auth) && config.auth.length > 0) {
      console.log(`${colors.green}✓ MCP Config: Found ${config.auth.length} authentication configuration(s)${colors.reset}`);
      
      config.auth.forEach((auth, index) => {
        console.log(`${colors.cyan}Auth Config #${index + 1}:${colors.reset}`);
        console.log(`  URL Pattern: ${auth.urlPattern}`);
        console.log(`  Auth Type: ${auth.type}`);
        
        // Don't print actual credentials
        if (auth.type === 'basic') {
          console.log(`  Username: ${auth.username ? '*****' : 'Not configured'}`);
          console.log(`  Password: ${auth.password ? '*****' : 'Not configured'}`);
        } else if (auth.type === 'token') {
          console.log(`  Token: ${auth.token ? '*****' : 'Not configured'}`);
        }
      });
      
      return true;
    } else {
      console.log(`${colors.yellow}⚠ MCP Config: No authentication configuration found${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗ MCP Config Error: ${error.message || 'Unknown error'}${colors.reset}`);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log(`${colors.bright}${colors.blue}=== MCP Authentication Integration Test ===${colors.reset}\n`);
  
  try {
    // Verify the MCP server configuration first
    const configOk = await checkMCPConfig();
    console.log(''); // Spacing
    
    // Test each authentication method
    const basicAuthOk = await testBasicAuth();
    console.log(''); // Spacing
    
    const tokenAuthOk = await testTokenAuth();
    console.log(''); // Spacing
    
    // Test MCP server integration with authentication
    const mcpAuthOk = await testMCPAuth();
    
    // Display summary
    console.log(`\n${colors.bright}${colors.blue}=== Authentication Test Results ===${colors.reset}`);
    console.log(`MCP Auth Configuration: ${configOk ? colors.green + '✓' : colors.red + '✗'}${colors.reset}`);
    console.log(`Basic Authentication: ${basicAuthOk ? colors.green + '✓' : colors.red + '✗'}${colors.reset}`);
    console.log(`Token Authentication: ${tokenAuthOk ? colors.green + '✓' : colors.yellow + '⚠ (Not implemented)'}${colors.reset}`);
    console.log(`MCP Auth Integration: ${mcpAuthOk ? colors.green + '✓' : colors.red + '✗'}${colors.reset}`);
    
    if (configOk && basicAuthOk && mcpAuthOk) {
      console.log(`\n${colors.green}✅ The authentication integration is working correctly!${colors.reset}`);
    } else {
      console.log(`\n${colors.red}❌ There are issues with the authentication integration.${colors.reset}`);
      console.log(`${colors.yellow}Please check the logs above for details.${colors.reset}`);
    }
    
  } catch (error) {
    console.log(`\n${colors.red}Test runner error: ${error.message || 'Unknown error'}${colors.reset}`);
  }
}

// Run the tests
runTests();
