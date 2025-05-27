#!/usr/bin/env node

const { spawn } = require('child_process');

// Start the MCP server
const server = spawn('node', ['dist/server.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: __dirname
});

let initialized = false;

// Handle server output
server.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  lines.forEach(line => {
    try {
      const response = JSON.parse(line);
      
      if (response.id === 'init' && response.result) {
        console.log('✅ Server initialized successfully');
        initialized = true;
        
        // Test the generate_project tool
        console.log('\n🧪 Testing generate_project tool...');
        const generateRequest = {
          jsonrpc: '2.0',
          id: 'test-generate',
          method: 'tools/call',
          params: {
            name: 'generate_project',
            arguments: {
              content: 'Create a simple TypeScript Express API',
              projectType: 'express-api', 
              language: 'typescript'
            }
          }
        };
        
        server.stdin.write(JSON.stringify(generateRequest) + '\n');
      }
      
      if (response.id === 'test-generate') {
        console.log('\n📦 Generate project tool response received');
        
        if (response.error) {
          console.error('❌ Error:', response.error.message);
          console.error('   Code:', response.error.code);
        } else if (response.result) {
          console.log('✅ Project generation completed!');
          
          if (response.result.content && response.result.content[0]) {
            try {
              const projectData = JSON.parse(response.result.content[0].text);
              console.log('\n📁 Project Details:');
              console.log('   Name:', projectData.name || 'N/A');
              console.log('   Description:', projectData.description || 'N/A');
              console.log('   Files Generated:', projectData.files ? projectData.files.length : 0);
              
              if (projectData.files && projectData.files.length > 0) {
                console.log('\n📄 Generated Files:');
                projectData.files.forEach((file, index) => {
                  console.log(`   ${index + 1}. ${file.filename} (${file.language || 'unknown'})`);
                  if (file.description) {
                    console.log(`      - ${file.description}`);
                  }
                });
              }
              
              if (projectData.dependencies && projectData.dependencies.length > 0) {
                console.log('\n📦 Dependencies:', projectData.dependencies.join(', '));
              }
              
            } catch (parseError) {
              console.error('❌ Failed to parse project response:', parseError.message);
              console.log('\n🔍 Raw response preview:');
              const rawText = response.result.content[0].text;
              console.log(rawText.substring(0, 500) + (rawText.length > 500 ? '...' : ''));
            }
          }
        }
        
        // Clean exit
        setTimeout(() => {
          server.kill();
          process.exit(0);
        }, 2000);
      }
      
    } catch (err) {
      // Not JSON, might be debug output - ignore for now
    }
  });
});

// Handle server errors/debug
server.stderr.on('data', (data) => {
  const message = data.toString().trim();
  if (message.includes('[DEBUG]') || message.includes('Failed to parse AI project structure response')) {
    console.log('🐛 Debug:', message);
  }
});

server.on('close', (code) => {
  console.log(`\n🏁 Server exited with code ${code}`);
  if (!initialized) {
    console.log('⚠️  Server never initialized properly');
  }
  process.exit(code);
});

// Initialize the server
console.log('🚀 Starting MCP server...');
const initRequest = {
  jsonrpc: '2.0',
  id: 'init',
  method: 'initialize',
  params: {}
};

server.stdin.write(JSON.stringify(initRequest) + '\n');

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n⏹️  Shutting down...');
  server.kill();
  process.exit(0);
});

// Timeout after 30 seconds
setTimeout(() => {
  console.log('\n⏰ Test timeout - killing server');
  server.kill();
  process.exit(1);
}, 30000);
