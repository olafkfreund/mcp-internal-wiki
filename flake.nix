{
  description = "MCP Internal Wiki Server (Node.js/TypeScript)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.05";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
  }:
    flake-utils.lib.eachDefaultSystem (
      system: let
        pkgs = import nixpkgs {inherit system;};
        nodejs = pkgs.nodejs_20;
        yarn = pkgs.yarn;
        typescript = pkgs.nodePackages.typescript;
        ts-node = pkgs.nodePackages.ts-node;
        jest = pkgs.nodePackages.jest;
        supertest = pkgs.nodePackages.supertest;
        marked = pkgs.nodePackages.marked;
      in {
        devShells.default = pkgs.mkShell {
          name = "mcp-internal-wiki-devshell";
          buildInputs = [
            nodejs
            yarn
            typescript
            ts-node
            jest
            pkgs.git
            pkgs.curl
            pkgs.openssl
          ];
          shellHook = ''
            export NODE_ENV=development
            echo "MCP Internal Wiki DevShell loaded. Node: $(node --version)"
          '';
        };
        packages.default = pkgs.stdenv.mkDerivation {
          pname = "mcp-internal-wiki";
          version = "1.0.0";
          src = ./.;
          buildInputs = [nodejs yarn];
          buildPhase = ''
            yarn install --frozen-lockfile || npm install
            yarn build || npm run build
          '';
          installPhase = ''
            mkdir -p $out
            cp -r dist package.json $out/
          '';
        };
        apps.default = {
          type = "app";
          program = "${pkgs.nodejs_20}/bin/node ./dist/server.js";
        };
      }
    );
}
