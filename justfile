# Justfile for MCP Internal Wiki Server

# Build the project (TypeScript -> JS)
build:
	npm run build

# Run the server (stdio/JSON-RPC mode)
run:
	node dist/server.js

# Test with MCP Inspector
test-inspector:
	npx -y @modelcontextprotocol/inspector node dist/server.js

# Run Jest tests
test:
	npm test

# Run simple MCP test
test-simple:
	npm run test:simple

# Run interactive MCP test
test-interactive:
	npm run test:interactive

# Run query test
test-query:
	npm run test:query

# Set up VS Code MCP integration
setup-vscode:
	npm run setup:vscode

# Create a release package
package:
	npm pack

# Install globally
install-global:
	npm install -g .

# Create default configuration
create-config:
	echo '{"wikiUrls":["https://freundcloud.gitbook.io/devops-examples-from-real-life/","https://wiki.nixos.org/wiki/NixOS_Wiki"]}' > mcp.config.json

# Stop the server (if running)
stop:
	pkill -f "node dist/server.js" || echo "No running server found."

# Enter Nix development shell
nix-shell:
	nix develop

# Build with Nix
nix-build:
	nix build

# Run with Nix
nix-run:
	nix run

# Test with Nix (simple test)
nix-test:
	nix run .#test
	
# Interactive test with Nix
nix-test-interactive:
	nix run .#interactive

# Setup VS Code with Nix
nix-setup-vscode:
	nix run .#setupvscode

# Update Nix flake
nix-update:
	nix flake update
