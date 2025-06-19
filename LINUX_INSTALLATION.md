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

After installing the server, configure VS Code:

1. Install the Copilot MCP Extension from the VS Code Marketplace.
2. Create or edit `.vscode/mcp.json` with:

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

- For global install, use `"command": "mcp-wiki-server"`.
- For npx, use `"command": "npx", "args": ["mcp-internal-wiki"]`.

3. Restart VS Code to apply the configuration.
4. Test by opening a markdown file and typing a query related to your wiki content.
5. For troubleshooting, see `TESTING_VS_CODE.md` and `VSCODE_QUICK_REFERENCE.md`.

## Testing the Installation

To verify that the installation works:

```bash
# Test with a simple query
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | mcp-wiki-server
```

You should see a JSON response with the server capabilities.

### Running Test Scripts

The MCP Internal Wiki Server includes a comprehensive test suite in the `tests/` directory:

```bash
# Clone the repository if you want to run the test scripts
git clone https://github.com/yourusername/mcp-internal-wiki.git
cd mcp-internal-wiki

# Run simple test
node tests/simple-test.js

# Run query test
node tests/query-test.js

# Run content fetching test
node tests/content-fetch-test.js

# Run JSON parsing test
node tests/test-json-parsing.js

# Run AI relevance test (requires API key)
node tests/ai-relevance-test.js

# Run performance tests
node tests/test-cache-performance.js
```

You can also use the justfile commands if you have `just` installed:

```bash
# Install just if you don't have it
# On Debian/Ubuntu
apt install just

# On other distributions
cargo install just

# Run simple test
just test-simple

# Run all tests
just test-all
```

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

## Performance Optimization

The MCP Internal Wiki Server includes a comprehensive performance optimization system:

### Multi-Level Caching

The server implements an intelligent cache management system that allocates:
- 60% for content caching
- 30% for metadata caching
- 10% for query result caching

### Full-Text Search Indexing

Provides real-time search capabilities with fuzzy matching and background index rebuilding.

### Priority-Based Job Processing

The server uses a configurable job queue with automatic retries for background tasks.

### HTTP Connection Pool

For efficient connection management with built-in health monitoring.

You can monitor performance metrics in real-time and configure the performance settings in the `config/performance.config.json` file:

```bash
# Create a performance configuration file
mkdir -p config
cat > config/performance.config.json << EOF
{
  "cache": {
    "contentAllocation": 60,
    "metadataAllocation": 30,
    "queryAllocation": 10
  },
  "indexing": {
    "rebuildInterval": 3600,
    "fuzzyMatchThreshold": 0.8
  },
  "batch": {
    "maxConcurrent": 5,
    "retryLimit": 3
  },
  "connections": {
    "poolSize": 10,
    "timeout": 5000
  }
}
EOF
```

## Agent Architecture

As of May 2025, the MCP Internal Wiki Server uses a modular agent-based architecture:

### WikiContentAgent

Responsible for fetching and filtering wiki content for queries, with intelligent caching.

### AIRelevanceAgent

Scores content relevance using AI providers, enabling more accurate search results.

### WikiIndexAgent

Manages building and rebuilding the wiki search index for optimal performance.

These agents work together to provide an intelligent, high-performance wiki search and retrieval system. You can configure agent behavior in the `mcp.config.json`:

```bash
# Add agent configuration to your existing mcp.config.json
cat > mcp.config.json << EOF
{
  "wikiUrls": [
    "https://your-wiki-url.com",
    "https://another-wiki-url.com"
  ],
  "agents": {
    "wikiContent": {
      "enabled": true,
      "fetchConcurrency": 3
    },
    "aiRelevance": {
      "enabled": true,
      "provider": "default",
      "threshold": 0.7
    },
    "wikiIndex": {
      "enabled": true,
      "rebuildFrequency": "daily"
    }
  }
}
EOF
```

## Using the POC Environment

The MCP Internal Wiki Server includes a proof-of-concept environment for testing authenticated wikis:

### Setup and Testing

```bash
# Clone the repository
git clone https://github.com/yourusername/mcp-internal-wiki.git
cd mcp-internal-wiki

# Build the POC Docker images
just docker-poc-build

# Start the POC containers
just docker-poc-up

# Run all POC tests
just test-poc-all

# Or run specific POC tests
just test-poc-json
just test-auth-poc
just test-poc-interactive

# Stop POC containers when done
just docker-poc-down
```

### POC Test Menu

For an interactive testing experience:

```bash
# Run POC test menu
just test-poc-menu
```

This provides an interactive menu system for testing various aspects of the authenticated wiki POC.

## Multi-Environment Development Requirements

When developing for the MCP Internal Wiki Server, all changes must be integrated into ALL development environments:

### 1. Standard npm/Node.js Environment

Ensure changes work in the standard Node.js environment:

```bash
# Test with npm scripts
npm run build
npm run test
npm run test:all
```

### 2. Justfile Commands

All features should have corresponding justfile commands:

```bash
# View available justfile commands
just --list

# Example: Add a new test script
# In justfile:
# test-new-feature:
#     node tests/test-new-feature.js
```

### 3. Docker POC Environment

Test changes with authentication scenarios:

```bash
# Test with Docker POC
just docker-poc-build
just docker-poc-up
just test-poc-all
just docker-poc-down
```

### 4. Nix Development Environment

If you have Nix installed:

```bash
# Test with Nix
just nix-build
just nix-test
```

Failure to update all environments may result in inconsistent behavior across different development setups.
