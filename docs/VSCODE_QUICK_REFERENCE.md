# VS Code MCP Quick Reference

## 🚀 Quick Setup

1. **Install Extension**: [Copilot MCP Extension](https://marketplace.visualstudio.com/items?itemName=automatalabs.copilot-mcp)

2. **Create Config File**: `.vscode/mcp.json`

   ```jsonc
   {
     "servers": {
       "my-mcp-wiki-server": {
         "type": "stdio",
         "command": "node",
         "args": ["${workspaceFolder}/dist/server.js"],
         "env": {
           "MCP_CONFIG_PATH": "${workspaceFolder}/mcp.config.json"
         }
       }
     }
   }
   ```

3. **Restart VS Code**: Reload window to apply changes

## ⚡ Alternative Configurations

### Global Installation

```jsonc
{
  "servers": {
    "my-mcp-wiki-server": {
      "type": "stdio",
      "command": "mcp-wiki-server",
      "env": {
        "MCP_CONFIG_PATH": "${workspaceFolder}/mcp.config.json"
      }
    }
  }
}
```

### NPX (No Installation)

```jsonc
{
  "servers": {
    "my-mcp-wiki-server": {
      "type": "stdio", 
      "command": "npx",
      "args": ["mcp-internal-wiki"],
      "env": {
        "MCP_CONFIG_PATH": "${workspaceFolder}/mcp.config.json"
      }
    }
  }
}
```

## 🔧 Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `MCP_CONFIG_PATH` | Config file location | `${workspaceFolder}/mcp.config.json` |
| `NODE_ENV` | Environment mode | `development`, `production` |
| `LOG_LEVEL` | Logging verbosity | `debug`, `info`, `warn`, `error` |

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Server not starting | Check command path in `.vscode/mcp.json` |
| Config not found | Verify `MCP_CONFIG_PATH` is correct |
| No wiki content | Check `mcp.config.json` has valid URLs |
| Permission errors | Ensure VS Code can access workspace files |

## 📖 Available Tools

When properly configured, you can use these MCP tools in VS Code:

- **`search_wiki`**: Search across all configured wiki sources
- **`list_wiki_sources`**: View available wiki sources and their status
- **MCP Resources**: Access wiki content as contextual resources

## 💡 Pro Tips

1. **Use environment variables** for config paths to make configurations portable
2. **Enable debug logging** (`LOG_LEVEL=debug`) when troubleshooting
3. **Check VS Code Output Panel** (MCP channel) for server logs
4. **Restart VS Code window** after config changes
5. **Use absolute paths** in config files when possible
