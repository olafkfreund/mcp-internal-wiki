# MCP Private Wiki Authentication POC

This Proof of Concept (POC) demonstrates the MCP server's ability to authenticate with private wikis. 
The setup includes:

1. A Docker container running the MCP server
2. A Docker container running a simple Markdown server with basic authentication
3. Authentication between the servers
4. Robust testing tools with retry logic and comprehensive error handling

## Components

### Markdown Server

The Markdown server is a simple Express.js application that:
- Serves Markdown files with AWS server documentation (100 servers)
- Requires Basic Authentication (username: `admin`, password: `secret`)
- Exposes an API for accessing the documentation

### MCP Server

The MCP server is configured to:
- Connect to the Markdown server
- Use Basic Authentication to access the protected content
- Provide the wiki content through its MCP protocol interface

## Getting Started

### Prerequisites

- Docker and Docker Compose installed
- Git (to clone the repository)
- Node.js (for running the test scripts)

### Running the POC

1. Navigate to the POC directory:

```bash
cd poc-private-wiki
```

2. Run the restart script to build and start everything:

```bash
./restart.sh
```

Alternatively, you can use the npm scripts:

```bash
# Install dependencies
npm install

# Build and start containers
npm run build
npm run start:detach
```

3. Once the containers are running, you can test the setup:

- MCP Server: http://localhost:3000 
- Markdown Server: http://localhost:3001 (requires authentication)

### Testing Authentication

We've provided multiple ways to test that authentication is working correctly:

1. **Complete Test Suite**: Run all tests in sequence with a summary report:

```bash
npm run test:all
```

2. **Menu-Driven Test Runner**: Run the interactive menu with all available test options:

```bash
npm run menu
```

3. **Automated Tests**: Run the automated test script that verifies both direct authentication and MCP-managed authentication:

```bash
# Standard test with result summary
npm test

# Verbose test with detailed request debugging
npm run test:verbose

# Integration tests for authentication 
npm run test:integration
```

3. **Interactive Test Client**: Use the interactive client to explore the wiki content through the authenticated MCP server:

```bash
# Start interactive client
npm run interactive

# Quick test with a predefined query
npm run quicktest
```

4. **Container Health Monitor**: Check the health and connectivity of containers:

```bash
npm run monitor
```

5. **Test Improvements**: We've enhanced the test scripts with:

- Retry logic with exponential backoff
- Dynamic service readiness detection
- Improved error handling and reporting
- Comprehensive test results summary

See [TEST-IMPROVEMENTS.md](./TEST-IMPROVEMENTS.md) and [TOOLS.md](./TOOLS.md) for details.

3. **Direct Access Test**:
   - Open a browser and navigate to http://localhost:3001
   - You should be prompted for authentication
   - Enter username: `admin` and password: `secret`
   - The API should respond with information about available endpoints

4. **Manual API Testing**:
   
```bash
# Test direct access to wiki with authentication
curl -u admin:secret http://localhost:3001/aws-servers

# Test MCP server access (which handles authentication for you)
curl -X POST -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":"1","method":"getContext","params":{"query":{"text":"aws server"}}}' \
     http://localhost:3000
```

## Authentication Configuration

Authentication is configured in the `mcp-server/mcp.config.json` file:

```json
{
  "auth": [
    {
      "urlPattern": "^http://markdown-server:3001",
      "type": "basic",
      "username": "admin",
      "password": "secret"
    }
  ]
}
```

## Available Authentication Types

The MCP server supports the following authentication types:

- **Basic Authentication**: Username and password
- **Token Authentication**: Bearer token
- **Custom Header**: Any custom header name and value
- **OAuth**: OAuth 2.0 (configured but not fully implemented in this POC)

For detailed information on authentication implementation, testing, and security considerations, see [AUTHENTICATION.md](./AUTHENTICATION.md).

## Extensions

This POC can be extended in several ways:

1. Add more authentication methods (OAuth, API keys)
2. Integrate with real wiki systems (Confluence, SharePoint)
3. Add a proxying layer for security
4. Implement token refresh mechanisms for OAuth

## Troubleshooting

- If the MCP server can't connect to the Markdown server, check that both containers are running:
  ```bash
  docker-compose ps
  ```

- To view logs:
  ```bash
  docker-compose logs mcp-server
  docker-compose logs markdown-server
  ```

- To restart the services:
  ```bash
  docker-compose restart
  ```

## Clean Up

To stop and remove the containers:

```bash
docker-compose down
```
