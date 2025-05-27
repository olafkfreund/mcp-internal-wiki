#!/usr/bin/env node

const { spawn } = require('child_process');
const { join } = require('path');

// Function to test the MCP server
async function testMCPServer() {
    console.log('🚀 Starting MCP Server test...\n');
    
    try {
        // Start the MCP server
        const serverProcess = spawn('node', ['dist/server.js'], {
            cwd: __dirname,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, NODE_ENV: 'development' }
        });

        let serverOutput = '';
        let serverError = '';

        serverProcess.stdout.on('data', (data) => {
            serverOutput += data.toString();
        });

        serverProcess.stderr.on('data', (data) => {
            serverError += data.toString();
        });

        // Give server time to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test the generate_project tool
        const testRequest = {
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: {
                name: "generate_project",
                arguments: {
                    projectName: "test-react-app",
                    description: "A simple React application with TypeScript",
                    framework: "React",
                    language: "TypeScript"
                }
            }
        };

        console.log('📤 Sending test request:', JSON.stringify(testRequest, null, 2));

        // Send the request to the server
        serverProcess.stdin.write(JSON.stringify(testRequest) + '\n');

        // Wait for response
        let responseReceived = false;
        const responseTimeout = setTimeout(() => {
            if (!responseReceived) {
                console.log('⏰ Timeout waiting for response');
                serverProcess.kill();
            }
        }, 30000);

        serverProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log('📥 Server response:', output);
            
            if (output.includes('"result"') || output.includes('"error"')) {
                responseReceived = true;
                clearTimeout(responseTimeout);
                
                try {
                    const response = JSON.parse(output);
                    console.log('\n✅ Test completed successfully!');
                    console.log('Response:', JSON.stringify(response, null, 2));
                } catch (parseError) {
                    console.log('⚠️ Response received but not valid JSON:', parseError.message);
                    console.log('Raw response:', output);
                }
                
                serverProcess.kill();
            }
        });

        // Handle server exit
        serverProcess.on('exit', (code) => {
            console.log('\n🏁 Server process exited with code:', code);
            if (serverError) {
                console.log('❌ Server errors:', serverError);
            }
            if (serverOutput && !responseReceived) {
                console.log('📄 Server output:', serverOutput);
            }
        });

        // Handle errors
        serverProcess.on('error', (error) => {
            console.error('❌ Failed to start server:', error);
        });

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testMCPServer().catch(console.error);
