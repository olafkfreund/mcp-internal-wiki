# Dockerfile for MCP Server
FROM node:18-alpine

# Install curl for healthchecks
RUN apk --no-cache add curl

# Create app directory
WORKDIR /app

# Install required packages
RUN npm init -y && \
    npm install express axios body-parser

# Copy our test server and config
COPY test-server.js ./server.js
COPY mcp.config.json ./mcp.config.json

# Expose port for HTTP API
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]
