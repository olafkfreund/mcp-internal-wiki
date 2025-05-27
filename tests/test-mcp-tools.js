#!/usr/bin/env node

/**
 * Test script for MCP tool calls
 * Tests the transformation tools through the standard MCP tools protocol
 */

const { MCPServer } = require('../dist/mcpServer');

async function testMCPTools() {
  console.log('🧪 Testing MCP Transformation Tools');
  
  const server = new MCPServer();
  
  // Helper function to capture responses
  function captureResponse(resolve) {
    return (response) => {
      resolve(response);
    };
  }

  // Test 1: List tools
  console.log('\n1. Testing tools/list...');
  const toolsListResponse = await new Promise((resolve) => {
    server.handleRequest(
      {
        jsonrpc: '2.0',
        id: 'test-1',
        method: 'tools/list',
        params: {}
      },
      captureResponse(resolve)
    );
  });
  
  console.log('✅ Tools list response:', JSON.stringify(toolsListResponse.result.tools.map(t => t.name), null, 2));

  // Test 2: Transform content tool
  console.log('\n2. Testing transform_content tool...');
  const transformResponse = await new Promise((resolve) => {
    server.handleRequest(
      {
        jsonrpc: '2.0',
        id: 'test-2',
        method: 'tools/call',
        params: {
          name: 'transform_content',
          arguments: {
            content: '# Hello World\n\nThis is a simple markdown document that should be converted to TypeScript.',
            targetLanguage: 'typescript',
            framework: 'express',
            projectType: 'api'
          }
        }
      },
      captureResponse(resolve)
    );
  });
  
  if (transformResponse.result) {
    console.log('✅ Transform tool response received');
    console.log('Content type:', transformResponse.result.content[0].type);
    const responseData = JSON.parse(transformResponse.result.content[0].text);
    console.log('Transform success:', responseData.success);
  } else {
    console.log('❌ Transform tool error:', transformResponse.error);
  }

  // Test 3: Generate code tool
  console.log('\n3. Testing generate_code tool...');
  const generateResponse = await new Promise((resolve) => {
    server.handleRequest(
      {
        jsonrpc: '2.0',
        id: 'test-3',
        method: 'tools/call',
        params: {
          name: 'generate_code',
          arguments: {
            content: '# Express API Server\n\nCreate a simple Express server with health check endpoint.',
            codeType: 'typescript',
            templateName: 'express-server'
          }
        }
      },
      captureResponse(resolve)
    );
  });
  
  if (generateResponse.result) {
    console.log('✅ Generate code tool response received');
    const responseData = JSON.parse(generateResponse.result.content[0].text);
    console.log('Generation success:', responseData.success);
    console.log('Files generated:', responseData.files ? responseData.files.length : 0);
  } else {
    console.log('❌ Generate code tool error:', generateResponse.error);
  }

  // Test 4: Generate project tool
  console.log('\n4. Testing generate_project tool...');
  const projectResponse = await new Promise((resolve) => {
    server.handleRequest(
      {
        jsonrpc: '2.0',
        id: 'test-4',
        method: 'tools/call',
        params: {
          name: 'generate_project',
          arguments: {
            content: '# CLI Tool Project\n\nCreate a TypeScript CLI tool for file processing.',
            projectType: 'cli-tool',
            language: 'typescript'
          }
        }
      },
      captureResponse(resolve)
    );
  });
  
  if (projectResponse.result) {
    console.log('✅ Generate project tool response received');
    const responseData = JSON.parse(projectResponse.result.content[0].text);
    console.log('Project generation success:', responseData.success);
  } else {
    console.log('❌ Generate project tool error:', projectResponse.error);
  }

  // Test 5: Search wiki tool (existing functionality)
  console.log('\n5. Testing search_wiki tool...');
  const searchResponse = await new Promise((resolve) => {
    server.handleRequest(
      {
        jsonrpc: '2.0',
        id: 'test-5',
        method: 'tools/call',
        params: {
          name: 'search_wiki',
          arguments: {
            query: 'Docker containers NixOS'
          }
        }
      },
      captureResponse(resolve)
    );
  });
  
  if (searchResponse.result) {
    console.log('✅ Search wiki tool response received');
    console.log('Content type:', searchResponse.result.content[0].type);
    const searchResults = JSON.parse(searchResponse.result.content[0].text);
    console.log('Search results count:', searchResults.length);
  } else {
    console.log('❌ Search wiki tool error:', searchResponse.error);
  }

  console.log('\n🎉 MCP tools testing complete!');
}

// Run the tests
testMCPTools().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
