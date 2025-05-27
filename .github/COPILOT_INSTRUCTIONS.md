# Copilot Instructions for MCP Internal Wiki Server Development

## 🔍 Project Overview

The MCP Internal Wiki Server is a specialized Node.js application that bridges company knowledge bases with development environments using the Model Context Protocol (MCP). It enables seamless access to documentation directly within VS Code or other MCP-compatible editors.

## 📂 Project Structure

```
mcp-internal-wiki/
├── src/                 # Main TypeScript source code
│   ├── server.ts        # MCP server implementation
│   ├── routes.ts        # API routes and handlers
│   ├── config.ts        # Configuration management
│   ├── mcpServer.ts     # Core MCP protocol implementation
│   ├── wikiManager.ts   # Wiki content management
│   └── sources/         # Content source implementations
├── tests/               # Test scripts for manual testing
├── test/                # Jest automated tests
├── bin/                 # Executable scripts
├── docs/                # Documentation
├── poc-private-wiki/    # Proof of Concept for authenticated wikis
└── flake.nix           # Nix development and build configuration
```

## 🛠️ Development Guidelines

### Code Organization

- **Server Logic**: Keep core MCP protocol implementation in `mcpServer.ts`
- **Wiki Management**: All source handling should be in `wikiManager.ts` and `sources/` directory
- **Configuration**: Use `config.ts` for loading and validating configuration

### API Development

- When adding new endpoints, follow the RESTful pattern used in `src/routes.ts`
- Use TypeScript interfaces to define request/response objects
- Document all public API methods with JSDoc comments
- Implement proper error handling with standardized error responses

### Authentication

- For wiki authentication, use middleware and implement appropriate auth strategies:
  - Basic Auth: Already implemented for simple username/password
  - Token Auth: Use JWT for API security
  - OAuth: Consider for more complex integration scenarios
- The POC in `poc-private-wiki/` demonstrates authenticated wiki access patterns

### Testing

- **Automated Tests**: Use Jest for unit and integration tests in the `test/` directory
- **Manual Tests**: Use scripts in `tests/` for interactive and specialized testing
- **Test POC Features**: Use the Docker-based test environment in `poc-private-wiki/`
- When adding new features, create both:
  1. Unit tests for the core functionality
  2. Integration tests for end-to-end behavior
  3. Manual test scripts if appropriate

### Nix Development

- Use the Nix development environment with `nix develop` for consistent tooling
- Available commands are documented when entering the shell
- Run all tests using the Nix commands (see the shell help display)
- When modifying the build system, update both:
  - `flake.nix`: For Nix packaging and development
  - `default.nix`: For NixOS module compatibility

## 🚀 Feature Development Guidelines

### Supporting New Wiki Formats

- Add format detection and parsing logic in `WikiManager`
- Create a new source handler in `sources/` directory
- Implement content extraction for the specific format
- Add tests for the new format support

### Performance Optimization

- Implement caching using an in-memory store or Redis for scalability
- Add cache invalidation strategy based on TTL or explicit refresh
- For periodic refresh, use `node-cron` or similar scheduling libraries

### Web UI Development

- Create a separate frontend directory for any web UI components
- Use modern frontend frameworks (React, Vue, or Svelte recommended)
- Connect to MCP server via API endpoints
- Follow responsive design principles for various screen sizes

### VS Code Extension Integration

- Follow VS Code extension guidelines for MCP protocol consumers
- Expose a simple API and document endpoints clearly
- Provide clear onboarding steps for extension users
- Test integration thoroughly with both the standard server and the authenticated POC

### Docker Development

- Use the Docker setup in `poc-private-wiki/` as a reference
- Maintain compatibility with Docker Compose for multi-container setups
- Test Docker builds and runtime behavior for all new features

## 📋 Project Maintenance

- Always update the README and project plan with any major changes
- Keep the version number updated in package.json and other relevant files
- Document breaking changes clearly for future reference
- When updating dependencies, verify compatibility with all features and test thoroughly

## 🧪 Using the POC Environment

The `poc-private-wiki/` directory contains a complete testing environment for authenticated wikis:

- Start/stop containers with `just test-poc-menu` or `nix run .#pocmenu`
- Run all POC tests with `just test-poc-all` or `nix run .#pocalltest`
- Individual test commands are available in the development shell

## 💻 Common Commands

```bash
# Development
nix develop                    # Enter development shell with all tools
just build                     # Build the project
just run                       # Run the MCP server

# Testing
just test-simple               # Run simple tests
just test-auth                 # Run auth tests
just test-all                  # Run all main tests
nix run .#testall              # Run ALL tests (main + POC)

# POC Testing
just test-poc-menu             # Run interactive POC test menu
just test-poc-all              # Run all POC tests
nix run .#poc                  # Run POC Docker containers
```
