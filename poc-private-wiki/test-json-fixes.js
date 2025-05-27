#!/usr/bin/env node

/**
 * Test script to verify JSON parsing fixes in the POC containers
 */

const axios = require('axios');

async function testGenerateProject() {
    console.log('Testing generate_project tool with JSON parsing fixes...\n');
    
    try {
        const response = await axios.post('http://localhost:3000/', {
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: {
                name: 'generate_project',
                arguments: {
                    projectName: 'test-express-app',
                    description: 'A simple Express.js REST API with basic CRUD operations',
                    projectType: 'nodejs',
                    features: ['express', 'rest-api', 'middleware']
                }
            }
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        console.log('✅ Success! Response received:');
        console.log('Status:', response.status);
        console.log('Tool Result:');
        
        if (response.data && response.data.result) {
            console.log('Result type:', typeof response.data.result);
            console.log('Result content:');
            console.log(JSON.stringify(response.data.result, null, 2));
            
            // Check if it contains project structure data
            const result = response.data.result;
            if (result.content && (typeof result.content === 'object' || typeof result.content === 'string')) {
                const contentStr = typeof result.content === 'object' ? JSON.stringify(result.content) : result.content;
                
                if (contentStr.includes('package.json') || contentStr.includes('Project structure generated')) {
                    console.log('\n✅ JSON parsing appears to be working - project structure generated successfully!');
                } else {
                    console.log('\n⚠️  Response received but may be using fallback structure');
                }
                
                console.log('\nContent preview:', contentStr.substring(0, 500));
            } else {
                console.log('\n⚠️  Unexpected result format');
            }
        } else {
            console.log('Full response data:', JSON.stringify(response.data, null, 2));
        }

    } catch (error) {
        console.error('❌ Error testing generate_project:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        } else if (error.request) {
            console.error('No response received');
        } else {
            console.error('Error details:', error);
        }
    }
}

async function testContainerHealth() {
    console.log('Checking container health...\n');
    
    try {
        // Test MCP server health
        const mcpHealth = await axios.get('http://localhost:3000/health');
        console.log('✅ MCP Server health:', mcpHealth.data);
        
        // Test markdown server health
        const markdownHealth = await axios.get('http://localhost:3001/health', {
            auth: {
                username: 'admin',
                password: 'secret'
            }
        });
        console.log('✅ Markdown Server health:', markdownHealth.data);
        
    } catch (error) {
        console.error('❌ Health check failed:', error.message);
    }
}

async function main() {
    console.log('='.repeat(60));
    console.log('POC Container JSON Parsing Fix Verification');
    console.log('='.repeat(60));
    
    await testContainerHealth();
    console.log('\n' + '-'.repeat(60) + '\n');
    await testGenerateProject();
    
    console.log('\n' + '='.repeat(60));
    console.log('Test completed!');
    console.log('='.repeat(60));
}

main().catch(console.error);
