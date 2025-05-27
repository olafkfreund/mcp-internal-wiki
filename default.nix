# NixOS module for MCP Internal Wiki Server.
# This is the default.nix file referenced in the NixOS module.
{
  lib,
  stdenv,
  nodejs,
  makeWrapper,
  fetchFromGitHub,
}:
stdenv.mkDerivation rec {
  pname = "mcp-internal-wiki";
  version = "1.0.0";

  # For local development, use:
  # src = ./.;

  # For actual packaging, use:
  src = fetchFromGitHub {
    owner = "yourusername"; # Replace with your GitHub username
    repo = pname;
    rev = "v${version}"; # Tag name
    sha256 = "0000000000000000000000000000000000000000000000000000"; # Replace with actual hash
    # To get the hash: nix-prefetch-url --unpack https://github.com/username/repo/archive/v1.0.0.tar.gz
  };

  nativeBuildInputs = [makeWrapper];
  buildInputs = [nodejs];

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

    # Copy tests directory for testing
    mkdir -p $out/lib/node_modules/mcp-internal-wiki/tests
    if [ -d tests ]; then
      cp -r tests $out/lib/node_modules/mcp-internal-wiki/
    fi

    # Copy POC private wiki directory if it exists
    if [ -d poc-private-wiki ]; then
      mkdir -p $out/lib/node_modules/mcp-internal-wiki/poc-private-wiki
      cp -r poc-private-wiki $out/lib/node_modules/mcp-internal-wiki/
      chmod +x $out/lib/node_modules/mcp-internal-wiki/poc-private-wiki/*.sh || true
    fi

    # Create executable with proper environment
    makeWrapper ${nodejs}/bin/node $out/bin/mcp-wiki-server \
      --add-flags "$out/lib/node_modules/mcp-internal-wiki/bin/mcp-wiki-server.js" \
      --set NODE_PATH "$out/lib/node_modules"

    # Ensure the script is executable
    chmod +x $out/lib/node_modules/mcp-internal-wiki/bin/mcp-wiki-server.js

    # Create test script wrappers for main tests
    makeWrapper ${nodejs}/bin/node $out/bin/mcp-wiki-simple-test \
      --add-flags "$out/lib/node_modules/mcp-internal-wiki/tests/simple-test.js" \
      --set NODE_PATH "$out/lib/node_modules"

    makeWrapper ${nodejs}/bin/node $out/bin/mcp-wiki-test-interactive \
      --add-flags "$out/lib/node_modules/mcp-internal-wiki/tests/test-interactive.js" \
      --set NODE_PATH "$out/lib/node_modules"

    makeWrapper ${nodejs}/bin/node $out/bin/mcp-wiki-query-test \
      --add-flags "$out/lib/node_modules/mcp-internal-wiki/tests/query-test.js" \
      --set NODE_PATH "$out/lib/node_modules"

    makeWrapper ${nodejs}/bin/node $out/bin/mcp-wiki-content-test \
      --add-flags "$out/lib/node_modules/mcp-internal-wiki/tests/content-fetch-test.js" \
      --set NODE_PATH "$out/lib/node_modules"

    makeWrapper ${nodejs}/bin/node $out/bin/mcp-wiki-auth-test \
      --add-flags "$out/lib/node_modules/mcp-internal-wiki/tests/auth-test.js" \
      --set NODE_PATH "$out/lib/node_modules"

    # Create POC test script wrappers
    if [ -d "$out/lib/node_modules/mcp-internal-wiki/poc-private-wiki" ]; then
      # Auth POC test
      makeWrapper ${nodejs}/bin/node $out/bin/mcp-wiki-auth-poc \
        --add-flags "$out/lib/node_modules/mcp-internal-wiki/poc-private-wiki/test-auth-poc.js" \
        --set NODE_PATH "$out/lib/node_modules" \
        --run "cd $out/lib/node_modules/mcp-internal-wiki/poc-private-wiki"

      # Auth integration test
      makeWrapper ${nodejs}/bin/node $out/bin/mcp-wiki-auth-integration \
        --add-flags "$out/lib/node_modules/mcp-internal-wiki/poc-private-wiki/auth-integration-test.js" \
        --set NODE_PATH "$out/lib/node_modules" \
        --run "cd $out/lib/node_modules/mcp-internal-wiki/poc-private-wiki"

      # Interactive test client
      makeWrapper ${nodejs}/bin/node $out/bin/mcp-wiki-poc-interactive \
        --add-flags "$out/lib/node_modules/mcp-internal-wiki/poc-private-wiki/interactive-test-client.js" \
        --set NODE_PATH "$out/lib/node_modules" \
        --run "cd $out/lib/node_modules/mcp-internal-wiki/poc-private-wiki"

      # Container monitor
      makeWrapper ${nodejs}/bin/node $out/bin/mcp-wiki-poc-monitor \
        --add-flags "$out/lib/node_modules/mcp-internal-wiki/poc-private-wiki/monitor-containers.js" \
        --set NODE_PATH "$out/lib/node_modules" \
        --run "cd $out/lib/node_modules/mcp-internal-wiki/poc-private-wiki"

      # POC test menu
      makeWrapper $out/lib/node_modules/mcp-internal-wiki/poc-private-wiki/test-menu.sh $out/bin/mcp-wiki-poc-menu \
        --set NODE_PATH "$out/lib/node_modules" \
        --run "cd $out/lib/node_modules/mcp-internal-wiki/poc-private-wiki"

      # Run all POC tests
      makeWrapper $out/lib/node_modules/mcp-internal-wiki/poc-private-wiki/run-all-tests.sh $out/bin/mcp-wiki-poc-all-tests \
        --set NODE_PATH "$out/lib/node_modules" \
        --run "cd $out/lib/node_modules/mcp-internal-wiki/poc-private-wiki"
    fi
  '';

  meta = with lib; {
    description = "MCP server for referencing and templating wiki content from multiple URLs";
    homepage = "https://github.com/yourusername/mcp-internal-wiki"; # Replace with your repo URL
    license = licenses.mit;
    maintainers = [];
    platforms = platforms.all;
  };
}
