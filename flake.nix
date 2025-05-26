{
  description = "MCP Internal Wiki Server";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.05";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
  }: {
    # NixOS module
    nixosModules.default = import ./nixos-module.nix;
    
    # Normal package and apps per system
  } // flake-utils.lib.eachDefaultSystem (
      system: let
        pkgs = import nixpkgs {inherit system;};
        nodejs = pkgs.nodejs_20;
      in {
        # Development shell with all dependencies
        devShells.default = pkgs.mkShell {
          buildInputs = [
            nodejs
            pkgs.nodePackages.typescript
            pkgs.nodePackages.ts-node
            # Use npm for jest instead of trying to use the Nix package
            pkgs.just
          ];

          shellHook = ''
            export NODE_ENV=development
            echo "MCP Internal Wiki DevShell loaded. Node: $(node --version)"
            echo ""
            echo "Available commands:"
            echo "  just build         - Build the project"
            echo "  just run           - Run the MCP server"
            echo "  just test          - Run Jest tests"
            echo "  just test-simple   - Run simple MCP test"
            echo "  just test-interactive - Run interactive MCP test"
            echo "  just setup-vscode  - Configure VS Code settings"
          '';
        };

        # Main package
        packages.default = pkgs.stdenv.mkDerivation {
          pname = "mcp-internal-wiki";
          version = "1.0.0";
          src = ./.;

          buildInputs = [nodejs];
          nativeBuildInputs = [pkgs.makeWrapper];

          buildPhase = ''
            export HOME=$(mktemp -d)
            npm install
            npm run build
          '';

          installPhase = ''
            # Create installation directories
            mkdir -p $out/lib/node_modules/mcp-internal-wiki
            mkdir -p $out/bin
            mkdir -p $out/share/doc/mcp-internal-wiki

            # Copy main package files
            cp -r dist bin package.json $out/lib/node_modules/mcp-internal-wiki/

            # Create default config if none exists
            if [ -f mcp.config.json ]; then
              cp mcp.config.json $out/lib/node_modules/mcp-internal-wiki/
            else
              echo '{"wikiUrls":[]}' > $out/lib/node_modules/mcp-internal-wiki/mcp.config.json
            fi

            # Copy documentation
            cp README.md INSTALLATION.md LICENSE $out/share/doc/mcp-internal-wiki/ || true

            # Create executable with proper environment
            makeWrapper ${nodejs}/bin/node $out/bin/mcp-wiki-server \
              --add-flags "$out/lib/node_modules/mcp-internal-wiki/bin/mcp-wiki-server.js" \
              --set NODE_PATH "$out/lib/node_modules"

            # Ensure the script is executable
            chmod +x $out/lib/node_modules/mcp-internal-wiki/bin/mcp-wiki-server.js
          '';
        };

        # VS Code setup script
        packages.setupvscode = pkgs.writeShellScriptBin "mcp-wiki-setup-vscode" ''
                    mkdir -p .vscode
                    cat > .vscode/settings.json << 'EOF'
          {
            "mcp": {
              "servers": {
                "WikiMCP": {
                  "type": "stdio",
                  "command": "node",
                  "args": ["''${workspaceFolder}/dist/server.js"]
                }
              }
            }
          }
          EOF
                    echo "VS Code settings created successfully!"
        '';

        # Test scripts
        packages.testscripts = pkgs.symlinkJoin {
          name = "mcp-wiki-test-scripts";
          paths = [
            # Simple test runner
            (pkgs.writeShellScriptBin "mcp-wiki-test" ''
              ${nodejs}/bin/node $(pwd)/simple-test.js
            '')

            # Interactive test runner
            (pkgs.writeShellScriptBin "mcp-wiki-test-interactive" ''
              ${nodejs}/bin/node $(pwd)/test-interactive.js
            '')
            
            # Query test runner
            (pkgs.writeShellScriptBin "mcp-wiki-test-query" ''
              ${nodejs}/bin/node $(pwd)/query-test.js
            '')
          ];
        };

        # Main app
        apps.default = {
          type = "app";
          program = "${self.packages.${system}.default}/bin/mcp-wiki-server";
        };

        # Test apps
        apps.test = {
          type = "app";
          program = toString (pkgs.writeShellScript "mcp-wiki-test" ''
            ${nodejs}/bin/node $(pwd)/simple-test.js
          '');
        };

        apps.interactive = {
          type = "app";
          program = toString (pkgs.writeShellScript "mcp-wiki-interactive-test" ''
            ${nodejs}/bin/node $(pwd)/test-interactive.js
          '');
        };
        
        apps.query = {
          type = "app";
          program = toString (pkgs.writeShellScript "mcp-wiki-query-test" ''
            ${nodejs}/bin/node $(pwd)/query-test.js
          '');
        };

        apps.setupvscode = {
          type = "app";
          program = "${self.packages.${system}.setupvscode}/bin/mcp-wiki-setup-vscode";
        };
      }
    );
}
