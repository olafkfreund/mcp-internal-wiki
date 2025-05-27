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
│   ├── sources/         # Content source implementations
│   └── performance/     # Performance optimization components
│       ├── CacheManager.ts       # Multi-level caching system
│       ├── IndexManager.ts       # Full-text search indexing
│       ├── BatchProcessor.ts     # Priority-based job processing
│       ├── ConnectionPool.ts     # HTTP connection management
│       └── OptimizedWikiSource.ts # Integrated performance layer
├── tests/               # Test scripts for manual testing
├── test/                # Jest automated tests
├── bin/                 # Executable scripts
├── docs/                # Documentation
├── poc-private-wiki/    # Proof of Concept for authenticated wikis
└── flake.nix           # Nix development and build configuration
```

## 🛠️ Development Guidelines

### ⚠️ CRITICAL: Multi-Environment Development Requirements

**EVERY new feature and change MUST be integrated into ALL development environments:**

1. **Nix Environment (`flake.nix`)**: Update dependencies, apps, and development shell
2. **Justfile Commands (`justfile`)**: Add corresponding build/test/deploy commands
3. **Docker POC Environment (`poc-private-wiki/`)**: Test with authentication scenarios
4. **Package.json Scripts**: Ensure npm script compatibility
5. **Performance Integration**: Leverage performance optimization components

**Failure to update all environments will result in inconsistent behavior and broken deployments.**

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

**ENTERPRISE-READY PERFORMANCE SYSTEM IMPLEMENTED** *(May 28, 2025)*

The project now includes a comprehensive performance optimization system:

- **Multi-Level Caching**: Intelligent cache management with content (60%), metadata (30%), and query (10%) allocation
- **Full-Text Search Indexing**: Real-time search with fuzzy matching and background rebuilding
- **Priority-Based Batch Processing**: Configurable job queue with automatic retries
- **HTTP Connection Pool**: Efficient connection management with health monitoring
- **Performance Monitoring**: Real-time metrics collection and load testing capabilities

**When developing new features:**
- Integrate with `CacheManager` for data caching needs
- Use `IndexManager` for searchable content
- Leverage `BatchProcessor` for background tasks
- Utilize `ConnectionPool` for HTTP requests
- Add performance testing for new components
- Update performance configuration documentation

**Performance Testing Commands:**
```bash
npm run test:cache           # Quick JavaScript cache tests
npm run test:performance     # Full TypeScript performance suite
npm run test:load           # Load testing with concurrent users
npm run test:setup          # Complete setup and validation
```

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
- **CRITICAL**: All new features must be tested in the Docker POC environment
- Ensure new features work with authentication in containerized deployment
- Update Docker configurations (`Dockerfile`, `docker-compose.yml`) when adding dependencies
- Test both local development and Docker environments for feature parity

## 🔧 Development Environment Requirements

**ALL new features and changes MUST be integrated into ALL development environments:**

### 1. Nix Development Environment (`flake.nix`)
- Add new dependencies to `buildInputs` or `nativeBuildInputs`
- Update development shell with new tools or commands
- Add new test commands to the Nix app definitions
- Ensure all features work in the Nix development shell

### 2. Justfile Commands (`justfile`)
- Add new build, test, or deployment commands
- Update existing commands if functionality changes
- Ensure all commands work in both Nix and non-Nix environments
- Document new commands in the help system

### 3. Docker POC Environment (`poc-private-wiki/`)
- Test new features with authentication scenarios
- Update Docker configurations if new services are needed
- Ensure feature compatibility with containerized deployment
- Add appropriate test commands for new functionality

### 4. Package.json Scripts
- Add npm scripts for new testing or build features
- Ensure compatibility with global installation
- Update dependencies when adding new functionality

**Failure to update all environments will result in inconsistent behavior across development setups.**

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
