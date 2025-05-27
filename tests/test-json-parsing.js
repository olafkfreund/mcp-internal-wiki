#!/usr/bin/env node

const { spawn } = require('child_process');

console.log('🧪 Testing JSON parsing with problematic content...\n');

const serverProcess = spawn('node', ['dist/server.js'], {
    cwd: __dirname,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'development' }
});

let initialized = false;

serverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    
    if (output.includes('Wiki content pre-fetch complete') && !initialized) {
        initialized = true;
        console.log('✅ Server initialized, sending test request...');
        
        // Send a test that should trigger complex JSON with newlines
        const testRequest = {
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: {
                name: "generate_project",
                arguments: {
                    content: `
# Express Server with Complex Code

Create an Express.js server with:
- Multiple endpoints
- Error handling
- Template literals with variables
- Multi-line code blocks
                    `,
                    projectType: "express-api",
                    language: "typescript"
                }
            }
        };

        serverProcess.stdin.write(JSON.stringify(testRequest) + '\n');
    }
    
    if (output.includes('"result"')) {
        console.log('📥 Received response!');
        try {
            const response = JSON.parse(output);
            console.log('✅ JSON parsing successful!');
            console.log('📁 Generated files:', response.result.content[0].text.split('"files":')[1]?.split('"structure"')[0]?.substring(0, 200) + '...');
            serverProcess.kill();
            process.exit(0);
        } catch (e) {
            console.log('❌ JSON parsing failed:', e.message);
            serverProcess.kill();
            process.exit(1);
        }
    }
});

serverProcess.stderr.on('data', (data) => {
    const error = data.toString();
    if (error.includes('[DEBUG]')) {
        console.log('🔍', error.trim());
    } else if (error.includes('ERROR') || error.includes('Failed')) {
        console.log('❌', error.trim());
    }
});

serverProcess.on('exit', (code) => {
    console.log(`\n🏁 Test completed with exit code: ${code}`);
});

// Timeout after 30 seconds
setTimeout(() => {
    console.log('⏰ Test timeout');
    serverProcess.kill();
    process.exit(1);
}, 30000);
