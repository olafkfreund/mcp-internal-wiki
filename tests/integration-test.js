#!/usr/bin/env node

/**
 * MCP Wiki Server Integration Test
 * 
 * This script performs a comprehensive test of the MCP wiki server,
 * checking all components and functionality.
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readline = require('readline');
const { WikiContentAgent } = require('../dist/agents/WikiContentAgent');
const { AIRelevanceAgent } = require('../dist/agents/AIRelevanceAgent');
const { WikiIndexAgent } = require('../dist/agents/WikiIndexAgent');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ANSI colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

// Track test results
const results = {
  passed: 0,
  failed: 0,
  skipped: 0
};

async function runCommand(command, options = {}) {
  try {
    return execSync(command, { encoding: 'utf8', ...options });
  } catch (error) {
    console.error(`${colors.red}Command failed: ${command}${colors.reset}`);
    console.error(error.toString());
    return false;
  }
}

async function testStep(name, testFn) {
  process.stdout.write(`${colors.cyan}Testing ${name}...${colors.reset} `);
  try {
    const result = await testFn();
    if (result === 'skip') {
      console.log(`${colors.yellow}SKIPPED${colors.reset}`);
      results.skipped++;
      return false;
    } else if (result) {
      console.log(`${colors.green}PASSED${colors.reset}`);
      results.passed++;
      return true;
    } else {
      console.log(`${colors.red}FAILED${colors.reset}`);
      results.failed++;
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}ERROR${colors.reset}`);
    console.error(error);
    results.failed++;
    return false;
  }
}

async function testBuild() {
  try {
    const buildOutput = await runCommand('npm run build');
    return buildOutput && fs.existsSync('./dist/server.js');
  } catch (error) {
    console.error(error);
    return false;
  }
}

async function testVSCodeConfig() {
  try {
    // Create settings if they don't exist
    if (!fs.existsSync('./.vscode/settings.json')) {
      await runCommand('npm run setup:vscode');
    }
    
    // Verify settings
    const settingsContent = fs.readFileSync('./.vscode/settings.json', 'utf8');
    return settingsContent.includes('WikiMCP') && 
           settingsContent.includes('stdio') &&
           settingsContent.includes('server.js');
  } catch (error) {
    console.error(error);
    return false;
  }
}

async function testServerStart() {
  try {
    const server = spawn('node', ['dist/server.js'], {
      stdio: ['pipe', 'pipe', process.stderr]
    });
    
    await sleep(1000); // Give server time to start
    
    // Send initialize request
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {}
    };
    
    return new Promise((resolve) => {
      server.stdout.once('data', (data) => {
        try {
          const response = JSON.parse(data.toString());
          const success = response.result && 
                         response.result.capabilities && 
                         response.result.serverInfo;
          
          // Clean up
          server.kill();
          resolve(success);
        } catch (error) {
          console.error(error);
          server.kill();
          resolve(false);
        }
      });
      
      // Send the request
      server.stdin.write(JSON.stringify(initRequest) + '\n');
    });
  } catch (error) {
    console.error(error);
    return false;
  }
}

async function testWikiSourceConfig() {
  try {
    // Check if config file exists
    if (!fs.existsSync('./mcp.config.json')) {
      console.log(`\n${colors.yellow}Warning: mcp.config.json not found, creating example config${colors.reset}`);
      fs.writeFileSync('./mcp.config.json', JSON.stringify({
        wikiUrls: [
          "https://example-wiki.com/docs",
          "https://another-wiki.example.org"
        ]
      }, null, 2));
    }
    
    // Verify config
    const configContent = fs.readFileSync('./mcp.config.json', 'utf8');
    const config = JSON.parse(configContent);
    return config && Array.isArray(config.wikiUrls) && config.wikiUrls.length > 0;
  } catch (error) {
    console.error(error);
    return false;
  }
}

async function runIntegrationTest() {
  console.log(`${colors.bright}${colors.blue}🧪 MCP Wiki Server Integration Test${colors.reset}\n`);
  
  // 1. Build test
  const buildSuccess = await testStep('TypeScript build', testBuild);
  if (!buildSuccess) {
    console.log(`\n${colors.red}Build failed, cannot continue tests${colors.reset}`);
    return false;
  }
  
  // 2. Config test
  await testStep('Wiki configuration', testWikiSourceConfig);
  
  // 3. VS Code integration test
  await testStep('VS Code configuration', testVSCodeConfig);
  
  // 4. Server startup test
  await testStep('Server initialization', testServerStart);
  
  // 5. Check for MCP extension
  await testStep('MCP extension check', async () => {
    try {
      const extensions = await runCommand('code --list-extensions', { stdio: 'pipe' });
      if (!extensions) return 'skip';
      return extensions.includes('automatalabs.copilot-mcp') ? true : 'skip';
    } catch {
      return 'skip';
    }
  });
  
  // Summary
  console.log(`\n${colors.bright}${colors.blue}Test Summary:${colors.reset}`);
  console.log(`${colors.green}✓ Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}✗ Failed: ${results.failed}${colors.reset}`);
  console.log(`${colors.yellow}⚠ Skipped: ${results.skipped}${colors.reset}`);
  
  if (results.failed === 0) {
    console.log(`\n${colors.bright}${colors.green}✅ All tests passed! Your MCP Wiki Server is ready to use.${colors.reset}`);
    return true;
  } else {
    console.log(`\n${colors.bright}${colors.red}❌ Some tests failed. See details above.${colors.reset}`);
    return false;
  }
}

// Run the integration test
runIntegrationTest().catch(error => {
  console.error(`${colors.red}Integration test error:${colors.reset}`, error);
  process.exit(1);
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
