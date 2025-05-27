#!/usr/bin/env node

/**
 * AI Relevance Scoring Test with Mock Provider
 * 
 * This script tests the AI-assisted relevance scoring functionality
 * using the mock AI provider to avoid API key requirements.
 */

const axios = require('axios');
const { spawn } = require('child_process');
const { WikiContentAgent } = require('../dist/agents/WikiContentAgent');
const { AIRelevanceAgent } = require('../dist/agents/AIRelevanceAgent');
const { WikiIndexAgent } = require('../dist/agents/WikiIndexAgent');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Test queries to evaluate AI relevance scoring
const TEST_QUERIES = [
  'NixOS configuration',
  'Docker container example',
  'GitHub API authentication',
  'Kubernetes deployment',
  'Flake inputs',
  'REST API endpoints'
];

console.log(`${colors.bright}${colors.blue}=== Mock AI Relevance Scoring Test ===${colors.reset}\n`);

// Command line arguments
const args = process.argv.slice(2);
const queryArg = args[0];
const showSummaryArg = args.includes('--summary');
const showScoreArg = args.includes('--scores') || true; // Default to showing scores
const queries = queryArg ? [queryArg] : TEST_QUERIES;

console.log(`${colors.cyan}Starting MCP server with Mock AI relevance scoring...${colors.reset}`);

// Set environment variable to use mock AI provider
process.env.MCP_USE_MOCK_AI = 'true';

// Force AI to be enabled for testing
process.env.MCP_ENABLE_AI = 'true';

const server = spawn('node', ['dist/server.js'], {
  stdio: ['pipe', 'pipe', process.stderr],
  env: { ...process.env, MCP_USE_MOCK_AI: 'true', MCP_ENABLE_AI: 'true' }
});

// Give server time to start
setTimeout(async () => {
  try {
    // Initialize MCP server
    const initResponse = await axios.post('http://localhost:27452', {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        rootUri: process.cwd(),
        capabilities: {}
      }
    });
    
    console.log(`${colors.green}Server initialized successfully${colors.reset}\n`);
    
    // Process each test query
    for (const query of queries) {
      console.log(`${colors.bright}${colors.yellow}Query: "${query}"${colors.reset}`);
      
      try {
        const response = await axios.post('http://localhost:27452', {
          jsonrpc: '2.0',
          id: 2,
          method: 'getContext',
          params: {
            query: { text: query }
          }
        });
        
        const results = response.data.result.items;
        
        if (results && results.length > 0) {
          console.log(`${colors.green}Found ${results.length} results${colors.reset}\n`);
          
          // Display results with relevance scores
          results.forEach((result, index) => {
            console.log(`${colors.bright}${index + 1}. ${result.title}${colors.reset}`);
            
            if (showScoreArg && result.metadata && result.metadata.relevanceScore !== null) {
              const score = result.metadata.relevanceScore;
              let scoreColor = colors.red;
              if (score >= 0.8) scoreColor = colors.green;
              else if (score >= 0.6) scoreColor = colors.yellow;
              
              console.log(`   ${colors.dim}Relevance Score:${colors.reset} ${scoreColor}${score.toFixed(4)}${colors.reset}`);
            }
            
            if (showSummaryArg && result.metadata && result.metadata.summary) {
              console.log(`   ${colors.dim}Summary:${colors.reset} ${colors.cyan}${result.metadata.summary}${colors.reset}`);
            }
            
            // Show snippet of content
            const snippet = result.text.length > 150 ? 
              result.text.substring(0, 150) + '...' : 
              result.text;
            
            console.log(`   ${colors.dim}Content:${colors.reset} ${snippet}`);
            console.log();
          });
        } else {
          console.log(`${colors.red}No results found${colors.reset}\n`);
        }
      } catch (error) {
        console.error(`${colors.red}Error processing query "${query}":${colors.reset}`, error.message);
      }
    }
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error.message);
  } finally {
    // Shutdown server
    server.kill();
    process.exit(0);
  }
}, 2000);

// Handle server output for debugging
server.stdout.on('data', (data) => {
  const output = data.toString().trim();
  if (output.includes('error') || output.includes('Error')) {
    console.error(`${colors.red}Server:${colors.reset} ${output}`);
  } else if (output.includes('AI') || output.includes('relevance') || output.includes('mock')) {
    console.log(`${colors.magenta}Server:${colors.reset} ${output}`);
  }
});

// Handle server exit
server.on('close', (code) => {
  if (code !== 0) {
    console.error(`${colors.red}Server process exited with code ${code}${colors.reset}`);
  }
});

// Handle process termination
process.on('SIGINT', () => {
  server.kill();
  process.exit(0);
});

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
