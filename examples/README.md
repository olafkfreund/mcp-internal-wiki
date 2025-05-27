# VS Code MCP Configuration Examples

This directory contains example configurations for integrating the MCP Wiki Server with VS Code.

## Quick Start

1. **Copy the example configuration**:
   ```bash
   cp examples/vscode-mcp-config.json .vscode/mcp.json
   ```

2. **Choose your configuration**:
   - For local development: Use the `mcp-wiki-local` server configuration
   - For global installation: Use the `mcp-wiki-global` server configuration  
   - For npx usage: Use the `mcp-wiki-npx` server configuration

3. **Update VS Code settings**:
   Edit `.vscode/mcp.json` to enable only the configuration you want to use:

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

## Configuration Options

### Environment Variables

- `MCP_CONFIG_PATH`: Path to your MCP configuration file (usually `mcp.config.json`)
- `NODE_ENV`: Environment mode (`development`, `production`)
- `LOG_LEVEL`: Logging level (`debug`, `info`, `warn`, `error`)

### Server Types

- **Local Development**: Best for development and testing
- **Global Installation**: Best for consistent team environments
- **NPX**: Best for trying the server without installation
- **Production**: Best for production deployments with optimized settings

## Troubleshooting

### Common Issues

1. **Server not starting**: Check that the command path is correct
2. **Config not found**: Verify `MCP_CONFIG_PATH` points to your config file
3. **Permission issues**: Ensure VS Code has access to the workspace folder

### Debug Mode

Enable debug logging by setting `LOG_LEVEL=debug` in the environment variables:

```jsonc
{
  "servers": {
    "my-mcp-wiki-server": {
      "type": "stdio",
      "command": "node", 
      "args": ["${workspaceFolder}/dist/server.js"],
      "env": {
        "MCP_CONFIG_PATH": "${workspaceFolder}/mcp.config.json",
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```
