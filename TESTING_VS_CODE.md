# Testing MCP Wiki in VS Code

This guide provides step-by-step instructions to test the MCP Wiki server with VS Code using the correct `.vscode/mcp.json` configuration.

## Setup

1. **Build the project**:

   ```bash
   npm run build
   ```

2. **Verify the VS Code MCP configuration**:

   ```bash
   cat .vscode/mcp.json
   ```

   It should contain the MCP server configuration similar to:

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

3. **Install the MCP extension in VS Code**:
   - Open VS Code
   - Go to Extensions (Ctrl+Shift+X)
   - Search for "Copilot MCP"
   - Install the "Copilot MCP" extension by AutoMata Labs

## Test Procedure

1. Open VS Code in this project directory

   ```bash
   code .
   ```

2. Reload VS Code window
   - Press `Ctrl+Shift+P`
   - Type "reload" and select "Developer: Reload Window"

3. Open the test file

   ```bash
   code tests/test-mcp.md
   ```

4. Try entering a query related to your wiki content
   For example:
   - "How to configure NixOS?"
   - "DevOps pipeline examples"

5. The MCP extension should provide completions or contextual information from your wiki sources

## Alternative Test Methods

If you prefer to test from the command line:

1. Simple automated test:

   ```bash
   npm run test:simple
   ```

2. Interactive test client:

   ```bash
   npm run test:interactive
   ```

   This allows you to send various commands to the MCP server:
   - `init` - Initialize
   - `sources` - List sources
   - `query <text>` - Make a context query
   - `help` - Show commands
   - `exit` - Quit

## Troubleshooting

If MCP integration is not working:

1. Check VS Code output panel (Ctrl+Shift+U) and select "MCP"
2. Verify that the server is running
3. Re-run the setup:

   ```bash
   npm run setup:vscode
   ```

4. Rebuild the project:

   ```bash
   npm run build
   ```

5. Restart VS Code

## Common Issues

- **Server not found**: Check settings.json path is correct
- **No completions**: Make sure wiki sources are configured in mcp.config.json
- **Type errors**: Rebuild the project with `npm run build`
