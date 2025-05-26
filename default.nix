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

  meta = with lib; {
    description = "MCP server for referencing and templating wiki content from multiple URLs";
    homepage = "https://github.com/yourusername/mcp-internal-wiki"; # Replace with your repo URL
    license = licenses.mit;
    maintainers = with maintainers; [
      /*
      Add maintainers here
      */
    ];
    platforms = platforms.all;
  };
}
