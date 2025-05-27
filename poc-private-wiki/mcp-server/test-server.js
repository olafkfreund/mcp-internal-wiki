// Simple express-based MCP server for testing
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Use middleware to parse JSON
app.use(bodyParser.json());

// Simple in-memory cache
const cache = {};

// Configure wiki sources
const config = {
  wikiUrls: ["http://markdown-server:3001/aws-servers/aws-server-001"],
  auth: [{
    urlPattern: "^http://markdown-server:3001",
    type: "basic",
    username: "admin",
    password: "secret"
  }]
};

// Handle JSON-RPC requests
app.post('/', async (req, res) => {
  const request = req.body;
  console.log('Received request:', JSON.stringify(request, null, 2));

  // Validate JSON-RPC request
  if (!request.jsonrpc || request.jsonrpc !== '2.0' || !request.method) {
    return res.status(400).json({
      jsonrpc: '2.0',
      id: request.id || null,
      error: { code: -32600, message: 'Invalid Request' }
    });
  }

  // Handle methods
  switch (request.method) {
    case 'initialize':
      handleInitialize(request, res);
      break;
      
    case 'getContext':
      await handleGetContext(request, res);
      break;
      
    case 'listSources':
      handleListSources(request, res);
      break;
      
    default:
      res.json({
        jsonrpc: '2.0',
        id: request.id,
        error: { code: -32601, message: `Method not found: ${request.method}` }
      });
  }
});

function handleInitialize(request, res) {
  res.json({
    jsonrpc: '2.0',
    id: request.id,
    result: {
      name: 'MCP Wiki Server',
      version: '1.0.0',
      capabilities: ['fetch-context'],
      sources: ['wiki']
    }
  });
}

async function handleGetContext(request, res) {
  try {
    const query = request.params?.query?.text || '';
    if (!query) {
      return res.json({
        jsonrpc: '2.0',
        id: request.id,
        result: []
      });
    }

    console.log(`Processing query: "${query}"`);
    
    const results = [];
    
    // Process each wiki URL
    for (const url of config.wikiUrls) {
      try {
        // Check if we need authentication
        const authConfig = findAuthConfig(url);
        const requestConfig = createRequestConfig(authConfig);
        
        console.log(`Fetching content from ${url} with auth: ${!!authConfig}`);
        
        const response = await axios.get(url, requestConfig);
        
        if (response.data) {
          results.push({
            title: `Wiki Content from ${url.split('/').pop()}`,
            content: typeof response.data === 'string' 
              ? response.data.substring(0, 500) // Truncate long content
              : JSON.stringify(response.data),
            url: url,
            source: 'wiki'
          });
          
          console.log(`Successfully fetched content from ${url}`);
        }
      } catch (error) {
        console.error(`Error fetching from ${url}:`, error.message);
        if (error.response) {
          console.error(`Status: ${error.response.status}`);
        }
        
        // Add mock result on error
        results.push({
          title: `Error fetching from ${url.split('/').pop()}`,
          content: `Error: ${error.message}`,
          url: url,
          source: 'wiki'
        });
      }
    }
    
    res.json({
      jsonrpc: '2.0',
      id: request.id,
      result: results
    });
  } catch (error) {
    console.error('Error processing getContext:', error);
    res.json({
      jsonrpc: '2.0',
      id: request.id,
      error: { code: -32000, message: error.message }
    });
  }
}

function handleListSources(request, res) {
  res.json({
    jsonrpc: '2.0',
    id: request.id,
    result: ['wiki']
  });
}

function findAuthConfig(url) {
  return config.auth.find(auth => {
    try {
      const pattern = new RegExp(auth.urlPattern);
      return pattern.test(url);
    } catch (error) {
      return false;
    }
  });
}

function createRequestConfig(authConfig) {
  if (!authConfig) return {};
  
  const config = { headers: {} };
  
  switch (authConfig.type) {
    case 'basic':
      if (authConfig.username && authConfig.password) {
        const credentials = Buffer.from(`${authConfig.username}:${authConfig.password}`).toString('base64');
        config.headers['Authorization'] = `Basic ${credentials}`;
        console.log('Added Basic auth header');
      }
      break;
      
    case 'token':
      if (authConfig.token) {
        config.headers['Authorization'] = `Bearer ${authConfig.token}`;
      }
      break;
      
    case 'custom':
      if (authConfig.headerName && authConfig.headerValue) {
        config.headers[authConfig.headerName] = authConfig.headerValue;
      }
      break;
  }
  
  return config;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`MCP test server running at http://localhost:${PORT}`);
});
