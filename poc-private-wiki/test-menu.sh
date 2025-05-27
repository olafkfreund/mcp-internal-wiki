#!/bin/bash

# POC Test Menu Launcher
# This script launches the interactive test menu for the MCP Private Wiki POC

# Determine the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Execute the Node.js test runner script
node "${SCRIPT_DIR}/test-runner.js" "$@"
