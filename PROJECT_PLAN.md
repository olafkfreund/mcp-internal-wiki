# Project Plan: MCP Internal Wiki Server

## Overview

Build an MCP server to reference and index wiki content from multiple URLs, enabling template and command extraction for use in VS Code and Cursor. The server should be installable via npx and easy to set up.

## Milestones

1. **Project Setup**
   - Scaffold Node.js/TypeScript project
   - Add Express server and basic endpoints
   - Add test framework (Jest)
2. **Wiki Management**
   - Add endpoint to register wiki URLs
   - Fetch and store wiki content
   - List registered URLs
   - Retrieve content for a given URL
3. **Template & Command Extraction**
   - Implement placeholder extraction logic
   - Add endpoints for template and command extraction
4. **Packaging & Distribution**
   - Configure for npx install and CLI usage
   - Ensure compatibility with VS Code and Cursor
5. **Documentation & Testing**
   - Write README with install, build, and usage instructions
   - Add Copilot instructions for future features
   - Write and maintain automated tests

## Future Features (Copilot Instructions)

- Add authentication for private wikis
- Support for different wiki formats (Markdown, MediaWiki, etc.)
- Caching and periodic refresh of wiki content
- Advanced template/command parsing
- Web UI for managing URLs and viewing content
- VS Code/Cursor extension for direct integration
