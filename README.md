# MCP Internal Wiki Server

This project is an MCP server for referencing and templating wiki content from multiple URLs. It is designed for easy installation (via npx), and is compatible with VS Code and Cursor.

## Features

- Register and index multiple wiki URLs
- Fetch and store wiki content
- Endpoints for template and command extraction
- REST API for integration
- Automated tests for easy verification

## Quick Start

### 1. Install dependencies

```zsh
npm install
```

### 2. Build the project

```zsh
npm run build
```

### 3. Run the server

```zsh
npm start
```

Or for development (with hot reload):

```zsh
npm run dev
```

### 4. Use with npx (after publishing)

```zsh
npx mcp-internal-wiki
```

### 5. Specify wiki URLs in `mcp.config.json`

- Add a `mcp.config.json` file in your project root with:
  ```json
  {
    "wikiUrls": [
      "https://example.com/wiki1",
      "https://example.com/wiki2"
    ]
  }
  ```
- The server will automatically load and index these URLs at startup.
- You can still add more URLs at runtime via the REST API.

## Nix Flake & DevShell

### Build and Run with Nix Flake

If you are on NixOS or have flakes enabled:

```sh
# Enter the dev shell with all tools (Node.js, TypeScript, Jest, etc.)
nix develop

# Build the project
npm run build

# Run the server
npm start
```

### Flake Features
- Provides a reproducible dev environment with all dependencies
- Includes Node.js, TypeScript, Jest, and more
- `nix develop` gives you a shell with all tools ready
- Build and run the app using standard npm/yarn commands

## API Endpoints

- `POST /wiki` — Add a wiki URL `{ url: string }`
- `GET /wiki` — List registered URLs
- `GET /wiki/content?url=...` — Get content for a URL
- `GET /wiki/commands?url=...` — Extract commands from a URL
- `GET /wiki/templates?url=...` — Extract templates from a URL

## Testing

```zsh
npm test
```

## Project Plan & Copilot Instructions

See `PROJECT_PLAN.md` and `COPILOT_INSTRUCTIONS.md` for roadmap and contribution guidelines.

## License

MIT
