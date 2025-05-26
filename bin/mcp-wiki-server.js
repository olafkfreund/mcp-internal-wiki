#!/usr/bin/env node

/**
 * MCP Wiki Server Runner
 * This is used when the package is installed globally or run via npx
 */

const fs = require('fs');
const path = require('path');

// Helper function for colored output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

// Print welcome message
console.log(`${colors.bright}${colors.blue}MCP Internal Wiki Server${colors.reset}`);
console.log(`Model Context Protocol server for wiki content\n`);

// Check for mcp.config.json in the current directory
const localConfigPath = path.join(process.cwd(), 'mcp.config.json');
const packageConfigPath = path.join(__dirname, '..', 'mcp.config.json');

if (!fs.existsSync(localConfigPath)) {
  console.log(`${colors.yellow}No local configuration found at ${localConfigPath}${colors.reset}`);
  console.log(`Creating a default configuration file...\n`);
  
  // Create a default config if none exists
  const defaultConfig = {
    wikiUrls: [
      // Default example wiki URLs
      "https://wiki.example.com", 
      "https://docs.example.org"
    ]
  };
  
  fs.writeFileSync(localConfigPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
  console.log(`${colors.green}Created default configuration file at ${localConfigPath}${colors.reset}`);
  console.log(`Please edit this file to add your wiki URLs.\n`);
}

try {
  // Use require to load the server module
  console.log(`${colors.bright}Starting MCP Wiki Server...${colors.reset}`);
  require('../dist/server.js');
} catch (error) {
  console.error(`${colors.red}Error starting MCP Wiki Server:${colors.reset}`, error.message);
  console.error(`Make sure you have built the project with "npm run build".`);
  process.exit(1);
}
