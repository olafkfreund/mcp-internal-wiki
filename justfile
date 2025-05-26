# Justfile for MCP Internal Wiki Server

# Build the project (TypeScript -> JS)
build:
	npm run build

# Run the server (after build)
run:
	npm start

# Run the server in development mode (hot reload)
dev:
	npm run dev

# Run tests
test:
	npm test

# Clean build artifacts
clean:
	rm -rf dist coverage .tsbuildinfo
