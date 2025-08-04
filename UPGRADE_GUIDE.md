# MCP Internal Wiki - Upgrade Guide to v2.0

This guide helps you upgrade from the legacy MCP server implementation to the modern v2.0 architecture using the official MCP SDK.

## Overview of Changes

### 🔄 Major Improvements
- **Official MCP SDK Integration**: Using `@modelcontextprotocol/sdk` instead of manual JSON-RPC handling
- **Enhanced Security**: Proper input validation, path traversal protection, and configuration sanitization
- **Modern Caching**: LRU cache with TTL support instead of basic timestamp-based caching
- **Health Monitoring**: Built-in health checks and performance metrics
- **Resource-Based Architecture**: Proper MCP resources for server status and configuration
- **Comprehensive Testing**: Jest-based test suite with mock support

### 🛡️ Security Fixes
- Removed hardcoded file paths
- Added input validation for all tool parameters
- Implemented secure configuration loading with path normalization
- Added sanitization for sensitive data in API responses

## Migration Steps

### 1. Install New Dependencies

```bash
npm install @modelcontextprotocol/sdk@^0.6.0 joi@^17.11.0 lru-cache@^10.1.0
npm uninstall express @types/express @types/supertest supertest
```

### 2. Update Configuration

Your existing `mcp.config.json` will be automatically validated. The new version supports additional configuration options:

```json
{
  "wikiUrls": [
    "https://your-wiki.example.com"
  ],
  "cacheTimeoutMinutes": 30,
  "auth": [
    {
      "urlPattern": "example\\.com",
      "type": "basic",
      "username": "user",
      "password": "pass"
    }
  ],
  "performance": {
    "cache": {
      "maxSize": 500,
      "ttl": 1800000,
      "maxItems": 10000
    }
  }
}
```

### 3. Update VS Code Configuration

Update your `.vscode/mcp.json` to use the modern server:

```json
{
  "servers": {
    "mcp-internal-wiki": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/dist/server-modern.js"],
      "env": {
        "MCP_CONFIG_PATH": "${workspaceFolder}/mcp.config.json"
      }
    }
  }
}
```

### 4. Test the Migration

Run the test suite to ensure everything works:

```bash
npm run build
npm run test:modern
npm run start:modern
```

## New Features

### Health Monitoring

Access server health information through the new resource:

```bash
# Get basic health status
curl -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"resources/read","params":{"uri":"wiki://health"}}' \
  http://localhost:3000
```

### Enhanced Tools

New tools available in v2.0:

- `health_check`: Check server and data source health
- Enhanced `search_wiki` with result limits and input validation
- All offline tools with improved error handling

### Resource Management

Access server information through MCP resources:

- `wiki://health`: Server health status
- `wiki://config`: Sanitized server configuration
- `wiki://sources`: Wiki sources status and statistics

## Breaking Changes

### Removed Features
- Express.js HTTP server (replaced with pure MCP stdio transport)
- Manual JSON-RPC handling
- Basic timestamp-based caching

### Changed APIs
- All tool responses now use proper MCP content format
- Error responses include structured error information
- Configuration validation is now mandatory

### File Structure Changes
```
src/
├── config/validation.ts        # New: Configuration management
├── monitoring/health.ts        # New: Health monitoring
├── server-modern.ts           # New: Modern MCP server
├── tests/mcp-server.test.ts   # New: Comprehensive tests
└── sources/wikiSource.ts      # Updated: Uses modern config
```

## Rollback Plan

If you need to rollback to the legacy version:

1. Keep the original files as backup
2. Restore original `package.json` dependencies
3. Use `npm run start` instead of `npm run start:modern`

## Performance Improvements

### Before (v1.0)
- Basic object-based caching
- No cache eviction strategy
- Manual error handling
- No health monitoring

### After (v2.0)
- LRU cache with TTL
- Automatic cache eviction
- Structured error handling
- Built-in health metrics
- Input validation
- Security hardening

## Testing

Run the comprehensive test suite:

```bash
# Run all tests
npm test

# Run modern server tests only
npm run test:modern

# Run with coverage
npm test -- --coverage
```

## Support

If you encounter issues during migration:

1. Check the console logs for detailed error messages
2. Verify your configuration with the new validation system
3. Run the health check tool to diagnose issues
4. Review the test results for configuration problems

## Example Migration

### Before (Legacy server.ts):
```typescript
// Manual JSON-RPC handling
handleRequest(req: MCPRequest, send: (resp: MCPResponse) => void) {
  switch (req.method) {
    case 'search_wiki':
      // Manual implementation
  }
}
```

### After (Modern server-modern.ts):
```typescript
// Official MCP SDK
this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  // Proper MCP response format with validation
});
```

This migration provides better reliability, security, and maintainability for your MCP Internal Wiki server.