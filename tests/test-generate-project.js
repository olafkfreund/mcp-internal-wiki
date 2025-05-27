#!/usr/bin/env node

const { spawn } = require('child_process');

// Start the MCP server
const server = spawn('node', ['dist/server.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: __dirname
});

let responseCount = 0;

// Handle server output
server.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  lines.forEach(line => {
    try {
      const response = JSON.parse(line);
      console.log('\n=== Server Response ===');
      console.log(JSON.stringify(response, null, 2));
      
      if (response.id === 'init' && response.result) {
        console.log('\n✅ Server initialized, testing generate_project tool...');
        
        // Test the generate_project tool
        const generateRequest = {
          jsonrpc: '2.0',
          id: 'test-generate',
          method: 'tools/call',
          params: {
            name: 'generate_project',
            arguments: {
              content: 'Create a simple TypeScript Express API with basic CRUD operations for user management',
              projectType: 'express-api', 
              language: 'typescript'
            }
          }
        };
        
        console.log('Sending generate_project request...');
        server.stdin.write(JSON.stringify(generateRequest) + '\n');
      }
      
      if (response.id === 'test-generate') {
        console.log('\n✅ Generate project tool response received');
        if (response.error) {
          console.error('❌ Error:', response.error.message);
        } else {
          console.log('✅ Project generated successfully!');
          const result = response.result;
          if (result && result.content && result.content[0]) {
            try {
              const projectData = JSON.parse(result.content[0].text);
              console.log('\n📁 Generated project structure:');
              console.log('- Name:', projectData.name);
              console.log('- Description:', projectData.description);
              console.log('- Files:', projectData.files ? projectData.files.length : 0);
              if (projectData.files) {
                projectData.files.forEach(file => {
                  console.log(`  - ${file.filename} (${file.language})`);
                });
              }
            } catch (parseError) {
              console.error('❌ Failed to parse project data:', parseError.message);
              console.log('Raw response:', result.content[0].text.substring(0, 500) + '...');
            }
          }
        }
        
        // Clean exit
        setTimeout(() => {
          server.kill();
          process.exit(0);
        }, 1000);
      }
      
    } catch (err) {
      // Not JSON, might be debug output
      console.log('[Server Debug]:', line);
    }
  });
});

// Handle server errors
server.stderr.on('data', (data) => {
  console.log('[Server Debug]:', data.toString().trim());
});

server.on('close', (code) => {
  console.log(`\nServer exited with code ${code}`);
  process.exit(code);
});

// Initialize the server
console.log('Starting MCP server and testing generate_project tool...');
const initRequest = {
  jsonrpc: '2.0',
  id: 'init',
  method: 'initialize',
  params: {}
};

server.stdin.write(JSON.stringify(initRequest) + '\n');

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.kill();
  process.exit(0);
});
