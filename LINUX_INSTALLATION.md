# MCP Internal Wiki Server Installation Guide for Linux

This guide explains how to install the MCP Internal Wiki Server on various Linux distributions.

## Option A: Installation via npm

The MCP Wiki Server can be installed globally using npm:

```bash
# Install globally
npm install -g mcp-internal-wiki

# Run the server
mcp-wiki-server
```

This will create a default configuration file in your current directory if one doesn't exist.

### Configuration

After installation, edit the `mcp.config.json` file in your working directory to include your wiki URLs:

```json
{
  "wikiUrls": [
    "https://your-wiki-url.com",
    "https://another-wiki-url.com"
  ]
}
```

## Option B: Using npx (No Installation)

You can run the MCP Wiki Server without installation using npx:

```bash
npx mcp-internal-wiki
```

This will also create a default configuration file if one doesn't exist.

## VS Code Integration

After installing the server, you need to configure VS Code to use it:

### Automatic Setup

Run this command in your project directory:

```bash
# Create VS Code settings for the current project
echo '{
  "mcp": {
    "servers": {
      "WikiMCP": {
        "type": "stdio",
        "command": "mcp-wiki-server"
      }
    }
  }
}' > .vscode/settings.json
```

### Manual VS Code Setup

1. Install the [Copilot MCP Extension](https://marketplace.visualstudio.com/items?itemName=automatalabs.copilot-mcp)
2. Create or edit `.vscode/settings.json` with:

```json
{
  "mcp": {
    "servers": {
      "WikiMCP": {
        "type": "stdio",
        "command": "mcp-wiki-server"
      }
    }
  }
}
```

## Testing the Installation

To verify that the installation works:

```bash
# Test with a simple query
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | mcp-wiki-server
```

You should see a JSON response with the server capabilities.

## Running as a System Service

For convenience, you can run the MCP Wiki Server as a systemd service:

1. Install the package globally:
   ```bash
   sudo npm install -g mcp-internal-wiki
   ```

2. Create configuration directory:
   ```bash
   sudo mkdir -p /etc/mcp-internal-wiki
   sudo bash -c 'echo '\''{
     "wikiUrls": [
       "https://your-wiki-url.com",
       "https://another-wiki-url.com"
     ]
   }'\'' > /etc/mcp-internal-wiki/mcp.config.json'
   ```

3. Copy the systemd service file:
   ```bash
   # If installed from the cloned repository:
   sudo cp mcp-internal-wiki.service /etc/systemd/system/
   
   # Or create it manually:
   sudo bash -c 'cat > /etc/systemd/system/mcp-internal-wiki.service << EOF
   [Unit]
   Description=MCP Internal Wiki Server
   After=network.target

   [Service]
   ExecStart=/usr/bin/node /usr/lib/node_modules/mcp-internal-wiki/bin/mcp-wiki-server.js
   Restart=on-failure
   User=nobody
   Group=nobody
   Environment=NODE_ENV=production
   WorkingDirectory=/etc/mcp-internal-wiki

   [Install]
   WantedBy=multi-user.target
   EOF'
   ```

4. Enable and start the service:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable mcp-internal-wiki
   sudo systemctl start mcp-internal-wiki
   ```

5. Check the status:
   ```bash
   sudo systemctl status mcp-internal-wiki
   ```

## Troubleshooting

If you encounter issues:

1. Check that the configuration file exists and has valid wiki URLs
2. Ensure you have a working internet connection to access the wiki sources
3. Verify that the MCP extension is installed in VS Code
4. Check for any error messages in the terminal when running the server
5. For systemd service issues, check the logs with `journalctl -u mcp-internal-wiki`
