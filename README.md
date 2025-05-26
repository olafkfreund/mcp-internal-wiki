# MCP Internal Wiki Server (MCP/Context7-style)

This project is now a Model Context Protocol (MCP) server using stdio and JSON-RPC, inspired by Context7's architecture. It is designed for LLMs, VS Code, Cursor, and other tools that support MCP.

## Usage

### 1. Build

```sh
npm run build
```

### 2. Run (stdio/JSON-RPC)

```sh
node dist/server.js
```

You can test the server with the official MCP Inspector:

```sh
npx -y @modelcontextprotocol/inspector node dist/server.js
```

## Architecture

- **Stdio/JSON-RPC**: Communicates over stdio, not HTTP.
- **MCPServer**: Handles JSON-RPC requests and method dispatch.
- **Sources**: Extensible source system (see `src/sources/wikiSource.ts`).

## Extending

- Add new sources in `src/sources/` and register them in `MCPServer`.
- Implement new MCP methods in `MCPServer` as needed.

## Project Plan

See `PROJECT_PLAN.md` for roadmap and contribution guidelines.

## License

MIT
