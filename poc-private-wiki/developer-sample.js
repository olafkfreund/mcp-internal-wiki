#!/usr/bin/env node

/**
 * MCP Private Wiki POC - Developer Sample
 * 
 * This script demonstrates how to integrate the MCP server with private wiki authentication
 * in your own code as a developer.
 */

const axios = require('axios');

async function main() {
  try {
    console.log('Connecting to MCP server...');

    // Initialize the MCP server
    const initResponse = await axios.post('http://localhost:3000', {
      jsonrpc: '2.0',
      id: 'init',
      method: 'initialize',
      params: {}
    });
    
    console.log('MCP Server initialized successfully');
    console.log(`Server name: ${initResponse.data.result.name}`);
    console.log(`Version: ${initResponse.data.result.version}`);
    console.log(`Available sources: ${initResponse.data.result.sources.join(', ')}`);
    
    // Get context from the MCP server
    console.log('\nRequesting context about "AWS servers"...');
    const contextResponse = await axios.post('http://localhost:3000', {
      jsonrpc: '2.0',
      id: 'context',
      method: 'getContext',
      params: {
        query: {
          text: 'AWS servers with high memory'
        }
      }
    });
    
    // Process the results
    if (contextResponse.data && contextResponse.data.result) {
      const results = contextResponse.data.result;
      
      console.log(`\nFound ${results.length} wiki entries`);
      
      // Display the results
      results.forEach((result, index) => {
        console.log(`\n--- Result ${index + 1} ---`);
        console.log(`Title: ${result.title}`);
        console.log(`Source: ${result.source}`);
        
        if (result.url) {
          console.log(`URL: ${result.url}`);
        }
        
        // Truncate content for display
        const truncatedContent = result.content.length > 150 
          ? result.content.substring(0, 150) + '...' 
          : result.content;
        
        console.log(`Content preview: ${truncatedContent}`);
      });
      
      console.log('\nNotes:');
      console.log('1. The MCP server handled authentication to the private wiki automatically');
      console.log('2. Authentication is configured in mcp.config.json');
      console.log('3. Your application code does not need to handle wiki credentials');
    } else {
      console.log('No results returned from MCP server');
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the sample
main();
