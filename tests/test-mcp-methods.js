#!/usr/bin/env node

/**
 * Test the new MCP transformation methods
 */

const { MCPServer } = require('../dist/mcpServer.js');

async function testMCPMethods() {
  console.log('🧪 Testing MCP Transformation Methods\n');
  
  const server = new MCPServer();
  
  // Helper function to simulate MCP request/response
  const sendRequest = (req) => {
    return new Promise((resolve, reject) => {
      const send = (response) => {
        resolve(response);
      };
      
      try {
        server.handleRequest(req, send);
      } catch (error) {
        reject(error);
      }
    });
  };
  
  // Test wiki/transform method
  console.log('1. Testing wiki/transform method...');
  try {
    const transformRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'wiki/transform',
      params: {
        content: `# API Service
        
This is a REST API service for user management.

## Features
- User authentication
- Profile management
- JWT tokens

## Setup
\`\`\`bash
npm install
npm start
\`\`\``,
        targetLanguage: 'typescript',
        outputType: 'class'
      }
    };
    
    const transformResult = await sendRequest(transformRequest);
    console.log('✅ Transform result:', {
      success: transformResult.result?.success || false,
      filesGenerated: transformResult.result?.files?.length || 0,
      processingTime: transformResult.result?.processingTime || 'N/A'
    });
  } catch (error) {
    console.log('❌ Transform error:', error.message);
  }
  
  // Test wiki/generate method
  console.log('\n2. Testing wiki/generate method...');
  try {
    const generateRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'wiki/generate',
      params: {
        content: `# Docker Setup Guide
        
Create a containerized Node.js application:

1. Use Node.js 18 Alpine base image
2. Install dependencies
3. Copy source code
4. Expose port 3000
5. Set health check
        `,
        codeType: 'dockerfile',
        templateName: 'dockerfile'
      }
    };
    
    const generateResult = await sendRequest(generateRequest);
    console.log('✅ Generate result:', {
      success: generateResult.result?.success || false,
      generatedCode: generateResult.result?.generatedCode ? 'Generated' : 'None'
    });
  } catch (error) {
    console.log('❌ Generate error:', error.message);
  }
  
  // Test wiki/generateProject method
  console.log('\n3. Testing wiki/generateProject method...');
  try {
    const projectRequest = {
      jsonrpc: '2.0',
      id: 3,
      method: 'wiki/generateProject',
      params: {
        content: `# Express API Server
        
A REST API server built with Express.js and TypeScript.

Features:
- Authentication middleware
- User management
- Database integration
- Error handling
        `,
        projectType: 'express-api',
        language: 'typescript'
      }
    };
    
    const projectResult = await sendRequest(projectRequest);
    console.log('✅ Project result:', {
      success: projectResult.result?.success || false,
      projectName: projectResult.result?.projectStructure?.name || 'N/A',
      filesCount: projectResult.result?.projectStructure?.files?.length || 0
    });
  } catch (error) {
    console.log('❌ Project error:', error.message);
  }
  
  console.log('\n🎉 MCP method testing complete!');
}

if (require.main === module) {
  testMCPMethods().catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}
