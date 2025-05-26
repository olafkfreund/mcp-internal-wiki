# Development Guide with Nix

This guide explains how to use Nix for development, building, testing, and running the MCP Wiki Server.

## Prerequisites

- [Nix package manager](https://nixos.org/download.html) installed
- [Nix Flakes enabled](https://nixos.wiki/wiki/Flakes)

## Development Environment

The project includes a development shell with all necessary dependencies.

### Enter Development Shell

```bash
# Enter the development shell
nix develop

# Or using justfile
just nix-shell
```

Inside the development shell, you'll have access to:

- Node.js 20
- TypeScript
- Jest
- Just task runner
- All other dependencies

## Building

### Build with Nix

```bash
# Build the project using Nix
nix build

# Or using justfile
just nix-build
```

This will:
1. Install dependencies
2. Compile TypeScript
3. Create an executable package

### What gets built?

The build process creates:

- A Nix package containing the compiled MCP server
- An executable binary at `./result/bin/mcp-wiki-server`
- A lib directory with all necessary files

## Running

### Run with Nix

```bash
# Run the MCP server directly with Nix
nix run

# Or using justfile
just nix-run
```

### Execute the built binary

```bash
# After building, run the binary directly
./result/bin/mcp-wiki-server
```

## Testing

### Simple Test

```bash
# Run the simple test with Nix
nix run .#test

# Or using justfile
just nix-test
```

### Interactive Test

```bash
# Run the interactive test with Nix
nix run .#interactive

# Or using justfile
just nix-test-interactive
```

## VS Code Integration

Set up VS Code integration using Nix:

```bash
# Configure VS Code settings using Nix
nix run .#setupvscode

# Or using justfile
just nix-setup-vscode
```

This will create the necessary `.vscode/settings.json` file to enable MCP server integration.

## Creating a Release

```bash
# Create a release build
nix build -L
```

You can distribute the `result` directory or use the package in a Nix environment.

## Advanced Usage

### Adding Dependencies

If you need to add new dependencies, update:

1. `package.json` for npm dependencies
2. The `buildInputs` in `flake.nix` for Nix dependencies

### Updating Nix Packages

To update Nix packages:

```bash
# Update flake inputs
nix flake update
```

This will update to the latest compatible packages from nixpkgs.

## Troubleshooting

If you encounter issues:

1. **Build failures**: Check Node.js version compatibility and TypeScript errors
2. **Runtime errors**: Verify paths and permissions in the built package
3. **VS Code integration**: Restart VS Code after setup and check the MCP extension is installed
