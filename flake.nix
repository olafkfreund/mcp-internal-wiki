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
  }:
    {
      # NixOS module
      nixosModules.default = import ./nixos-module.nix;

      # Normal package and apps per system
    }
    // flake-utils.lib.eachDefaultSystem (
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
            pkgs.just
            pkgs.docker
            pkgs.docker-compose
            pkgs.curl
          ];

          shellHook = ''
            export NODE_ENV=development
            echo -e "\033[1;36mMCP Internal Wiki DevShell loaded. Node: $(node --version)\033[0m"
            echo ""
            echo -e "\033[1;33mMain Project Commands:\033[0m"
            echo "  just build         - Build the project"
            echo "  just run           - Run the MCP server"
            echo "  just test          - Run Jest tests"
            echo "  just test-simple   - Run simple MCP test"
            echo "  just test-interactive - Run interactive MCP test"
            echo "  just test-query    - Run query test"
            echo "  just test-content  - Run content fetching test"
            echo "  just test-auth     - Run auth test"
            echo "  just test-all      - Run all main tests"
            echo "  just agent-test     - Run all agent-based tests"
            echo ""
            echo -e "\033[1;33mPOC Commands:\033[0m"
            echo "  just test-auth-poc         - Run POC auth test"
            echo "  just test-auth-integration - Run auth integration test"
            echo "  just test-poc-interactive  - Run POC interactive test client"
            echo "  just test-poc-monitor      - Run POC container monitor"
            echo "  just test-poc-menu         - Run POC test menu"
            echo "  just test-poc-all          - Run all POC tests"
            echo ""
            echo -e "\033[1;33mDocker POC Commands:\033[0m"
            echo "  nix run .#poc               - Run POC Docker containers"
            echo "  nix run .#pocbuild          - Build POC Docker containers"
            echo "  nix run .#pocdetach         - Run POC Docker containers in detached mode"
            echo "  nix run .#pocstop           - Stop POC Docker containers"
            echo ""
            echo -e "\033[1;33mTesting Commands:\033[0m"
            echo "  nix run .#test              - Run simple test"
            echo "  nix run .#interactive       - Run interactive test"
            echo "  nix run .#query             - Run query test"
            echo "  nix run .#content           - Run content test"
            echo "  nix run .#auth              - Run auth test"
            echo "  nix run .#authpoc           - Run auth POC test"
            echo "  nix run .#authintegration   - Run auth integration test"
            echo "  nix run .#pocinteractive    - Run POC interactive test"
            echo "  nix run .#pocmonitor        - Run POC monitor"
            echo "  nix run .#pocmenu           - Run POC test menu"
            echo "  nix run .#pocalltest        - Run all POC tests"
            echo "  nix run .#testall           - Run ALL tests (main + POC)"
            echo ""
            echo -e "\033[1;33mOther Commands:\033[0m"
            echo "  just setup-vscode           - Configure VS Code settings"
            echo "  nix run .#setupvscode       - Configure VS Code settings using Nix"
            echo "  nix flake check             - Verify flake works correctly"
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
              echo '{"wikiUrls":["https://freundcloud.gitbook.io/devops-examples-from-real-life/","https://wiki.nixos.org/wiki/NixOS_Wiki"]}' > $out/lib/node_modules/mcp-internal-wiki/mcp.config.json
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

        # POC package with Docker support
        packages.poc = pkgs.stdenv.mkDerivation {
          pname = "mcp-internal-wiki-poc";
          version = "1.0.0";
          src = ./poc-private-wiki;

          buildInputs = [nodejs pkgs.docker pkgs.docker-compose pkgs.curl];
          nativeBuildInputs = [pkgs.makeWrapper];

          # No build phase needed as this is primarily for running the POC

          installPhase = ''
            mkdir -p $out/share/mcp-internal-wiki-poc
            cp -r . $out/share/mcp-internal-wiki-poc/

            mkdir -p $out/bin

            # Make shell scripts executable
            chmod +x $out/share/mcp-internal-wiki-poc/*.sh

            # Create POC run script
            makeWrapper ${pkgs.docker-compose}/bin/docker-compose $out/bin/run-mcp-poc \
              --add-flags "up" \
              --run "cd $out/share/mcp-internal-wiki-poc"

            # Create POC run detached script
            makeWrapper ${pkgs.docker-compose}/bin/docker-compose $out/bin/run-mcp-poc-detached \
              --add-flags "up -d" \
              --run "cd $out/share/mcp-internal-wiki-poc"

            # Create POC stop script
            makeWrapper ${pkgs.docker-compose}/bin/docker-compose $out/bin/stop-mcp-poc \
              --add-flags "down" \
              --run "cd $out/share/mcp-internal-wiki-poc"

            # Create POC build script
            makeWrapper ${pkgs.docker-compose}/bin/docker-compose $out/bin/build-mcp-poc \
              --add-flags "build" \
              --run "cd $out/share/mcp-internal-wiki-poc"

            # Create POC test script
            makeWrapper $out/share/mcp-internal-wiki-poc/run-all-tests.sh $out/bin/test-mcp-poc \
              --run "cd $out/share/mcp-internal-wiki-poc"

            # Create POC test menu script
            makeWrapper $out/share/mcp-internal-wiki-poc/test-menu.sh $out/bin/mcp-poc-test-menu \
              --run "cd $out/share/mcp-internal-wiki-poc"

            # Create individual test scripts
            makeWrapper ${nodejs}/bin/node $out/bin/mcp-poc-auth-test \
              --add-flags "$out/share/mcp-internal-wiki-poc/test-auth-poc.js" \
              --set NODE_PATH "$out/share/mcp-internal-wiki-poc/node_modules" \
              --run "cd $out/share/mcp-internal-wiki-poc"

            makeWrapper ${nodejs}/bin/node $out/bin/mcp-poc-auth-integration \
              --add-flags "$out/share/mcp-internal-wiki-poc/auth-integration-test.js" \
              --set NODE_PATH "$out/share/mcp-internal-wiki-poc/node_modules" \
              --run "cd $out/share/mcp-internal-wiki-poc"

            makeWrapper ${nodejs}/bin/node $out/bin/mcp-poc-interactive \
              --add-flags "$out/share/mcp-internal-wiki-poc/interactive-test-client.js" \
              --set NODE_PATH "$out/share/mcp-internal-wiki-poc/node_modules" \
              --run "cd $out/share/mcp-internal-wiki-poc"

            makeWrapper ${nodejs}/bin/node $out/bin/mcp-poc-monitor \
              --add-flags "$out/share/mcp-internal-wiki-poc/monitor-containers.js" \
              --set NODE_PATH "$out/share/mcp-internal-wiki-poc/node_modules" \
              --run "cd $out/share/mcp-internal-wiki-poc"
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
              ${nodejs}/bin/node $(pwd)/tests/simple-test.js
            '')

            # Interactive test runner
            (pkgs.writeShellScriptBin "mcp-wiki-test-interactive" ''
              ${nodejs}/bin/node $(pwd)/tests/test-interactive.js
            '')

            # Query test runner
            (pkgs.writeShellScriptBin "mcp-wiki-test-query" ''
              ${nodejs}/bin/node $(pwd)/tests/query-test.js
            '')

            # Content fetch test runner
            (pkgs.writeShellScriptBin "mcp-wiki-test-content" ''
              ${nodejs}/bin/node $(pwd)/tests/content-fetch-test.js
            '')

            # Auth test runner
            (pkgs.writeShellScriptBin "mcp-wiki-test-auth" ''
              ${nodejs}/bin/node $(pwd)/tests/auth-test.js
            '')

            # POC auth test runner
            (pkgs.writeShellScriptBin "mcp-wiki-test-auth-poc" ''
              cd $(pwd)/poc-private-wiki && ${nodejs}/bin/node test-auth-poc.js
            '')

            # POC auth integration test runner
            (pkgs.writeShellScriptBin "mcp-wiki-test-auth-integration" ''
              cd $(pwd)/poc-private-wiki && ${nodejs}/bin/node auth-integration-test.js
            '')

            # POC interactive test client
            (pkgs.writeShellScriptBin "mcp-wiki-test-poc-interactive" ''
              cd $(pwd)/poc-private-wiki && ${nodejs}/bin/node interactive-test-client.js
            '')

            # POC monitor containers
            (pkgs.writeShellScriptBin "mcp-wiki-test-poc-monitor" ''
              cd $(pwd)/poc-private-wiki && ${nodejs}/bin/node monitor-containers.js
            '')

            # POC test menu
            (pkgs.writeShellScriptBin "mcp-wiki-test-poc-menu" ''
              cd $(pwd)/poc-private-wiki && ./test-menu.sh
            '')

            # POC all tests
            (pkgs.writeShellScriptBin "mcp-wiki-test-poc-all" ''
              cd $(pwd)/poc-private-wiki && ./run-all-tests.sh
            '')

            # All tests (main + POC)
            (pkgs.writeShellScriptBin "mcp-wiki-test-everything" ''
              echo "Running main tests..."
              for test in simple-test.js test-interactive.js query-test.js content-fetch-test.js auth-test.js; do
                echo "Running test: $test"
                ${nodejs}/bin/node $(pwd)/tests/$test
                echo "------------------------------------"
              done

              echo "Running POC tests..."
              cd $(pwd)/poc-private-wiki && ./run-all-tests.sh
            '')
          ];
        };

        # Main app
        apps.default = {
          type = "app";
          program = "${self.packages.${system}.default}/bin/mcp-wiki-server";
        };

        # POC app (with Docker)
        apps.poc = {
          type = "app";
          program = toString (pkgs.writeShellScript "mcp-wiki-poc" ''
            cd "$(pwd)/poc-private-wiki" && ${pkgs.docker-compose}/bin/docker-compose up
          '');
        };

        # POC build app
        apps.pocbuild = {
          type = "app";
          program = toString (pkgs.writeShellScript "mcp-wiki-poc-build" ''
            cd "$(pwd)/poc-private-wiki" && ${pkgs.docker-compose}/bin/docker-compose build
          '');
        };

        # POC detached app
        apps.pocdetach = {
          type = "app";
          program = toString (pkgs.writeShellScript "mcp-wiki-poc-detach" ''
            cd "$(pwd)/poc-private-wiki" && ${pkgs.docker-compose}/bin/docker-compose up -d
          '');
        };

        # POC stop app
        apps.pocstop = {
          type = "app";
          program = toString (pkgs.writeShellScript "mcp-wiki-poc-stop" ''
            cd "$(pwd)/poc-private-wiki" && ${pkgs.docker-compose}/bin/docker-compose down
          '');
        };

        # Test apps
        apps.test = {
          type = "app";
          program = toString (pkgs.writeShellScript "mcp-wiki-test" ''
            ${nodejs}/bin/node $(pwd)/tests/simple-test.js
          '');
        };

        apps.interactive = {
          type = "app";
          program = toString (pkgs.writeShellScript "mcp-wiki-interactive-test" ''
            ${nodejs}/bin/node $(pwd)/tests/test-interactive.js
          '');
        };

        apps.query = {
          type = "app";
          program = toString (pkgs.writeShellScript "mcp-wiki-query-test" ''
            ${nodejs}/bin/node $(pwd)/tests/query-test.js
          '');
        };

        apps.content = {
          type = "app";
          program = toString (pkgs.writeShellScript "mcp-wiki-content-test" ''
            ${nodejs}/bin/node $(pwd)/tests/content-fetch-test.js
          '');
        };

        apps.auth = {
          type = "app";
          program = toString (pkgs.writeShellScript "mcp-wiki-auth-test" ''
            ${nodejs}/bin/node $(pwd)/tests/auth-test.js
          '');
        };

        apps.setupvscode = {
          type = "app";
          program = "${self.packages.${system}.setupvscode}/bin/mcp-wiki-setup-vscode";
        };

        # POC test apps
        apps.authpoc = {
          type = "app";
          program = toString (pkgs.writeShellScript "mcp-wiki-auth-poc-test" ''
            cd "$(pwd)/poc-private-wiki" && ${nodejs}/bin/node test-auth-poc.js
          '');
        };

        apps.authintegration = {
          type = "app";
          program = toString (pkgs.writeShellScript "mcp-wiki-auth-integration-test" ''
            cd "$(pwd)/poc-private-wiki" && ${nodejs}/bin/node auth-integration-test.js
          '');
        };

        apps.pocinteractive = {
          type = "app";
          program = toString (pkgs.writeShellScript "mcp-wiki-poc-interactive" ''
            cd "$(pwd)/poc-private-wiki" && ${nodejs}/bin/node interactive-test-client.js
          '');
        };

        apps.pocmonitor = {
          type = "app";
          program = toString (pkgs.writeShellScript "mcp-wiki-poc-monitor" ''
            cd "$(pwd)/poc-private-wiki" && ${nodejs}/bin/node monitor-containers.js
          '');
        };

        apps.pocmenu = {
          type = "app";
          program = toString (pkgs.writeShellScript "mcp-wiki-poc-menu" ''
            cd "$(pwd)/poc-private-wiki" && ./test-menu.sh
          '');
        };

        apps.pocalltest = {
          type = "app";
          program = toString (pkgs.writeShellScript "mcp-wiki-poc-all-tests" ''
            cd "$(pwd)/poc-private-wiki" && ./run-all-tests.sh
          '');
        };

        # All tests app (main + POC)
        apps.testall = {
          type = "app";
          program = toString (pkgs.writeShellScript "mcp-wiki-test-all" ''
            echo "Running main tests..."
            for test in simple-test.js test-interactive.js query-test.js content-fetch-test.js auth-test.js; do
              echo "Running test: $test"
              ${nodejs}/bin/node $(pwd)/tests/$test
              echo "------------------------------------"
            done

            echo "Running POC tests..."
            cd "$(pwd)/poc-private-wiki" && ./run-all-tests.sh
          '');
        };
      }
    );
}
