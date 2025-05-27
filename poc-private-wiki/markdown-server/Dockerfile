# Dockerfile for Markdown Server with Authentication
FROM node:18-alpine

# Install curl for healthchecks
RUN apk --no-cache add curl

# Create app directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json ./

# Install app dependencies
RUN npm install

# Generate content directory structure
RUN mkdir -p /app/content/aws-servers

# Copy source files
COPY server.js generate-docs.js ./

# Generate AWS server documentation
RUN node generate-docs.js

# Expose port
EXPOSE 3001

# Start the server
CMD ["npm", "start"]
