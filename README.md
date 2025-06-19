# 🌟 MCP Internal Wiki Server

<div align="center">

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/yourusername/mcp-internal-wiki)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E=14.0.0-brightgreen.svg)](https://nodejs.org/)

<img src="https://raw.githubusercontent.com/microsoft/vscode-codicons/main/src/icons/book.svg" width="100" height="100" alt="MCP Wiki Icon">

**Connect your internal knowledge directly to your IDE**

</div>

## 🔍 What is MCP Wiki Server?

MCP Internal Wiki Server is a specialized bridge between your company's knowledge bases and your development environment. Using the Model Context Protocol (MCP), it enables **seamless access to documentation** right where you need it - in your editor.

> 💡 **MCP** (Model Context Protocol) is an open standard for integrating contextual information into AI-assisted development environments.

## ✨ Why Use MCP Wiki Server?

### 🚀 Boost Productivity

- **Instant knowledge access**: No more context switching between your IDE and browser
- **Consistent information**: Every team member accesses the same up-to-date documentation
- **Reduced onboarding time**: New developers can find information directly in their workflow

### 🔄 How It Works

```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│                │     │                │     │                │
│   Your Wiki    │◄────┤   MCP Server   │◄────┤   VS Code      │
│   Sources      │     │                │     │   Extension    │
│                │     │                │     │                │
└────────────────┘     └────────────────┘     └────────────────┘
       ^                                              │
       │                                              │
       └──────────────────────────────────────────────┘
                 Query & Response Flow
```

## 🎯 Key Features

- 📚 **Multi-source integration**: Connect to multiple wiki platforms simultaneously
- 🔍 **Contextual search**: Find exactly what you need with advanced query capabilities
- 🚀 **Code transformation**: Convert wiki content to executable code in multiple languages
- 🏗️ **Project generation**: Generate complete project structures from documentation
- 🎨 **Template system**: Use Handlebars templates for consistent code generation
- 🤖 **AI-powered**: Leverage AI providers for intelligent code generation and transformation
- 🧩 **Extensible architecture**: Add custom sources and adapters for your specific needs
- 🛠️ **Platform agnostic**: Works with any MCP-compatible editor
- 🔒 **Privacy-focused**: All content remains within your environment; no external API calls
- 🔐 **Secure authentication**: Support for basic, token, and custom authentication methods for private wikis
- ⚡ **Lightning fast**: Advanced performance optimization with multi-level caching, connection pooling, and batch processing
- 🚀 **Enterprise scale**: Handles millions of wiki pages with intelligent resource management and real-time monitoring
- 📊 **Performance monitoring**: Real-time metrics collection with cache hit rates, response times, and throughput tracking

## 📦 Quick Start

```bash
# Install globally
npm install -g mcp-internal-wiki

# Run the server
mcp-wiki-server
```

## 🔧 Setup & Configuration

### 1. Installation

Choose your preferred installation method:

<details>
<summary>📥 <b>Local Installation</b></summary>
<br>

```bash
# Clone the repository
git clone https://github.com/yourusername/mcp-internal-wiki.git
cd mcp-internal-wiki

# Install dependencies
npm install

# Build the project
npm run build
```

</details>

<details>
<summary>🌐 <b>Global Installation</b></summary>
<br>

```bash
# Install globally
npm install -g mcp-internal-wiki

# Run the server
mcp-wiki-server
```

</details>

<details>
<summary>⚡ <b>Quick Install (no installation)</b></summary>
<br>

```bash
npx mcp-internal-wiki
```

</details>

<details>
<summary>❄️ <b>NixOS Installation</b></summary>
<br>

```bash
# Install via the flake
nix profile install github:yourusername/mcp-internal-wiki

# Or run without installing
nix run github:yourusername/mcp-internal-wiki
```

See the [NixOS Installation Guide](NIXOS_INSTALLATION.md) for more details.
</details>

### 2. Configure Wiki Sources

Create or edit `mcp.config.json` to include your wiki URLs:

```json
{
  "wikiUrls": [
    "https://your-company-wiki.example.com",
    "https://your-team-gitbook.example.io",
    "https://private-confluence.example.com/wiki"
  ],
  "cacheTimeoutMinutes": 30
}
```

### 3. Configure Authentication for Private Wikis

For wikis that require authentication, add an `auth` section to your `mcp.config.json`:

```json
{
  "wikiUrls": [
    "https://your-company-wiki.example.com",
    "https://your-team-gitbook.example.io",
    "https://private-confluence.example.com/wiki"
  ],
  "cacheTimeoutMinutes": 30,
  "auth": [
    {
      "urlPattern": "example\\.confluence\\.com",
      "type": "basic",
      "username": "username",
      "password": "password",
      "comment": "Replace with actual credentials for your Confluence instance"
    },
    {
      "urlPattern": "example\\.sharepoint\\.com",
      "type": "token",
      "token": "your-access-token",
      "comment": "Replace with actual token for your SharePoint instance"
    },
    {
      "urlPattern": "api\\.github\\.com",
      "type": "custom",
      "headerName": "Authorization",
      "headerValue": "token ghp_yourgithubpersonalaccesstoken",
      "comment": "For accessing private GitHub repositories"
    }
  ]
}
```

Supported authentication types:

- `basic`: Username and password for HTTP Basic Auth
- `token`: Bearer token authentication
- `custom`: Custom header authentication
- `oauth`: OAuth 2.0 authentication (advanced configuration)

### 4. VS Code Integration

To use the MCP Internal Wiki Server with VS Code:

1. **Install the Copilot MCP Extension**: [Marketplace Link](https://marketplace.visualstudio.com/items?itemName=automatalabs.copilot-mcp)
2. **Configure the MCP server**:
   - Create `.vscode/mcp.json` in your workspace root:

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
3. **Restart VS Code** to apply the configuration.
4. **Test integration**:
   - Open a markdown file and type a query related to your wiki content.
   - The MCP extension should provide completions or context from your wiki sources.
5. **Troubleshooting**:
   - Check the VS Code Output panel (MCP channel) for logs.
   - Ensure the MCP server is running and `mcp.config.json` is valid.
   - See `TESTING_VS_CODE.md` and `VSCODE_QUICK_REFERENCE.md` for more help.

## VS Code Integration and Testing

### Setup

1. Install the Copilot MCP Extension from the VS Code Marketplace.
2. Create `.vscode/mcp.json` in your workspace root:

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

### Testing

- Open a markdown file and type a query related to your wiki content.
- The MCP extension should provide completions or context from your wiki sources.
- Run `npm run test:simple` or `npm run test:interactive` for CLI validation.

### Troubleshooting

- Check the VS Code Output panel (MCP channel) for logs.
- Ensure the MCP server is running and `mcp.config.json` is valid.
- See `TESTING_VS_CODE.md` and `VSCODE_QUICK_REFERENCE.md` for more help.

## 🚀 Content Transformation & Code Generation

MCP Internal Wiki Server includes powerful transformation capabilities that can convert your wiki documentation into executable code and complete project structures.

### Available MCP Tools

The server provides these transformation tools through the standard MCP protocol:

#### 🔄 `transform_content`
Transform wiki content or markdown into executable code in any programming language.

**Usage in VS Code:**
- Select wiki content in your editor
- Access via MCP tools interface 
- Choose target language and framework

**Parameters:**
- `content`: Wiki content or markdown to transform
- `targetLanguage`: Target programming language (typescript, python, javascript, etc.)
- `framework`: Optional framework (express, fastapi, react, etc.)
- `projectType`: Optional project type (api, library, cli, etc.)

#### 🏗️ `generate_code`
Generate code from wiki content using templates and AI-powered generation.

**Parameters:**
- `content`: Wiki documentation to generate code from
- `codeType`: Type of code to generate (dockerfile, typescript, python, yaml, etc.)
- `templateName`: Optional template to use (express-server, typescript-class, etc.)

**Features:**
- **Template-based generation**: Uses Handlebars templates for consistent output
- **AI-enhanced**: Leverages configured AI providers for intelligent code generation
- **Multi-format support**: Generates Dockerfiles, package.json, TypeScript classes, and more

#### 📁 `generate_project`
Generate complete project structures from wiki documentation.

**Parameters:**
- `content`: Wiki content describing project requirements
- `projectType`: Type of project (express-api, react-app, cli-tool, etc.)
- `language`: Programming language (typescript, python, javascript, etc.)

**Capabilities:**
- **Full project scaffolding**: Creates complete directory structures
- **Multi-file generation**: Generates all necessary project files
- **Best practices**: Follows established patterns and conventions

### Template System

The transformation system uses Handlebars templates for consistent code generation:

**Available Templates:**
- `typescript-class.hbs` - TypeScript class definitions
- `express-server.hbs` - Express.js server setup
- `dockerfile.hbs` - Docker containerization
- `package-json.hbs` - Node.js package configuration
- `readme.hbs` - Project documentation

**Custom Templates:**
Add your own templates in the `/templates` directory using Handlebars syntax.

### AI Integration

The transformation system integrates with multiple AI providers:

- **OpenAI GPT-4o**: Advanced code generation and analysis
- **Google Gemini 2.5 Pro**: Intelligent content transformation
- **Azure OpenAI**: Enterprise-grade AI capabilities
- **Claude**: Anthropic's AI for precise code generation

**Configuration in `mcp.config.json`:**
```json
{
  "ai": {
    "enabled": true,
    "providers": {
      "openai": {
        "apiKey": "your-openai-api-key",
        "model": "gpt-4o"
      },
      "gemini": {
        "apiKey": "your-gemini-api-key", 
        "model": "gemini-2.5-pro"
      }
    },
    "primaryProvider": "openai"
  }
}
```

### Example Transformation Workflows

#### 1. API Documentation → Express Server
```markdown
# User Authentication API
Create a REST API with JWT authentication
- POST /auth/login
- POST /auth/register  
- GET /auth/profile
```
↓ **transform_content** with `targetLanguage: "typescript"` and `framework: "express"`
```typescript
// Generated Express.js server with JWT authentication
import express from 'express';
import jwt from 'jsonwebtoken';
// ... complete implementation
```

#### 2. Deployment Guide → Docker Configuration
```markdown
# Deployment Requirements
- Node.js 18 runtime
- PostgreSQL database
- Redis for caching
- Environment variables for config
```
↓ **generate_code** with `codeType: "dockerfile"`
```dockerfile
FROM node:18-alpine
RUN apk add --no-cache postgresql-client redis
# ... complete Docker configuration
```

#### 3. Project Specification → Full Scaffolding
```markdown
# CLI Tool Requirements
TypeScript-based command-line tool for file processing
- File input/output operations
- Configuration via CLI arguments
- Unit testing with Jest
```
↓ **generate_project** with `projectType: "cli-tool"` and `language: "typescript"`
```
project/
├── src/
│   ├── cli.ts
│   ├── processor.ts
│   └── config.ts
├── tests/
├── package.json
├── tsconfig.json
└── README.md
```

### Testing Transformation Features

Test the transformation capabilities:

```bash
# Run transformation tests
npm run test:transform

# Test individual transformation methods
node tests/test-mcp-tools.js
```

## 🧩 Agent Architecture

MCP Internal Wiki Server now uses a modular agent-based architecture for all core features:

- **WikiContentAgent**: Fetches and filters wiki content for queries
- **AIRelevanceAgent**: Scores content relevance using AI providers
- **WikiIndexAgent**: Manages (re)building the wiki search index

### How to Use Agents

- Use the agent manager in `src/agents/index.ts` to access and orchestrate agents
- Run agent-based tests with `just agent-test` or via the Nix shell
- Agent endpoints are available in the Docker POC for integration testing

See [COPILOT_INSTRUCTIONS.md](.github/COPILOT_INSTRUCTIONS.md) for full agent usage and development guidelines.

## 🏗️ Use Cases

- **Developer Documentation**: Instant access to API references, code standards, and patterns
- **Onboarding**: Help new team members find information without leaving their IDE
- **Knowledge Management**: Create a unified interface to distributed knowledge bases
- **DevOps Practices**: Quick reference to infrastructure patterns and operational procedures

## ⚡ Performance & Scalability

### Enterprise-Grade Performance Optimization

MCP Wiki Server includes advanced performance optimization features for handling large-scale deployments:

- **🚀 Multi-Level Caching**: Intelligent cache management with automatic allocation:
  - Content cache (60% of memory) for large wiki pages
  - Metadata cache (30% of memory) for page information
  - Query cache (10% of memory) for search results
  - LRU eviction with configurable size and item limits

- **🔍 Full-Text Search Indexing**: Real-time search capabilities:
  - Background index rebuilding with minimal performance impact
  - Fuzzy search matching for typos and partial queries
  - Memory-optimized inverted index structure
  - Configurable indexing intervals

- **⚡ Priority-Based Batch Processing**: Background job management:
  - Configurable concurrency limits for optimal resource usage
  - Automatic retry mechanisms with exponential backoff
  - Priority queues for critical vs. background tasks
  - Job deduplication to prevent redundant processing

- **🔄 HTTP Connection Pool**: Efficient network resource management:
  - Connection reuse to reduce overhead
  - Automatic failover and health monitoring
  - Configurable pool sizes and timeouts
  - Resource cleanup and garbage collection

- **📊 Real-Time Performance Monitoring**: Comprehensive metrics collection:
  - Cache hit rates and memory usage tracking
  - Response time monitoring with slow query detection
  - Request throughput and error rate tracking
  - Performance dashboards and alerting

### Performance Testing

Run comprehensive performance tests to validate your deployment:

```bash
# Test cache performance (immediate - no build required)
npm run test:cache

# Full performance test suite (requires build)
npm run build && npm run test:performance

# Load testing with concurrent users
npm run test:load

# Performance CLI tools
npm run perf benchmark
npm run perf monitor
```

### Configuration for Large Deployments

Configure performance settings in your `mcp.config.json`:

```json
{
  "performance": {
    "cache": {
      "maxSize": 500,           // 500MB cache size
      "ttl": 3600000,          // 1 hour TTL
      "maxItems": 50000,       // 50k items max
      "enablePersistence": true
    },
    "indexing": {
      "enabled": true,
      "rebuildInterval": 300000, // 5 minutes
      "backgroundSync": true
    },
    "batch": {
      "batchSize": 20,
      "concurrency": 10,
      "maxRetries": 3
    },
    "pool": {
      "maxConnections": 50,
      "acquireTimeout": 10000,
      "idleTimeout": 60000
    }
  }
}
```

### Scaling Guidelines

| Scale | Pages | Users | Cache Size | Expected Performance |
|-------|-------|-------|------------|---------------------|
| Small | < 10K | < 10 | 100MB | > 50 RPS |
| Medium | < 100K | < 50 | 500MB | > 100 RPS |
| Large | < 1M | < 200 | 2GB | > 200 RPS |
| Enterprise | > 1M | > 500 | 8GB | > 500 RPS |

## 🧪 Testing

### Standard Testing Commands

**Node.js Testing**

```bash
# Build the project
npm run build
# or
just build

# Run a simple test
npm run test:simple
# or
just test-simple

# Run an interactive test client
npm run test:interactive
# or
just test-interactive

# Run a query test
npm run test:query
# or
just test-query

# Run all tests
npm run test:all
# or
just test-all
```

**Nix Testing**

```bash
# Simple test with Nix
nix run .#test
# or
just nix-test

# Interactive test with Nix
nix run .#interactive
# or
just nix-test-interactive

# Build with Nix
nix build
# or
just nix-build
```

### 🐳 Docker Testing (POC Private Wiki)

The project includes a comprehensive Docker-based POC for testing private wiki authentication:

**Docker POC Commands**

```bash
# Build POC Docker images (includes TypeScript compilation)
just docker-poc-build

# Build POC Docker images without cache (for fresh builds)
just docker-poc-build-no-cache

# Start POC containers (markdown server + MCP server)
just docker-poc-up

# Stop POC containers
just docker-poc-down

# Run comprehensive POC test suite
just docker-poc-test

# Individual POC tests
just test-auth-poc              # Basic authentication tests
just test-auth-integration      # Integration authentication tests
just test-poc-interactive       # Interactive test client
just test-poc-monitor          # Container health monitoring
just test-poc-menu             # Interactive test menu
```

**What the Docker POC demonstrates:**
- ✅ **Private Wiki Authentication**: MCP server connecting to password-protected wikis
- ✅ **Containerized Deployment**: Both services running in Docker containers with health checks
- ✅ **Authentication Methods**: Basic auth, token auth, and custom header authentication
- ✅ **Integration Testing**: Comprehensive test suite validating all functionality
- ✅ **Production-Ready**: Real-world deployment scenario with networking and service discovery

## 🏗️ Architecture

- **📡 Stdio/JSON-RPC Communication**: Lightweight, fast communication protocol
- **🧠 MCPServer Core**: Central request handler and method dispatcher
- **🔌 Extensible Sources**: Pluggable system for different wiki platforms
- **🔍 Smart Context Retrieval**: Optimized search and context management

## 📚 Documentation

- [Complete Installation Guide](INSTALLATION.md)
- [Linux Installation Guide](LINUX_INSTALLATION.md)
- [NixOS Installation Guide](NIXOS_INSTALLATION.md)
- [VS Code Integration Guide](SETUP_VSCODE.md)
- [VS Code Testing Guide](TESTING_VS_CODE.md)
- [VS Code Configuration Examples](examples/)
- [Performance Testing Guide](docs/PERFORMANCE.md)
- [Performance Optimization Documentation](docs/TESTING-PERFORMANCE.md)
- [Nix Development Guide](NIX_DEVELOPMENT.md)
- [Project Plan](PROJECT_PLAN.md)
- [Wiki Integration Guide](docs/WIKI_INTEGRATION.md)

## 🔧 Extending

MCP Wiki Server is built to be extended:

- Add new sources in `src/sources/` and register them in `MCPServer`
- Implement new MCP methods in `MCPServer` as needed
- Support for various wiki formats:
  - Markdown
  - MediaWiki
  - Gitbook
  - Confluence
  - SharePoint
  - Custom sources

## 👨‍💻 Development

```bash
# Enter development environment with Nix
nix develop
# or
just nix-shell

# Build with Nix
nix build
# or
just nix-build
```

See the [Nix Development Guide](NIX_DEVELOPMENT.md) for more details.

## 📋 Requirements

- Node.js 14.x or later
- For NixOS: Flakes enabled

## 📄 License

[MIT](LICENSE) - Feel free to use, modify, and distribute this software.

---

<div align="center">
Made with ❤️ for developers who value their workflow
</div>
