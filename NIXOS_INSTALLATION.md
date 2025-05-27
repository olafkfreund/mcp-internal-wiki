# MCP Internal Wiki Server Installation Guide for NixOS

This guide explains how to install and use the MCP Internal Wiki Server on NixOS.

## Option A: Using the NixOS Module (Recommended)

If you have flakes enabled in your NixOS configuration, you can use the NixOS module provided with this flake:

```nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.05";
    mcp-wiki.url = "github:yourusername/mcp-internal-wiki";  # Replace with your repo URL
  };

  outputs = { self, nixpkgs, mcp-wiki, ... }: {
    nixosConfigurations.yourhostname = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";  # or your system architecture
      modules = [
        # Your existing configuration
        mcp-wiki.nixosModules.default  # Import the module
        
        # Configure the service
        ({ ... }: {
          services.mcp-internal-wiki = {
            enable = true;
            wikiUrls = [
              "https://wiki.nixos.org/wiki/NixOS_Wiki"
              "https://your-internal-wiki.example.com" 
            ];
          };
        })
      ];
    };
  };
}
```

## Option B: Using the Flake Directly

If you prefer to just install the package without enabling the service:

```nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.05";
    mcp-wiki.url = "github:yourusername/mcp-internal-wiki";  # Replace with your repo URL
  };

  outputs = { self, nixpkgs, mcp-wiki, ... }: {
    nixosConfigurations.yourhostname = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";  # or your system architecture
      modules = [
        # Your existing configuration
        ({ pkgs, ... }: {
          environment.systemPackages = [
            mcp-wiki.packages.x86_64-linux.default
          ];
        })
      ];
    };
  };
}
```

## Option B: Installing from the flake.nix in the Repository

Clone the repository and use the flake locally:

```bash
git clone https://github.com/yourusername/mcp-internal-wiki.git
cd mcp-internal-wiki

# Install the package in your profile
nix profile install .#default

# Or run it without installing
nix run .
```

## Option C: Installing from the Command Line

You can install the package with:

```bash
# For temporary usage
nix shell github:yourusername/mcp-internal-wiki

# To install it in your profile
nix profile install github:yourusername/mcp-internal-wiki
```

## Setting up the Configuration

Create a `mcp.config.json` file in your working directory:

```json
{
  "wikiUrls": [
    "https://your-wiki-url.com",
    "https://another-wiki-url.com"
  ]
}
```

## VS Code Integration on NixOS

When using VS Code on NixOS, you can set up the integration using:

```bash
# Create VS Code settings
mkdir -p .vscode
cat > .vscode/settings.json << 'EOF'
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
EOF
```

Alternatively, you can use the built-in setup script from the flake:

```bash
nix run .#setupvscode
```

## Testing the Installation on NixOS

You can test your installation with the built-in test scripts:

```bash
# Simple test
nix run .#test

# Interactive test
nix run .#interactive

# Search query test
nix run .#query

# Full test suite
nix run .#testall
```

Additional test scripts are available in the `tests/` directory of the repository:

```bash
# Enter development shell
nix develop

# Run specific test scripts
node tests/simple-test.js
node tests/test-json-parsing.js
node tests/test-cache-performance.js
node tests/ai-relevance-test.js

# Or use just commands
just test-simple
just test-json-parsing
just test-all
```

## Performance Optimization

The MCP Internal Wiki Server includes an enterprise-ready performance system:

### Multi-Level Caching

The server implements an intelligent cache management system with:

- 60% for content caching
- 30% for metadata caching
- 10% for query result caching

### Full-Text Search Indexing

Real-time search with fuzzy matching and background rebuilding.

### Priority-Based Batch Processing

Configurable job queue with automatic retries.

### HTTP Connection Pool

Efficient connection management with health monitoring.

You can configure the performance system through NixOS options:

```nix
services.mcp-internal-wiki = {
  enable = true;
  wikiUrls = [ "https://your-wiki-url.com" ];
  performance = {
    cache = {
      contentAllocation = 60;
      metadataAllocation = 30;
      queryAllocation = 10;
    };
    indexing = {
      rebuildInterval = 3600;
      fuzzyMatchThreshold = 0.8;
    };
    batch = {
      maxConcurrent = 5;
      retryLimit = 3;
    };
    connections = {
      poolSize = 10;
      timeout = 5000;
    };
  };
};
```

## Agent Architecture

As of May 2025, the MCP Internal Wiki Server uses a modular agent-based architecture:

### WikiContentAgent

Fetches and filters wiki content for queries, with intelligent caching.

### AIRelevanceAgent

Scores content relevance using AI providers for more accurate results.

### WikiIndexAgent

Manages building and rebuilding the wiki search index.

Configure the agent system through NixOS options:

```nix
services.mcp-internal-wiki = {
  enable = true;
  wikiUrls = [ "https://your-wiki-url.com" ];
  agents = {
    wikiContent = {
      enable = true;
      fetchConcurrency = 3;
    };
    aiRelevance = {
      enable = true;
      provider = "default";
      threshold = 0.7;
    };
    wikiIndex = {
      enable = true;
      rebuildFrequency = "daily";
    };
  };
};
```

## Development on NixOS

To set up a development environment with all the necessary tools:

```bash
# Enter the development shell
nix develop

# Or with just
just nix-shell
```

## Multi-Environment Development Requirements

When developing for the MCP Internal Wiki Server on NixOS, ensure all changes are integrated into ALL development environments:

### 1. Nix Development Environment (`flake.nix`)

```bash
# Update flake.nix with new dependencies or commands
nix flake update
```

### 2. Justfile Commands

```bash
# View available commands
just --list

# Add new commands to justfile
# Example: test-new-feature:
#    node tests/test-new-feature.js
```

### 3. Docker POC Environment

```bash
# Test with Docker POC environment
just docker-poc-build
just docker-poc-up
just test-poc-all
just docker-poc-down
```

### 4. Package.json Scripts

```bash
# Ensure npm scripts are compatible
npm run test:setup
```

For complete development workflow, see the [Nix Development Guide](NIX_DEVELOPMENT.md).

## Troubleshooting

If you encounter issues:

1. Check that the `mcp.config.json` file exists and has valid wiki URLs
2. Ensure your flake is properly configured
3. Verify that the VS Code MCP extension is installed
4. Check for any error messages in the terminal when running the server

For more details on NixOS development, see the [Nix Development Guide](NIX_DEVELOPMENT.md).
