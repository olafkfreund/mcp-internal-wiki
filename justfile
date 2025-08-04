# Justfile for MCP Internal Wiki Server
# Recent additions (May 29, 2025): JSON parsing tests and enhanced POC container validation

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
	node tests/simple-test.js

# Run interactive MCP test
test-interactive:
	node tests/test-interactive.js

# Run query test
test-query:
	node tests/query-test.js

# Run JSON parsing test
test-json-parsing:
	node tests/test-json-parsing.js

# Run complete MCP server test
test-complete:
	node tests/test-complete.js

# Run content fetching test
test-content:
	node tests/content-fetch-test.js

# Run auth test
test-auth:
	node tests/auth-test.js

# Run all tests from tests folder
test-all:
	npm run test:all
	test test:cache agent-test

# Test JSON parsing and error handling
test-json-all:
	just test-json-parsing
	just test-complete
	just test-poc-json

# Agent-based tests
agent-test:
	node tests/simple-test.js
	node tests/ai-relevance-test.js
	node tests/content-fetch-test.js
	node tests/test-ai-mocked.js

# Offline functionality tests
test-offline:
	node tests/test-offline.js

# Test offline mode functionality
test-offline-mode:
	just build
	node tests/test-offline.js

# Test offline sync functionality
test-offline-sync:
	just build
	node -e "
	const { WikiSource } = require('./dist/sources/wikiSource.js');
	const { WikiOfflineIntegration } = require('./dist/offline/index.js');
	async function testSync() {
	  const wiki = new WikiSource();
	  const offline = new WikiOfflineIntegration(wiki);
	  await offline.initialize();
	  console.log('Testing sync...');
	  const stats = await offline.syncAllSources();
	  console.log('Sync results:', stats);
	  await offline.shutdown();
	}
	testSync().catch(console.error);
	"

# Test offline search functionality
test-offline-search:
	just build
	node -e "
	const { WikiSource } = require('./dist/sources/wikiSource.js');
	const { WikiOfflineIntegration } = require('./dist/offline/index.js');
	async function testSearch() {
	  const wiki = new WikiSource();
	  const offline = new WikiOfflineIntegration(wiki);
	  await offline.initialize();
	  console.log('Testing offline search...');
	  const results = await offline.searchOffline({query: 'configuration', limit: 5});
	  console.log('Search results:', results.length, 'items found');
	  await offline.shutdown();
	}
	testSearch().catch(console.error);
	"

# Tests from POC Private Wiki folder

# Run auth POC test
test-auth-poc:
	cd poc-private-wiki && node test-auth-poc.js

# Run auth integration test
test-auth-integration:
	cd poc-private-wiki && node auth-integration-test.js

# Run POC interactive test client
test-poc-interactive:
	cd poc-private-wiki && node interactive-test-client.js

# Run POC container monitor
test-poc-monitor:
	cd poc-private-wiki && node monitor-containers.js

# Run POC JSON fixes test
test-poc-json:
	cd poc-private-wiki && node test-json-fixes.js

# Run POC test menu
test-poc-menu:
	cd poc-private-wiki && ./test-menu.sh

# Run all POC tests
test-poc-all:
	cd poc-private-wiki && ./run-all-tests.sh

# Build all POC Docker images from the project root
# This ensures the build context includes src/ and all needed files
# Example: just docker-poc-build

docker-poc-build:
	npm run build
	docker build -f poc-private-wiki/markdown-server/Dockerfile -t poc-markdown-server .
	docker build -f poc-private-wiki/mcp-server/Dockerfile -t poc-mcp-server .

# Build all POC Docker images without cache to ensure latest changes
# Example: just docker-poc-build-no-cache
docker-poc-build-no-cache:
	npm run build
	docker build --no-cache -f poc-private-wiki/markdown-server/Dockerfile -t poc-markdown-server .
	docker build --no-cache -f poc-private-wiki/mcp-server/Dockerfile -t poc-mcp-server .

# Start all POC containers using docker compose
# Example: just docker-poc-up

docker-poc-up:
	cd poc-private-wiki && docker compose up -d

# Stop all POC containers
# Example: just docker-poc-down

docker-poc-down:
	cd poc-private-wiki && docker compose down

# Build and test POC containers with JSON parsing validation
docker-poc-test-json:
	just docker-poc-build
	just docker-poc-up
	sleep 10
	just test-poc-json
	just docker-poc-down

# Run all POC tests (in containers)
# Example: just docker-poc-test

docker-poc-test:
	cd poc-private-wiki && ./run-all-tests.sh

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

# Package Management Commands

# Build all distribution packages (deb, rpm, source)
package-all:
	./packaging/build-packages.sh all

# Build only Debian package
package-deb:
	./packaging/build-packages.sh deb

# Build only RPM package
package-rpm:
	./packaging/build-packages.sh rpm

# Create source package
package-source:
	./packaging/build-packages.sh source

# Test package installation (requires sudo)
test-package-deb:
	sudo dpkg -i dist/packages/mcp-internal-wiki_*_all.deb || echo "Package testing complete"

# Test package removal (requires sudo)
test-package-remove-deb:
	sudo dpkg -r mcp-internal-wiki || echo "Package removal complete"

# Full package testing cycle (requires sudo)
test-package-full:
	sudo ./packaging/test-packages.sh full

# Test package installation only (requires sudo)
test-package-install:
	sudo ./packaging/test-packages.sh install

# Test installed package functionality (requires sudo)
test-package-functionality:
	sudo ./packaging/test-packages.sh test

# Show package contents
package-info-deb:
	dpkg -c dist/packages/mcp-internal-wiki_*_all.deb

# Clean package build artifacts
package-clean:
	rm -rf build/
	rm -rf dist/packages/
	rm -rf packaging/rpm/{BUILD,RPMS,SRPMS}/*
