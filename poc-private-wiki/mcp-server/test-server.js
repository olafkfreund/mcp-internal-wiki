// Simple express-based MCP server for testing
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const { AIService } = require('./dist/ai/aiService');
const { MockProvider } = require('./dist/ai/mockProvider');
const { OpenAIProvider } = require('./dist/ai/openAIProvider');
const { GeminiProvider } = require('./dist/ai/geminiProvider');
const { AzureOpenAIProvider } = require('./dist/ai/azureOpenAIProvider');
const { calculateCosineSimilarity } = require('./dist/ai/utilities');
const { WikiContentAgent } = require('./dist/agents/WikiContentAgent');
const { AIRelevanceAgent } = require('./dist/agents/AIRelevanceAgent');
const { WikiIndexAgent } = require('./dist/agents/WikiIndexAgent');

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

// Load AI service configuration
const aiService = new AIService({
  providers: [
    new MockProvider(),
    new OpenAIProvider(),
    new GeminiProvider(),
    new AzureOpenAIProvider()
  ]
});

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
  console.log('Handling initialize request:', JSON.stringify(request, null, 2));
  
  const response = {
    jsonrpc: '2.0',
    id: request.id,
    result: {
      protocolVersion: "2024-11-05",
      capabilities: {
        resources: {},
        tools: {},
        prompts: {}
      },
      serverInfo: {
        name: "MCP Wiki Server",
        version: "1.0.0"
      }
    }
  };
  
  console.log('Sending initialize response:', JSON.stringify(response, null, 2));
  res.setHeader('Content-Type', 'application/json');
  res.json(response);
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

    // AI scoring and summary
    const provider = aiService.getPrimaryProvider();
    if (provider) {
      for (const result of results) {
        try {
          result.relevanceScore = await provider.calculateRelevance(query, result.content);
          result.summary = await provider.summarizeContent(result.content, 200);
        } catch (err) {
          result.relevanceScore = 0.5;
          result.summary = '';
        }
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

// Add agent-based endpoints for Docker POC
app.post('/agent/wiki-content', async (req, res) => {
  const { query, maxResults, minRelevanceScore } = req.body;
  const agent = new WikiContentAgent();
  await agent.initialize();
  const result = await agent.run({ query, maxResults, minRelevanceScore });
  await agent.shutdown();
  res.json(result);
});

app.post('/agent/ai-relevance', async (req, res) => {
  const { query, contents, minScore } = req.body;
  const agent = new AIRelevanceAgent();
  const result = await agent.run({ query, contents, minScore });
  res.json(result);
});

app.post('/agent/wiki-index', async (req, res) => {
  const { rebuild } = req.body;
  const agent = new WikiIndexAgent();
  const result = await agent.run({ rebuild });
  res.json(result);
});

// Start the server
app.listen(PORT, () => {
  console.log(`MCP test server running at http://localhost:${PORT}`);
});
