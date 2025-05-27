#!/usr/bin/env node

// Simple MCP Server Test
const { spawn } = require('child_process');
const server = spawn('node', ['dist/server.js']);

console.log('Testing MCP server...');

// Send initialize request
const initRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {}
};

console.log('Sending initialize request...');
server.stdin.write(JSON.stringify(initRequest) + '\n');

// Send getContext request after 1 second
setTimeout(() => {
  const contextRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'getContext',
    params: {
      query: {
        text: 'NixOS configuration'
      }
    }
  };
  
  console.log('Sending getContext request...');
  server.stdin.write(JSON.stringify(contextRequest) + '\n');
  
  // End test after 3 seconds
  setTimeout(() => {
    console.log('Test complete.');
    server.kill();
    process.exit(0);
  }, 3000);
}, 1000);

// Process server responses
server.stdout.on('data', (data) => {
  console.log('\nServer response:');
  console.log(data.toString());
});

// Process errors
server.stderr.on('data', (data) => {
  console.error('Server error:', data.toString());
});

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
});

// === AGENT TESTS ===
const { WikiContentAgent } = require('../dist/agents/WikiContentAgent');
const { AIRelevanceAgent } = require('../dist/agents/AIRelevanceAgent');
const { WikiIndexAgent } = require('../dist/agents/WikiIndexAgent');

(async () => {
  console.log('\n[Agent Test] WikiContentAgent:');
  const contentAgent = new WikiContentAgent({ verbose: true });
  await contentAgent.initialize();
  const contentResult = await contentAgent.run({ query: 'NixOS configuration', maxResults: 2 });
  console.log('WikiContentAgent results:', contentResult.results.length, contentResult.error ? 'Error: ' + contentResult.error : '');

  console.log('\n[Agent Test] AIRelevanceAgent:');
  const aiAgent = new AIRelevanceAgent();
  const aiResult = await aiAgent.run({
    query: 'NixOS configuration',
    contents: (contentResult.results || []).map(r => ({ title: r.title, content: r.content || r.text, url: r.url }))
  });
  console.log('AIRelevanceAgent results:', aiResult.results.length, aiResult.error ? 'Error: ' + aiResult.error : '');

  console.log('\n[Agent Test] WikiIndexAgent:');
  const indexAgent = new WikiIndexAgent();
  const indexResult = await indexAgent.run({ rebuild: true });
  console.log('WikiIndexAgent status:', indexResult.status, indexResult.error ? 'Error: ' + indexResult.error : '');

  await contentAgent.shutdown();
})();
