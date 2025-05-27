# MCP Private Wiki Authentication 

## Authentication Model

The MCP server supports multiple authentication methods for accessing private wikis. This document describes the authentication model, implementation details, and testing infrastructure.

## Authentication Types

### 1. Basic Authentication

Basic Authentication is the simplest form of HTTP authentication. It includes a username and password in the HTTP header.

**Implementation:**
```javascript
// MCP server sending Basic Auth credentials
const credentials = Buffer.from(`${username}:${password}`).toString('base64');
config.headers['Authorization'] = `Basic ${credentials}`;
```

**Configuration:**
```json
{
  "urlPattern": "^http://markdown-server:3001",
  "type": "basic",
  "username": "admin",
  "password": "secret"
}
```

### 2. Token Authentication

Token Authentication uses bearer tokens instead of username/password. This is more secure for production environments.

**Implementation:**
```javascript
// MCP server sending Bearer token
config.headers['Authorization'] = `Bearer ${token}`;
```

**Configuration:**
```json
{
  "urlPattern": "^https://api\\.example\\.com",
  "type": "token",
  "token": "your-token-here"
}
```

### 3. Custom Header Authentication

Some wikis may require custom headers for authentication.

**Implementation:**
```javascript
// MCP server sending custom header
config.headers[headerName] = headerValue;
```

**Configuration:**
```json
{
  "urlPattern": "^https://custom\\.example\\.com",
  "type": "header",
  "headerName": "X-API-Key",
  "headerValue": "your-api-key"
}
```

## Authentication Flow

1. The client sends a query to the MCP server
2. MCP server looks up the wiki URL in its configuration
3. MCP server applies the appropriate authentication method
4. MCP server makes an authenticated request to the wiki
5. MCP server returns the content to the client

```
Client → MCP Server → [Auth Layer] → Private Wiki → Content
   ↑                                                  |
   └--------------------------------------------------┘
```

## URL Pattern Matching

The MCP server uses regular expressions to match URLs and apply the correct authentication method:

```javascript
function getAuthConfigForUrl(url) {
  if (!config.auth) return null;
  
  for (const authConfig of config.auth) {
    if (new RegExp(authConfig.urlPattern).test(url)) {
      return authConfig;
    }
  }
  
  return null;
}
```

## Testing Infrastructure

### 1. Basic Authentication Test

Validates that the basic authentication mechanism works correctly.

**Test Coverage:**
- Direct access without authentication (should fail)
- Direct access with correct authentication (should succeed)
- MCP server accessing the wiki with authentication (should succeed)

### 2. Integration Test

Tests the full authentication flow from MCP server to the private wiki.

**Test Coverage:**
- MCP configuration validation
- Different authentication methods
- Error handling
- Network connectivity

### 3. Interactive Testing

Provides an interactive way to test authentication with manual queries.

**Test Coverage:**
- User-defined queries
- Query processing
- Response formatting
- Error handling

### 4. Container Monitoring

Monitors the health and connectivity of Docker containers.

**Test Coverage:**
- Container status
- Health checks
- Network connectivity
- Service readiness

## Security Considerations

1. **Credential Storage**: In a production environment, credentials should be stored securely (e.g., environment variables, secret management systems)
2. **HTTPS**: All communication should be encrypted with HTTPS
3. **Token Rotation**: Bearer tokens should be rotated regularly
4. **Request Logging**: Avoid logging sensitive authentication information

## Extending the Authentication Model

The authentication model can be extended to support:

1. **OAuth 2.0**: For more complex authentication flows
2. **Certificate-based Authentication**: For high-security environments
3. **API Keys**: For simpler third-party integrations
4. **Multi-factor Authentication**: For enhanced security

## Implementation Recommendations

1. **Use HTTPS**: Always use encrypted connections for production
2. **Environment Variables**: Store credentials as environment variables
3. **Error Handling**: Implement proper error handling for auth failures
4. **Logging**: Add detailed logging for troubleshooting auth issues
5. **Retry Mechanism**: Implement retry logic for transient auth failures

## Testing Tools

Several tools are provided to test and validate authentication:

1. **Menu-driven Test Runner**: `npm run menu`
2. **Container Health Monitor**: `npm run monitor`
3. **Integration Tests**: `npm run test:integration`
4. **Basic Auth Tests**: `npm test`
5. **Verbose Tests**: `npm run test:verbose`
6. **Interactive Client**: `npm run interactive`
7. **Quick Test**: `npm run quicktest`
