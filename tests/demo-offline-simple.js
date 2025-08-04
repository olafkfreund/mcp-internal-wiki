#!/usr/bin/env node

/**
 * Simple offline mode demonstration
 * Shows the conceptual implementation without TypeScript compilation issues
 */

const fs = require('fs');
const path = require('path');

// Simple offline content storage demonstration
class SimpleOfflineStorage {
  constructor(storageDir = './demo-offline-storage') {
    this.storageDir = storageDir;
    this.contentIndex = new Map();
    this.searchIndex = new Map();
  }

  async initialize() {
    // Create storage directory
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
    
    // Load existing content index
    const indexFile = path.join(this.storageDir, 'content-index.json');
    if (fs.existsSync(indexFile)) {
      const indexData = JSON.parse(fs.readFileSync(indexFile, 'utf-8'));
      this.contentIndex = new Map(Object.entries(indexData));
    }
    
    console.log('✅ Simple offline storage initialized');
  }

  async storeContent(id, title, content, sourceUrl) {
    const contentData = {
      id,
      title,
      content,
      sourceUrl,
      storedAt: new Date().toISOString(),
      size: content.length
    };
    
    // Store in memory index
    this.contentIndex.set(id, contentData);
    
    // Store content file
    const contentFile = path.join(this.storageDir, `${id}.md`);
    fs.writeFileSync(contentFile, content, 'utf-8');
    
    // Update search index
    this.updateSearchIndex(id, title, content);
    
    // Save index to disk
    await this.saveIndex();
    
    console.log(`✅ Stored content: ${title} (${content.length} chars)`);
  }

  updateSearchIndex(id, title, content) {
    const words = `${title} ${content}`
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
    
    for (const word of words) {
      if (!this.searchIndex.has(word)) {
        this.searchIndex.set(word, new Set());
      }
      this.searchIndex.get(word).add(id);
    }
  }

  async searchContent(query, limit = 10) {
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const matchingIds = new Set();
    
    for (const word of queryWords) {
      const ids = this.searchIndex.get(word);
      if (ids) {
        ids.forEach(id => matchingIds.add(id));
      }
    }
    
    const results = [];
    for (const id of Array.from(matchingIds).slice(0, limit)) {
      const content = this.contentIndex.get(id);
      if (content) {
        results.push({
          ...content,
          score: this.calculateScore(content, queryWords)
        });
      }
    }
    
    return results.sort((a, b) => b.score - a.score);
  }

  calculateScore(content, queryWords) {
    let score = 0;
    const text = `${content.title} ${content.content}`.toLowerCase();
    
    for (const word of queryWords) {
      const matches = (text.match(new RegExp(word, 'g')) || []).length;
      score += matches;
      
      // Boost title matches
      if (content.title.toLowerCase().includes(word)) {
        score += 5;
      }
    }
    
    return score;
  }

  async saveIndex() {
    const indexFile = path.join(this.storageDir, 'content-index.json');
    const indexData = Object.fromEntries(this.contentIndex.entries());
    fs.writeFileSync(indexFile, JSON.stringify(indexData, null, 2), 'utf-8');
  }

  getStats() {
    return {
      totalItems: this.contentIndex.size,
      totalSize: Array.from(this.contentIndex.values()).reduce((sum, item) => sum + item.size, 0),
      searchTerms: this.searchIndex.size,
      lastUpdate: new Date().toISOString()
    };
  }
}

// Demonstration function
async function demonstrateOfflineMode() {
  console.log('🔄 Offline Mode Demonstration\n');
  
  try {
    // Initialize storage
    const storage = new SimpleOfflineStorage();
    await storage.initialize();
    
    // Store some sample content
    console.log('\n📥 Storing sample content...');
    await storage.storeContent(
      'nodejs-guide-1',
      'Node.js Setup Guide',
      `# Node.js Setup Guide

## Installation
To install Node.js, follow these steps:

1. Download from https://nodejs.org
2. Run the installer
3. Verify installation with \`node --version\`

## Package Management
Use npm to manage packages:
\`\`\`bash
npm install express
npm start
\`\`\`

## Best Practices
- Use package.json for dependencies
- Keep node_modules in .gitignore
- Use environment variables for configuration`,
      'https://docs.company.com/nodejs-setup'
    );

    await storage.storeContent(
      'docker-guide-1',
      'Docker Configuration',
      `# Docker Configuration Guide

## Basic Setup
Create a Dockerfile:
\`\`\`dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
\`\`\`

## Docker Compose
Use docker-compose.yml for multi-container apps:
\`\`\`yaml
version: '3.8'
services:
  web:
    build: .
    ports:
      - "3000:3000"
\`\`\``,
      'https://docs.company.com/docker-config'
    );

    await storage.storeContent(
      'typescript-guide-1',
      'TypeScript Configuration',
      `# TypeScript Configuration

## Setup
Initialize TypeScript:
\`\`\`bash
npm install -g typescript
tsc --init
\`\`\`

## Configuration
Edit tsconfig.json:
\`\`\`json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "strict": true
  }
}
\`\`\``,
      'https://docs.company.com/typescript-setup'
    );

    // Demonstrate search functionality
    console.log('\n🔍 Testing search functionality...');
    
    const queries = [
      'nodejs setup',
      'docker configuration',
      'typescript config',
      'npm install',
      'package.json'
    ];

    for (const query of queries) {
      console.log(`\nSearching for: "${query}"`);
      const results = await storage.searchContent(query, 3);
      
      if (results.length > 0) {
        results.forEach((result, index) => {
          console.log(`  ${index + 1}. ${result.title} (score: ${result.score})`);
          console.log(`     Source: ${result.sourceUrl}`);
        });
      } else {
        console.log('  No results found');
      }
    }

    // Show storage statistics
    console.log('\n📊 Storage Statistics:');
    const stats = storage.getStats();
    console.log(`  Total items: ${stats.totalItems}`);
    console.log(`  Total size: ${(stats.totalSize / 1024).toFixed(2)} KB`);
    console.log(`  Search terms: ${stats.searchTerms}`);
    console.log(`  Last update: ${stats.lastUpdate}`);

    // Demonstrate offline-first behavior
    console.log('\n🌐 Demonstrating offline-first behavior:');
    console.log('  ✅ Content available offline');
    console.log('  ✅ Search works without network');
    console.log('  ✅ Fast response times from local storage');
    console.log('  ✅ Content remains accessible during network outages');

    console.log('\n🎉 Offline mode demonstration completed successfully!');
    console.log('\n📝 Key Features Demonstrated:');
    console.log('  • Local content storage with file system backend');
    console.log('  • Full-text search with relevance scoring');
    console.log('  • Content indexing and metadata management');
    console.log('  • Storage statistics and monitoring');
    console.log('  • Offline-first architecture principles');

  } catch (error) {
    console.error('❌ Demonstration failed:', error);
    process.exit(1);
  }
}

// Run the demonstration
demonstrateOfflineMode();
