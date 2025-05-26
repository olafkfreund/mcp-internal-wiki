# MCP Internal Wiki Server (MCP/Context7-style)

This project is a Model Context Protocol (MCP) server using stdio and JSON-RPC, inspired by Context7's architecture. It allows you to reference content from multiple wiki sources directly in VS Code, Cursor, and other tools that support MCP.

## Features

- Access content from multiple wiki sources
- Quick reference to documentation and guides
- Supports various wiki formats (Markdown, MediaWiki, Gitbook, etc.)

## Setup & Usage

### 1. Installation

#### Option A: Local Installation

```sh
# Clone the repository
git clone https://github.com/yourusername/mcp-internal-wiki.git
cd mcp-internal-wiki

# Install dependencies
npm install

# Build the project
npm run build
```

#### Option B: Quick Install with npx (once published)

```sh
npx mcp-internal-wiki
```

### 2. Configure Wiki Sources

Edit the `mcp.config.json` file to include your wiki URLs:

```json
{
  "wikiUrls": [
    "https://your-first-wiki-url.com",
    "https://your-second-wiki-url.com"
  ]
}
```

### 3. VS Code Integration

1. Install the [Copilot MCP Extension](https://marketplace.visualstudio.com/items?itemName=automatalabs.copilot-mcp)
2. Configure VS Code to use the MCP server by adding to your `.vscode/settings.json`:

```json
{
  "mcp": {
    "servers": {
      "WikiMCP": {
        "type": "stdio",
        "command": "node",
        "args": ["${workspaceFolder}/dist/server.js"]
      }
    }
  }
}
```

3. Restart VS Code or reload the window

### 4. Testing the MCP Server

You can test the server with the official MCP Inspector:

```sh
npx -y @modelcontextprotocol/inspector node dist/server.js
```

## Architecture

- **Stdio/JSON-RPC**: Communicates over stdio, not HTTP.
- **MCPServer**: Handles JSON-RPC requests and method dispatch.
- **Sources**: Extensible source system (see `src/sources/wikiSource.ts`).

## Documentation

- [Complete Installation Guide](INSTALLATION.md)
- [VS Code Integration Guide](SETUP_VSCODE.md)
- [VS Code Testing Guide](TESTING_VS_CODE.md)
- [Nix Development Guide](NIX_DEVELOPMENT.md)
- [Project Plan](PROJECT_PLAN.md)

## Extending

- Add new sources in `src/sources/` and register them in `MCPServer`.
- Implement new MCP methods in `MCPServer` as needed.
- Support for various wiki formats including Markdown, MediaWiki, Gitbook, Confluence, and SharePoint

## Testing

### Node.js Testing

```sh
# Simple test
npm run test:simple

# Interactive test client
npm run test:interactive
```

### Nix Testing

```sh
# Simple test with Nix
nix run .#test
# or
just nix-test

# Interactive test with Nix
nix run .#interactive
# or
just nix-test-interactive
```

## Development with Nix

This project supports development using Nix for reproducible builds and dependencies:

```sh
# Enter development environment
nix develop
# or
just nix-shell

# Build with Nix
nix build
# or
just nix-build
```

See the [Nix Development Guide](NIX_DEVELOPMENT.md) for more details.

## License

MIT
