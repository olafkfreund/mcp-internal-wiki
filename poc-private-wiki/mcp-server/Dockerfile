# Dockerfile for MCP Server
FROM node:18-alpine

# Install curl for healthchecks
RUN apk --no-cache add curl

# Create app directory
WORKDIR /app

# Install required packages
RUN npm init -y && \
    npm install express axios body-parser

# Copy our test server and config from the correct relative path (project root context)
COPY poc-private-wiki/mcp-server/test-server.js ./server.js
COPY poc-private-wiki/mcp-server/mcp.config.json ./mcp.config.json

# Copy the compiled JavaScript files from the build context root
COPY dist ./dist

# Expose port for HTTP API
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]
