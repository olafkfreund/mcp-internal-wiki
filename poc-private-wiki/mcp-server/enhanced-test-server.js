// Enhanced MCP test server for POC with generate_project tool and JSON parsing fixes
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

// Enhanced JSON parsing methods from CodeGenerationAgent
function sanitizeJsonString(jsonStr) {
  if (!jsonStr || typeof jsonStr !== 'string') {
    return jsonStr;
  }

  // Handle content fields that might contain unescaped newlines and quotes
  return jsonStr.replace(
    /"content"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/g,
    (match, content) => {
      // Escape newlines, quotes, and backslashes in content
      const sanitized = content
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
      return `"content": "${sanitized}"`;
    }
  );
}

function parseProjectStructureResponse(response) {
  if (!response || typeof response !== 'string') {
    console.log('Invalid response type, using fallback structure');
    return createFallbackStructure();
  }

  console.log(`Parsing response of length: ${response.length}`);
  console.log('First 200 chars:', response.substring(0, 200));

  // Try multiple parsing strategies
  const strategies = [
    () => parseDirectJson(response),
    () => parseFromCodeBlock(response),
    () => parseSanitizedJson(response),
    () => parseReconstructedJson(response),
    () => parseWithEval(response)
  ];

  for (const [index, strategy] of strategies.entries()) {
    try {
      console.log(`Attempting parsing strategy ${index + 1}`);
      const result = strategy();
      if (result && typeof result === 'object') {
        console.log(`✅ Success with strategy ${index + 1}`);
        return result;
      }
    } catch (error) {
      console.log(`❌ Strategy ${index + 1} failed:`, error.message);
      if (error.message.includes('JSON at position')) {
        const position = parseInt(error.message.match(/position (\d+)/)?.[1]);
        if (position) {
          const context = response.substring(Math.max(0, position - 50), position + 50);
          console.log(`Context around error position ${position}:`, JSON.stringify(context));
        }
      }
    }
  }

  console.log('All parsing strategies failed, using fallback structure');
  return createFallbackStructure();
}

function parseDirectJson(response) {
  return JSON.parse(response);
}

function parseFromCodeBlock(response) {
  // Extract JSON from markdown code blocks
  const patterns = [
    /```json\s*\n([\s\S]*?)\n\s*```/,
    /```\s*\n([\s\S]*?)\n\s*```/,
    /`([\s\S]*?)`/
  ];

  for (const pattern of patterns) {
    const match = response.match(pattern);
    if (match) {
      console.log('Found potential JSON in code block');
      return JSON.parse(match[1].trim());
    }
  }
  
  throw new Error('No JSON code block found');
}

function parseSanitizedJson(response) {
  const sanitized = sanitizeJsonString(response);
  console.log('Attempting to parse sanitized JSON');
  return JSON.parse(sanitized);
}

function parseReconstructedJson(response) {
  // Try to find and extract a JSON object
  const startIdx = response.indexOf('{');
  const endIdx = response.lastIndexOf('}');
  
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const jsonPart = response.substring(startIdx, endIdx + 1);
    console.log('Extracted JSON part:', jsonPart.substring(0, 100) + '...');
    return JSON.parse(sanitizeJsonString(jsonPart));
  }
  
  throw new Error('No JSON object boundaries found');
}

function parseWithEval(response) {
  console.log('⚠️  Attempting eval-based parsing (last resort)');
  // This is a last resort and should be used carefully
  const sanitized = sanitizeJsonString(response);
  return eval('(' + sanitized + ')');
}

function createFallbackStructure() {
  return {
    files: [
      {
        path: "package.json",
        content: JSON.stringify({
          name: "generated-project",
          version: "1.0.0",
          description: "Generated project structure",
          main: "index.js",
          scripts: {
            start: "node index.js",
            test: "echo \"Error: no test specified\" && exit 1"
          }
        }, null, 2)
      },
      {
        path: "index.js",
        content: "console.log('Hello, World!');\n"
      },
      {
        path: "README.md",
        content: "# Generated Project\n\nThis is a basic project structure generated by the MCP server.\n"
      }
    ],
    structure: "Basic project structure with package.json, index.js, and README.md",
    generationMethod: "fallback"
  };
}

async function buildProjectStructurePrompt(projectName, description, projectType, features) {
  return `Generate a complete project structure for a ${projectType} project.

Project Details:
- Name: ${projectName}
- Description: ${description}
- Type: ${projectType}
- Features: ${features ? features.join(', ') : 'basic setup'}

Requirements:
1. Return ONLY valid JSON, no markdown formatting or code blocks
2. Use proper JSON escape sequences for all content
3. Escape newlines as \\n, quotes as \\", and backslashes as \\\\
4. Include realistic, functional code for each file
5. Ensure all JSON strings are properly terminated

JSON Structure:
{
  "files": [
    {
      "path": "relative/file/path",
      "content": "file content with proper escaping"
    }
  ],
  "structure": "description of the project structure",
  "generationMethod": "ai-generated"
}

Generate the JSON now:`;
}

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

    case 'tools/list':
      handleToolsList(request, res);
      break;

    case 'tools/call':
      await handleToolsCall(request, res);
      break;
      
    default:
      res.json({
        jsonrpc: '2.0',
        id: request.id,
        error: { code: -32601, message: `Method not found: ${request.method}` }
      });
  }
});

function handleToolsList(request, res) {
  console.log('Handling tools/list request');
  
  const response = {
    jsonrpc: '2.0',
    id: request.id,
    result: {
      tools: [
        {
          name: 'generate_project',
          description: 'Generate a complete project structure with files and code',
          inputSchema: {
            type: 'object',
            properties: {
              projectName: {
                type: 'string',
                description: 'Name of the project to generate'
              },
              description: {
                type: 'string',
                description: 'Description of what the project should do'
              },
              projectType: {
                type: 'string',
                description: 'Type of project (e.g., nodejs, python, web, etc.)'
              },
              features: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of features to include in the project'
              }
            },
            required: ['projectName', 'description']
          }
        }
      ]
    }
  };
  
  console.log('Sending tools/list response');
  res.json(response);
}

async function handleToolsCall(request, res) {
  console.log('Handling tools/call request:', request.params);
  
  const { name, arguments: args } = request.params || {};
  
  if (name === 'generate_project') {
    try {
      const { projectName, description, projectType = 'nodejs', features = [] } = args || {};
      
      if (!projectName || !description) {
        return res.json({
          jsonrpc: '2.0',
          id: request.id,
          error: { code: -32602, message: 'Missing required parameters: projectName and description' }
        });
      }

      console.log(`Generating project: ${projectName}`);
      
      // Build the prompt
      const prompt = await buildProjectStructurePrompt(projectName, description, projectType, features);
      console.log('Generated prompt length:', prompt.length);

      // Get AI response
      const aiResponse = await aiService.generateResponse(prompt, {
        temperature: 0.3,
        maxTokens: 2000
      });

      console.log('AI response length:', aiResponse?.length || 0);
      console.log('AI response preview:', aiResponse?.substring(0, 200));

      // Parse the response using our enhanced parsing
      const projectStructure = parseProjectStructureResponse(aiResponse);
      
      console.log(`Successfully generated project structure with ${projectStructure.files?.length || 0} files`);

      const response = {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(projectStructure, null, 2)
            }
          ]
        }
      };

      res.json(response);

    } catch (error) {
      console.error('Error in generate_project:', error);
      
      const fallbackStructure = createFallbackStructure();
      
      const response = {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(fallbackStructure, null, 2)
            }
          ]
        }
      };

      res.json(response);
    }
  } else {
    res.json({
      jsonrpc: '2.0',
      id: request.id,
      error: { code: -32601, message: `Tool not found: ${name}` }
    });
  }
}

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
        name: "MCP Wiki Server with Project Generation",
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
          content: `Could not fetch content: ${error.message}`,
          url: url,
          source: 'error'
        });
      }
    }

    res.json({
      jsonrpc: '2.0',
      id: request.id,
      result: results
    });

  } catch (error) {
    console.error('Error in handleGetContext:', error);
    res.json({
      jsonrpc: '2.0',
      id: request.id,
      error: { code: -32603, message: 'Internal error', data: error.message }
    });
  }
}

function handleListSources(request, res) {
  console.log('Handling listSources request');
  
  const sources = config.wikiUrls.map(url => ({
    name: url.split('/').pop(),
    url: url,
    type: 'wiki'
  }));

  res.json({
    jsonrpc: '2.0',
    id: request.id,
    result: sources
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
  console.log(`Enhanced MCP test server with JSON parsing fixes running at http://localhost:${PORT}`);
});
