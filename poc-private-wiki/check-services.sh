#!/bin/bash

# Script to check if containers are ready
echo "Checking if Docker containers are running..."

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "docker-compose is not installed. Please install it and try again."
    exit 1
fi

# Check if containers are running
if ! docker-compose ps | grep "mcp-server" | grep "Up" > /dev/null; then
    echo "MCP Server container is not running."
    echo "Starting containers with docker-compose up -d..."
    docker-compose up -d
    
    # Wait for containers to be ready
    echo "Waiting for containers to start (30 seconds)..."
    sleep 30
fi

# Check container health
echo "Checking container health..."

# Check markdown server
echo "Testing markdown-server..."
MARKDOWN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -u admin:secret http://localhost:3001)
if [ "$MARKDOWN_RESPONSE" -eq 200 ]; then
    echo "✓ Markdown server is running and authentication is working."
else
    echo "✗ Markdown server is not responding correctly. HTTP status: $MARKDOWN_RESPONSE"
    docker-compose logs markdown-server
    exit 1
fi

# Check MCP server
echo "Testing mcp-server..."
MCP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":"1","method":"initialize","params":{}}' http://localhost:3000)
if [ "$MCP_RESPONSE" -eq 200 ]; then
    echo "✓ MCP server is running."
else
    echo "✗ MCP server is not responding correctly. HTTP status: $MCP_RESPONSE"
    docker-compose logs mcp-server
    exit 1
fi

echo "All services are running. Ready to run tests!"
