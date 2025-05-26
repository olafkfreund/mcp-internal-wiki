#!/usr/bin/env node

// MCP Wiki Server runner
// This is used when the package is installed globally or run via npx

try {
  // Use require to load the server module
  require('../dist/server.js');
} catch (error) {
  console.error('Error starting MCP Wiki Server:', error.message);
  console.error('Make sure you have built the project with "npm run build".');
  process.exit(1);
}
