# Dockerfile for Markdown Server with Authentication
FROM node:18-alpine

# Install curl for healthchecks
RUN apk --no-cache add curl

# Create app directory
WORKDIR /app

# Copy package.json and package-lock.json from the correct relative path (project root context)
COPY poc-private-wiki/markdown-server/package.json ./

# Install app dependencies
RUN npm install

# Generate content directory structure
RUN mkdir -p /app/content/aws-servers

# Copy source files
COPY poc-private-wiki/markdown-server/server.js poc-private-wiki/markdown-server/generate-docs.js ./

# Generate AWS server documentation
RUN node generate-docs.js

# Expose port
EXPOSE 3001

# Start the server
CMD ["npm", "start"]
