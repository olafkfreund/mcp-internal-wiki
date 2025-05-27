#!/usr/bin/env node

/**
 * Test script for content transformation and code generation capabilities
 */

const { MCPServer } = require('../dist/mcpServer.js');

class TransformationTester {
  constructor() {
    try {
      this.mcpServer = new MCPServer();
      this.testResults = [];
    } catch (error) {
      console.error('❌ Failed to initialize MCPServer:', error);
      throw error;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Content Transformation and Code Generation Tests\n');

    await this.testMarkdownToTypeScript();
    await this.testWikiToDockerfile();
    await this.testGenerateProjectStructure();
    await this.testCodePatternExtraction();

    this.printSummary();
  }

  async testMarkdownToTypeScript() {
    console.log('📝 Test 1: Markdown to TypeScript transformation');
    
    const markdownContent = `
# User Service API

This service handles user authentication and profile management.

## Configuration

The service requires the following environment variables:
- DATABASE_URL: PostgreSQL connection string
- JWT_SECRET: Secret key for JWT tokens
- PORT: Server port (default: 3000)

## Endpoints

### POST /api/auth/login
Authenticate user with email and password.

### GET /api/users/:id
Get user profile by ID.

### PUT /api/users/:id
Update user profile.

## Example Usage

\`\`\`typescript
const userService = new UserService({
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET
});

await userService.authenticate(email, password);
\`\`\`
`;

    try {
      const request = {
        jsonrpc: '2.0',
        id: 'test-1',
        method: 'wiki/transform',
        params: {
          content: markdownContent,
          targetLanguage: 'typescript',
          framework: 'express',
          projectType: 'api-server'
        }
      };

      await this.makeRequest(request, 'Markdown → TypeScript');
    } catch (error) {
      this.recordError('Markdown → TypeScript', error);
    }
  }

  async testWikiToDockerfile() {
    console.log('🐳 Test 2: Wiki content to Dockerfile');
    
    const wikiContent = `
# Node.js Application Deployment

## Requirements
- Node.js 18 or higher
- npm or yarn package manager
- Port 3000 exposed
- Health check endpoint at /health

## Setup Steps
1. Install dependencies with npm install
2. Build the application with npm run build
3. Start with npm start
4. Monitor with health checks every 30 seconds

## Security
- Run as non-root user
- Use Alpine Linux for smaller image size
- Set proper file permissions
`;

    try {
      const request = {
        jsonrpc: '2.0',
        id: 'test-2',
        method: 'wiki/transform',
        params: {
          content: wikiContent,
          targetLanguage: 'dockerfile',
          projectType: 'node-app'
        }
      };

      await this.makeRequest(request, 'Wiki → Dockerfile');
    } catch (error) {
      this.recordError('Wiki → Dockerfile', error);
    }
  }

  async testGenerateProjectStructure() {
    console.log('🏗️  Test 3: Generate complete project structure');
    
    try {
      const request = {
        jsonrpc: '2.0',
        id: 'test-3',
        method: 'wiki/generateProject',
        params: {
          projectType: 'microservice',
          language: 'typescript',
          framework: 'express',
          features: ['authentication', 'database', 'logging', 'testing'],
          projectName: 'user-service'
        }
      };

      await this.makeRequest(request, 'Generate Project Structure');
    } catch (error) {
      this.recordError('Generate Project Structure', error);
    }
  }

  async testCodePatternExtraction() {
    console.log('🔍 Test 4: Extract code patterns from wiki content');
    
    const patternContent = `
# Database Configuration Patterns

## Connection Pool Setup
Configure connection pooling for better performance:

\`\`\`javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
\`\`\`

## Migration Script
Use this pattern for database migrations:

\`\`\`sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

## Error Handling
Implement proper error handling:

\`\`\`typescript
try {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  return result.rows[0];
} catch (error) {
  logger.error('Database query failed:', error);
  throw new DatabaseError('Failed to fetch user');
}
\`\`\`
`;

    try {
      const request = {
        jsonrpc: '2.0',
        id: 'test-4',
        method: 'wiki/generate',
        params: {
          wikiContent: patternContent,
          targetLanguage: 'typescript',
          framework: 'node',
          projectType: 'database-service'
        }
      };

      await this.makeRequest(request, 'Extract Code Patterns');
    } catch (error) {
      this.recordError('Extract Code Patterns', error);
    }
  }

  async makeRequest(request, testName) {
    return new Promise((resolve) => {
      this.mcpServer.handleRequest(request, (response) => {
        if (response.error) {
          this.recordError(testName, new Error(response.error.message));
        } else {
          this.recordSuccess(testName, response.result);
        }
        resolve(response);
      });
    });
  }

  recordSuccess(testName, result) {
    this.testResults.push({
      test: testName,
      status: 'PASS',
      result: result
    });
    
    console.log(`✅ ${testName}: PASSED`);
    
    if (result.generated && Array.isArray(result.generated)) {
      console.log(`   Generated ${result.generated.length} file(s):`);
      result.generated.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file.filename} (${file.language})`);
      });
    }
    
    if (result.metadata) {
      console.log(`   Processing time: ${result.metadata.processingTime}ms`);
      console.log(`   Code blocks generated: ${result.metadata.codeBlocksGenerated}`);
    }
    
    console.log('');
  }

  recordError(testName, error) {
    this.testResults.push({
      test: testName,
      status: 'FAIL',
      error: error.message
    });
    
    console.log(`❌ ${testName}: FAILED`);
    console.log(`   Error: ${error.message}\n`);
  }

  printSummary() {
    console.log('📊 Test Summary');
    console.log('================');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    
    console.log(`Total tests: ${this.testResults.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    
    if (failed > 0) {
      console.log('\n❌ Failed tests:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(r => {
          console.log(`   - ${r.test}: ${r.error}`);
        });
    }
    
    console.log(`\n${failed === 0 ? '🎉 All tests passed!' : '⚠️  Some tests failed'}`);
  }
}

// Interactive mode
async function runInteractiveDemo() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const mcpServer = new MCPServer();

  console.log('🎮 Interactive Transformation Demo');
  console.log('==================================');
  console.log('Enter wiki/markdown content and see it transformed into code!\n');

  while (true) {
    const content = await question(rl, 'Enter content (or "quit" to exit): ');
    if (content.toLowerCase() === 'quit') break;

    const language = await question(rl, 'Target language (typescript/python/dockerfile): ');
    const framework = await question(rl, 'Framework (optional): ');

    console.log('\n🔄 Transforming...\n');

    const request = {
      jsonrpc: '2.0',
      id: 'interactive',
      method: 'wiki/transform',
      params: {
        content,
        targetLanguage: language,
        framework: framework || undefined
      }
    };

    mcpServer.handleRequest(request, (response) => {
      if (response.error) {
        console.log(`❌ Error: ${response.error.message}\n`);
      } else {
        console.log('✅ Transformation Result:');
        console.log('========================');
        
        if (response.result.generated) {
          response.result.generated.forEach((file, index) => {
            console.log(`\n📄 File ${index + 1}: ${file.filename}`);
            console.log('```' + file.language);
            console.log(file.content);
            console.log('```');
            
            if (file.dependencies.length > 0) {
              console.log(`Dependencies: ${file.dependencies.join(', ')}`);
            }
          });
        }
        
        console.log('\n');
      }
    });
  }

  rl.close();
}

function question(rl, prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// Main execution
async function main() {
  try {
    const args = process.argv.slice(2);
    
    if (args.includes('--interactive') || args.includes('-i')) {
      await runInteractiveDemo();
    } else {
      const tester = new TransformationTester();
      await tester.runAllTests();
    }
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { TransformationTester };
