// Test the Dockerfile template with the actual template engine
const fs = require('fs');
const path = require('path');

// Create a test file with actual examples
const testDockerfile = `
# Example 1: Basic Node.js application
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]

# Example 2: Full configuration
FROM node:16-alpine
WORKDIR /usr/src/app
# Install system packages
RUN apk add --no-cache curl git bash
COPY package*.json ./
RUN npm ci
COPY . .
# Build application
RUN npm run build
# Create non-root user
RUN addgroup -g 1001 -S appuser && \\
    adduser -S appuser -u 1001 && \\
    chown -R appuser:appuser /usr/src/app
# Expose port
EXPOSE 8080
USER appuser
# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1
# Start application
CMD ["node", "dist/server.js"]
`;

// Write the test file
fs.writeFileSync('test-dockerfile-examples.txt', testDockerfile);
console.log('Test Dockerfile examples written to test-dockerfile-examples.txt');

// Display the original template
console.log('\nOriginal template:');
const template = fs.readFileSync(path.join(__dirname, 'templates', 'dockerfile.hbs'), 'utf-8');
console.log(template);
