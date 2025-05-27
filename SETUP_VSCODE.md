# MCP Wiki Server - VS Code Integration Guide

This guide will help you set up and test the MCP Wiki Server with Visual Studio Code using the correct `.vscode/mcp.json` configuration.

## Prerequisites

- VS Code installed
- [Copilot MCP Extension](https://marketplace.visualstudio.com/items?itemName=automatalabs.copilot-mcp) installed

## Setup Steps

### 1. Configure VS Code MCP Server

Create a `.vscode/mcp.json` file in your workspace root with the following configuration:

```jsonc
// .vscode/mcp.json
{
  "servers": {
    "my-mcp-wiki-server": {
      "type": "stdio",
      "command": "node",
      "args": [
        "${workspaceFolder}/dist/server.js"
      ],
      "env": {
        "MCP_CONFIG_PATH": "${workspaceFolder}/mcp.config.json"
      }
    }
  }
}
```

**Alternative configurations:**

For global installation:
```jsonc
// .vscode/mcp.json
{
  "servers": {
    "my-mcp-wiki-server": {
      "type": "stdio",
      "command": "mcp-wiki-server"
    }
  }
}
```

For npx usage:
```jsonc
// .vscode/mcp.json
{
  "servers": {
    "my-mcp-wiki-server": {
      "type": "stdio",
      "command": "npx",
      "args": ["mcp-internal-wiki"]
    }
  }
}
```

**Important Notes:**
- Use `.vscode/mcp.json` (not `.vscode/settings.json`)
- The `env` section with `MCP_CONFIG_PATH` tells the server where to find your configuration
- Server name can be any unique identifier (e.g., `my-mcp-wiki-server`)

### 2. Configure Wiki Sources

Edit the `mcp.config.json` file in the root of your project with your wiki URLs:

```json
{
  "wikiUrls": [
    "https://your-wiki-url.com",
    "https://another-wiki-url.com"
  ],
  "cacheTimeoutMinutes": 30
}
```

### 3. Build and Test

### Option A: Standard Build

1. Build the project:

```sh
npm run build
```

### Option B: Using Nix (Recommended)

1. Build with Nix (ensures all dependencies are properly managed):

```sh
nix build
# Or using just
just nix-build
```

2. Or enter the development environment:

```sh
nix develop
# Or using just
just nix-shell
```

3. Restart VS Code or reload the window

4. Test the MCP integration:
   - Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on macOS)
   - Type `MCP: List Sources` to verify the server is connected
   - Create a new markdown file and type a query relevant to your wiki content

## Troubleshooting

If you encounter issues:

1. Check VS Code Console (Help > Toggle Developer Tools) for error messages
2. Verify the MCP server build is up to date
3. Test the server separately using:

```sh
npm run test:client
```

4. Check that the wiki URLs in `mcp.config.json` are accessible

## Advanced Configuration

For more advanced usage, you can customize the Wiki source implementation in:

```
src/sources/wikiSource.ts
```

To support additional methods, extend the `MCPServer` class in:

```
src/mcpServer.ts
```
