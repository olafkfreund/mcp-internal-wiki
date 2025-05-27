#!/bin/bash

# Script to fully restart the POC
echo "Stopping containers..."
docker-compose down

echo "Cleaning up any remaining containers..."
docker ps -a | grep 'mcp-server\|markdown-server' | awk '{print $1}' | xargs -r docker rm -f

echo "Rebuilding containers..."
docker-compose build --no-cache

echo "Starting containers..."
docker-compose up -d

echo "Waiting for services to start (30 seconds)..."
sleep 30

echo "Testing services..."
./check-services.sh

echo "POC has been successfully restarted!"
echo "You can now run tests with: npm test"
