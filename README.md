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
- 🧩 **Extensible architecture**: Add custom sources and adapters for your specific needs
- 🛠️ **Platform agnostic**: Works with any MCP-compatible editor
- 🔒 **Privacy-focused**: All content remains within your environment; no external API calls
- ⚡ **Lightning fast**: Stdio/JSON-RPC communication ensures minimal latency

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
    "https://your-team-gitbook.example.io"
  ]
}
```

### 3. VS Code Integration

1. Install the [Copilot MCP Extension](https://marketplace.visualstudio.com/items?itemName=automatalabs.copilot-mcp)
2. Configure VS Code to use the MCP server:

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

3. Restart VS Code or reload the window

## 🏗️ Use Cases

- **Developer Documentation**: Instant access to API references, code standards, and patterns
- **Onboarding**: Help new team members find information without leaving their IDE
- **Knowledge Management**: Create a unified interface to distributed knowledge bases
- **DevOps Practices**: Quick reference to infrastructure patterns and operational procedures

## 🧪 Testing

<details>
<summary>Node.js Testing</summary>

```bash
# Run a simple test
npm run test:simple

# Run an interactive test client
npm run test:interactive

# Run a query test
npm run test:query
```
</details>

<details>
<summary>Nix Testing</summary>

```bash
# Simple test with Nix
nix run .#test
# or
just nix-test

# Interactive test with Nix
nix run .#interactive
# or
just nix-test-interactive

# Query test with Nix
nix run .#query
```
</details>

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
- [Nix Development Guide](NIX_DEVELOPMENT.md)
- [Project Plan](PROJECT_PLAN.md)

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
