/**
 * Simple Markdown Server with Basic Authentication
 * 
 * This server provides a simple API to serve Markdown files with authentication
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const basicAuth = require('basic-auth');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all routes
app.use(cors());

// Basic Authentication Middleware
const authenticate = (req, res, next) => {
  const credentials = basicAuth(req);
  
  // Check credentials against expected values
  // For POC, we're using hardcoded credentials (username: admin, password: secret)
  if (!credentials || credentials.name !== 'admin' || credentials.pass !== 'secret') {
    res.setHeader('WWW-Authenticate', 'Basic realm="AWS Documentation"');
    return res.status(401).send('Authentication required');
  }
  
  // Authentication successful
  next();
};

// Apply authentication to all routes
app.use(authenticate);

// Serve markdown files from content directory
app.get('/aws-servers/:serverName', (req, res) => {
  const serverName = req.params.serverName;
  const filePath = path.join(__dirname, 'content', 'aws-servers', `${serverName}.md`);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).send(`Documentation for server ${serverName} not found`);
  }
  
  // Serve the markdown content
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    res.setHeader('Content-Type', 'text/markdown');
    res.send(content);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    res.status(500).send('Error serving documentation');
  }
});

// List available server documentation
app.get('/aws-servers', (req, res) => {
  const dirPath = path.join(__dirname, 'content', 'aws-servers');
  
  try {
    const files = fs.readdirSync(dirPath)
      .filter(file => file.endsWith('.md'))
      .map(file => file.replace('.md', ''));
    
    res.json({
      count: files.length,
      servers: files
    });
  } catch (error) {
    console.error('Error listing server documentation:', error);
    res.status(500).send('Error listing server documentation');
  }
});

// Root endpoint showing info about the API
app.get('/', (req, res) => {
  res.json({
    name: "AWS Servers Documentation API",
    version: "1.0.0",
    endpoints: [
      { path: "/", method: "GET", description: "API information" },
      { path: "/aws-servers", method: "GET", description: "List all available server documentation" },
      { path: "/aws-servers/:serverName", method: "GET", description: "Get documentation for a specific server" },
      { path: "/health", method: "GET", description: "Health check endpoint" }
    ],
    authentication: "Basic Auth required for all endpoints",
    credentials: {
      username: "admin",
      password: "secret"
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Markdown server with authentication running at http://localhost:${PORT}`);
  console.log(`Authentication required: username=admin, password=secret`);
});
