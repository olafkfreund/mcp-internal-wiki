# Dockerfile for MCP Server
FROM node:18-alpine

# Install curl for healthchecks
RUN apk --no-cache add curl

# Create app directory
WORKDIR /app

# Install required packages
RUN npm init -y && \
    npm install express axios body-parser marked

# Copy our simplified enhanced test server and config
COPY simplified-enhanced-server.js ./server.js
COPY mcp.config.json ./mcp.config.json

# Expose port for HTTP API
EXPOSE 3000

# Start the simplified enhanced server with JSON parsing fixes
CMD ["node", "server.js"]
