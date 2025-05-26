# Complete MCP Wiki Server Setup Guide

This guide provides all the steps needed to set up, install, and test the MCP Wiki Server with VS Code.

> **Note:** For detailed installation instructions for specific platforms, see:
> - [Linux Installation Guide](LINUX_INSTALLATION.md)
> - [NixOS Installation Guide](NIXOS_INSTALLATION.md)

## 1. Installation

### Option A: Standard Node.js

Clone the repository and install dependencies:

```bash
git clone https://github.com/yourusername/mcp-internal-wiki.git
cd mcp-internal-wiki
npm install
```

### Option B: Using Nix (Recommended)

If you have Nix installed, you can use it to ensure consistent dependencies:

```bash
git clone https://github.com/yourusername/mcp-internal-wiki.git
cd mcp-internal-wiki
nix develop  # Enter the development environment
# Or
just nix-shell
```

## 2. Configure Wiki Sources

Edit `mcp.config.json` to include your wiki URLs:

```json
{
  "wikiUrls": [
    "https://your-wiki-url.com",
    "https://another-wiki-url.com"
  ]
}
```

## 3. Build the Project

### Standard Build

```bash
npm run build
```

### Nix Build

```bash
nix build
# Or
just nix-build
```

## 4. Set up VS Code Integration

### Option A: Automatic Setup

Run the setup script:

```bash
npm run setup:vscode
```

### Option B: Manual Setup

Create `.vscode/settings.json` with:

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

## 5. Install the MCP Extension

Install the [Copilot MCP Extension](https://marketplace.visualstudio.com/items?itemName=automatalabs.copilot-mcp) in VS Code.

## 6. Testing the MCP Server

### Simple Test (Command Line)

```bash
npm run test:simple
```

### Interactive Test (Command Line)

```bash
npm run test:interactive
```

### VS Code Testing

1. Open VS Code in the project directory
2. Restart VS Code or reload the window
3. Create a new markdown file (e.g., `test.md`)
4. Start typing a query related to your wiki content
5. The MCP extension should show suggestions from your wiki sources

## 7. Troubleshooting

If you encounter issues:

1. Check that the MCP server builds without errors
2. Verify the VS Code settings are correct
3. Ensure the MCP extension is installed and enabled
4. Check the VS Code output panel for error messages
5. Try the command line tests to verify the server is working

## 8. Using as an NPX Package

Once published, you can use the MCP server globally:

```bash
npx mcp-internal-wiki
```

And configure VS Code to use the global installation.
