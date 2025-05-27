import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { marked } from 'marked';
import { AIService } from '../ai/aiService';
import { AIEnhancedWikiContent } from '../ai/types';

// Content cache to avoid repeated requests
interface CacheEntry {
  content: string;
  timestamp: number;
  searchIndex: Record<string, number>; // Keyword -> relevance score
}

interface WikiConfig {
  wikiUrls: string[];
  cacheTimeoutMinutes?: number;
  auth?: WikiAuthConfig[];
  ai?: {
    enabled: boolean;
    primaryProvider: string; // made required, not optional
    minimumRelevanceScore?: number;
    contentChunkSize?: number;
    embeddingCacheTimeMinutes?: number;
    providers: {
      [key: string]: {
        type: string;
        enabled: boolean;
        [key: string]: any;
      };
    };
  };
}

// Authentication configuration for private wikis
interface WikiAuthConfig {
  urlPattern: string;  // Regex pattern to match URLs that need this auth
  type: 'basic' | 'token' | 'oauth' | 'custom';
  username?: string;  // For basic auth
  password?: string;  // For basic auth
  token?: string;     // For token auth
  headerName?: string; // For custom header auth (e.g., 'Authorization')
  headerValue?: string; // Value for the custom header
  oauthConfig?: {      // For OAuth
    clientId: string;
    clientSecret: string;
    tokenUrl: string;
  };
}

// Wiki source types supported
enum WikiType {
  Markdown = 'markdown',
  MediaWiki = 'mediawiki',
  Gitbook = 'gitbook',
  Confluence = 'confluence',
  SharePoint = 'sharepoint',
  Unknown = 'unknown'
}

interface WikiEntry {
  url: string;
  type: WikiType;
  name: string;
  auth?: {
    type: 'basic' | 'token' | 'oauth' | 'custom';
    config: any;
  };
}

export class WikiSource {
  name = 'wiki';
  private wikiEntries: WikiEntry[] = [];
  private contentCache: Record<string, CacheEntry> = {};
  private cacheTimeoutMs: number = 30 * 60 * 1000; // Default: 30 minutes
  private authConfigs: WikiAuthConfig[] = [];
  private aiService: AIService | null = null;
  
  constructor() {
    // Load config from mcp.config.json
    try {
      // Try multiple possible locations for the config file
      const possiblePaths = [
        // First try environment variable if set by VS Code
        process.env.MCP_CONFIG_PATH,
        path.join(process.cwd(), 'mcp.config.json'),
        path.join(__dirname, '..', '..', 'mcp.config.json'),
        path.join(__dirname, '../../mcp.config.json'),
        '/home/olafkfreund/Source/mcp-internal-wiki/mcp.config.json'
      ].filter(Boolean); // Remove undefined values
      
      let configPath = '';
      let config: WikiConfig | null = null;
      
      for (const testPath of possiblePaths) {
        if (!testPath) continue; // Skip undefined paths
        console.error(`[DEBUG] Testing config path: ${testPath}`);
        try {
          if (fs.existsSync(testPath)) {
            configPath = testPath;
            console.error(`[DEBUG] Config file found at: ${configPath}`);
            const configContent = fs.readFileSync(configPath, 'utf8');
            console.error(`[DEBUG] Config file size: ${configContent.length} bytes`);
            config = JSON.parse(configContent) as WikiConfig;
            console.error(`[DEBUG] Successfully parsed config file`);
            break;
          } else {
            console.error(`[DEBUG] Config file does not exist at: ${testPath}`);
          }
        } catch (error) {
          console.error(`[DEBUG] Error checking config path ${testPath}:`, error);
        }
      }
      
      console.error(`[DEBUG] Current working directory: ${process.cwd()}`);
      console.error(`[DEBUG] __dirname: ${__dirname}`);
      console.error(`[DEBUG] process.argv: ${JSON.stringify(process.argv)}`);
      console.error(`[DEBUG] process.env.PWD: ${process.env.PWD}`);
      
      if (config) {
        // Initialize AI service if AI config is present
        if (config.ai) {
          console.error(`[DEBUG] AI config found, enabled: ${config.ai.enabled}`);
          this.aiService = new AIService(config.ai);
        }
        
        if (config.wikiUrls && Array.isArray(config.wikiUrls)) {
          console.error(`[DEBUG] Found ${config.wikiUrls.length} wiki URLs in config`);
          // Store auth configs for later use
          this.authConfigs = config.auth || [];
          
          // Parse each wiki URL and assign auth if applicable
          this.wikiEntries = config.wikiUrls.map(url => {
            const entry = this.parseWikiUrl(url);
            
            // Check if this wiki needs authentication
            const authConfig = this.findAuthConfigForUrl(url);
            if (authConfig) {
              entry.auth = {
                type: authConfig.type,
                config: authConfig
              };
              console.log(`Applied ${authConfig.type} authentication for ${entry.name}`);
            }
            
            return entry;
          });
          
          console.error(`Loaded ${this.wikiEntries.length} wiki sources`);
        }
        
        // Set cache timeout if configured
        if (config.cacheTimeoutMinutes) {
          this.cacheTimeoutMs = config.cacheTimeoutMinutes * 60 * 1000;
        }
        
        // Pre-fetch content from wikis in background
        this.prefetchWikiContent();
      } else {
        console.error(`[DEBUG] Config file not found at: ${configPath}`);
      }
    } catch (error) {
      console.error('Error loading wiki configuration:', error);
    }
  }
  
  // Find authentication config that matches a URL
  private findAuthConfigForUrl(url: string): WikiAuthConfig | undefined {
    return this.authConfigs.find(authConfig => {
      try {
        const pattern = new RegExp(authConfig.urlPattern);
        return pattern.test(url);
      } catch (error) {
        console.error(`Invalid URL pattern in auth config: ${authConfig.urlPattern}`, error);
        return false;
      }
    });
  }
  
  private parseWikiUrl(url: string): WikiEntry {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    let type = WikiType.Unknown;
    let name = hostname;
    
    // Detect wiki type based on URL patterns
    if (hostname.includes('gitbook.io')) {
      type = WikiType.Gitbook;
      name = `Gitbook: ${urlObj.pathname.split('/')[1] || hostname}`;
    } else if (hostname.endsWith('wiki.org') || hostname.includes('mediawiki')) {
      type = WikiType.MediaWiki;
      name = hostname;
    } else if (hostname.includes('confluence') || url.includes('confluence')) {
      type = WikiType.Confluence;
      name = `Confluence: ${hostname}`;
    } else if (hostname.includes('sharepoint')) {
      type = WikiType.SharePoint;
      name = `SharePoint: ${hostname}`;
    } else if (url.endsWith('.md') || url.includes('/docs/') || hostname.includes('docs.')) {
      type = WikiType.Markdown;
      name = hostname;
    }
    
    return { url, type, name };
  }
  
  // Prefetch content from all wikis
  private async prefetchWikiContent(): Promise<void> {
    console.error('Pre-fetching wiki content...');
    
    for (const entry of this.wikiEntries) {
      try {
        await this.fetchWikiContent(entry);
        console.error(`Fetched content from ${entry.name}`);
      } catch (error) {
        console.error(`Failed to fetch content from ${entry.name}:`, error);
      }
    }
    
    console.error('Wiki content pre-fetch complete');
  }
  
  // Fetch content from a wiki
  private async fetchWikiContent(entry: WikiEntry): Promise<string> {
    // Check cache first
    if (this.contentCache[entry.url] && 
        (Date.now() - this.contentCache[entry.url].timestamp) < this.cacheTimeoutMs) {
      return this.contentCache[entry.url].content;
    }
    
    console.error(`Fetching content from ${entry.name} (${entry.url})...`);
    
    try {
      let content = '';
      
      switch (entry.type) {
        case WikiType.MediaWiki:
          content = await this.fetchMediaWikiContent(entry);
          break;
        case WikiType.Gitbook:
          content = await this.fetchGitbookContent(entry);
          break;
        case WikiType.Confluence:
          content = await this.fetchConfluenceContent(entry);
          break;
        case WikiType.Markdown:
          content = await this.fetchMarkdownContent(entry);
          break;
        case WikiType.SharePoint:
          content = await this.fetchSharePointContent(entry);
          break;
        default:
          content = await this.fetchGenericContent(entry);
      }
      
      // Build search index
      const searchIndex = this.buildSearchIndex(content);
      
      // Cache the content
      this.contentCache[entry.url] = {
        content,
        timestamp: Date.now(),
        searchIndex
      };
      
      return content;
    } catch (error) {
      console.error(`Error fetching content from ${entry.url}:`, error);
      
      // If we previously had cached content, use it even if expired
      if (this.contentCache[entry.url]) {
        console.log(`Using expired cached content for ${entry.url}`);
        return this.contentCache[entry.url].content;
      }
      
      // Otherwise fall back to simulated content
      console.log(`Falling back to simulated content for ${entry.url}`);
      const keywords = ['fallback'];
      const query = 'Error fetching content';
      return this.generateSimulatedContent(entry, query, keywords) || 'Error fetching content';
    }
  }
  
  // Build a search index from content
  private buildSearchIndex(content: string): Record<string, number> {
    const index: Record<string, number> = {};
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
    
    // Count word occurrences
    for (const word of words) {
      index[word] = (index[word] || 0) + 1;
    }
    
    return index;
  }
  
  // Fetch content from MediaWiki
  private async fetchMediaWikiContent(entry: WikiEntry): Promise<string> {
    // MediaWiki API endpoint
    const apiUrl = new URL(entry.url);
    apiUrl.pathname = apiUrl.pathname.replace(/\/wiki\/.*$/, '/api.php');
    
    // Use MediaWiki API to get page content
    const params = new URLSearchParams({
      action: 'parse',
      page: 'Main_Page', // Default to main page
      format: 'json',
      prop: 'text'
    });
    
    const config = this.createRequestConfig(entry);
    const response = await axios.get(`${apiUrl.toString()}?${params.toString()}`, config);
    
    if (response.data && response.data.parse && response.data.parse.text) {
      return response.data.parse.text['*'];
    }
    
    throw new Error('Failed to parse MediaWiki content');
  }
  
  // Fetch content from GitBook
  private async fetchGitbookContent(entry: WikiEntry): Promise<string> {
    const config = this.createRequestConfig(entry);
    const response = await axios.get(entry.url, config);
    
    if (response.data) {
      // Gitbook uses client-side rendering, so we need to extract content from HTML
      return this.extractContentFromHtml(response.data);
    }
    
    throw new Error('Failed to fetch GitBook content');
  }
  
  // Fetch content from Confluence
  private async fetchConfluenceContent(entry: WikiEntry): Promise<string> {
    try {
      // Try direct HTML fetch first
      const config = this.createRequestConfig(entry);
      const response = await axios.get(entry.url, config);
      return this.extractContentFromHtml(response.data);
    } catch (error) {
      // If no authentication or authentication failed
      if (!entry.auth) {
        console.warn(`Confluence at ${entry.url} may require authentication`);
      } else {
        console.error(`Authentication failed for Confluence at ${entry.url}`, error);
      }
      throw new Error('Failed to fetch Confluence content - check authentication');
    }
  }
  
  // Fetch content from Markdown source
  private async fetchMarkdownContent(entry: WikiEntry): Promise<string> {
    const config = this.createRequestConfig(entry);
    const response = await axios.get(entry.url, config);
    
    if (response.data) {
      if (typeof response.data === 'string') {
        // Parse markdown to HTML
        return marked(response.data);
      } else {
        // Handle JSON responses (e.g., from GitHub)
        return response.data.content ? marked(response.data.content) : JSON.stringify(response.data);
      }
    }
    
    throw new Error('Failed to fetch Markdown content');
  }
  
  // Fetch content from SharePoint
  private async fetchSharePointContent(entry: WikiEntry): Promise<string> {
    try {
      const config = this.createRequestConfig(entry);
      const response = await axios.get(entry.url, config);
      return this.extractContentFromHtml(response.data);
    } catch (error) {
      if (!entry.auth) {
        console.warn(`SharePoint at ${entry.url} likely requires authentication`);
      } else {
        console.error(`Authentication failed for SharePoint at ${entry.url}`, error);
      }
      throw new Error('Failed to fetch SharePoint content - check authentication');
    }
  }
  
  // Fetch content from generic URL
  private async fetchGenericContent(entry: WikiEntry): Promise<string> {
    const config = this.createRequestConfig(entry);
    const response = await axios.get(entry.url, config);
    
    if (response.data) {
      if (typeof response.data === 'string') {
        // Try to detect if it's HTML or plain text
        if (response.data.includes('<!DOCTYPE html>') || response.data.includes('<html')) {
          return this.extractContentFromHtml(response.data);
        }
        return response.data;
      } else {
        // JSON response
        return JSON.stringify(response.data);
      }
    }
    
    throw new Error('Failed to fetch content');
  }
  
  // Extract meaningful content from HTML
  private extractContentFromHtml(html: string): string {
    // Basic extraction - in a real app, use a proper HTML parser
    const textContent = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
      .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return textContent;
  }
  
  // Extract code blocks from content
  private extractCodeBlocks(content: string): { language: string, code: string }[] {
    const codeBlocks: { language: string, code: string }[] = [];
    
    // Markdown-style code blocks ```language\ncode\n```
    const markdownRegex = /```([a-zA-Z0-9_-]*)(?:\n|\r\n|)([\s\S]*?)(?:\n|\r\n|)```/g;
    let match;
    while ((match = markdownRegex.exec(content)) !== null) {
      codeBlocks.push({
        language: match[1] || 'text',
        code: match[2]
      });
    }
    
    // HTML-style code blocks <pre><code>code</code></pre>
    const htmlRegex = /<pre(?:\s[^>]*)?><code(?:\s[^>]*)?>([\s\S]*?)<\/code><\/pre>/g;
    while ((match = htmlRegex.exec(content)) !== null) {
      codeBlocks.push({
        language: 'text',
        code: match[1]
      });
    }
    
    // MediaWiki-style code blocks
    const wikiRegex = /<syntaxhighlight lang="([^"]+)">([\s\S]*?)<\/syntaxhighlight>/g;
    while ((match = wikiRegex.exec(content)) !== null) {
      codeBlocks.push({
        language: match[1],
        code: match[2]
      });
    }
    
    return codeBlocks;
  }
  
  // Create axios request config with authentication if available
  private createRequestConfig(entry: WikiEntry): any {
    if (!entry.auth) {
      return {}; // No authentication needed
    }
    
    const config: any = {
      headers: {}
    };
    
    switch (entry.auth.type) {
      case 'basic':
        const { username, password } = entry.auth.config;
        if (username && password) {
          const base64Credentials = Buffer.from(`${username}:${password}`).toString('base64');
          config.headers['Authorization'] = `Basic ${base64Credentials}`;
        }
        break;
        
      case 'token':
        const { token } = entry.auth.config;
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        break;
        
      case 'custom':
        const { headerName, headerValue } = entry.auth.config;
        if (headerName && headerValue) {
          config.headers[headerName] = headerValue;
        }
        break;
        
      case 'oauth':
        // OAuth implementation would be more complex and require token management
        console.log(`OAuth authentication for ${entry.url} - token would be applied if implemented`);
        break;
    }
    
    return config;
  }

  async getContext(params: any): Promise<AIEnhancedWikiContent[]> {
    // Extract query from params
    const query = params?.query?.text || '';
    if (!query) {
      return [];
    }
    
    console.error(`Processing query: "${query}"`);
    
    // Extract keywords from the query
    const keywords = this.extractKeywords(query.toLowerCase());
    
    const results: AIEnhancedWikiContent[] = [];
    const fetchPromises = [];
    
    // Process each wiki entry
    for (const entry of this.wikiEntries) {
      fetchPromises.push(
        this.processWikiEntry(entry, query, keywords)
          .then(result => {
            if (result) {
              results.push(result);
            }
          })
          .catch(error => {
            console.error(`Error processing ${entry.name}:`, error);
            // Add fallback content if fetch fails
            const fallbackContent = this.generateSimulatedContent(entry, query, keywords);
            if (fallbackContent) {
              results.push({
                title: `${entry.name} (Simulated Content)`,
                content: fallbackContent,
                url: entry.url,
                source: this.name,
                type: entry.type
              } as AIEnhancedWikiContent);
            }
          })
      );
    }
    
    // Wait for all fetches to complete
    await Promise.all(fetchPromises);
    
    // Add fallback if no URLs configured or no relevant content found
    if (results.length === 0) {
      results.push({
        title: 'Example Wiki Page',
        content: `This is a sample wiki content related to "${query}". Configure wiki URLs in mcp.config.json to get real content.`,
        source: this.name
      } as AIEnhancedWikiContent);
    }
    
    // Apply AI-assisted relevance scoring if enabled
    if (this.aiService && this.aiService.isAvailable()) {
      try {
        console.log('Applying AI-assisted relevance scoring...');
        
        // Convert results to format expected by AI service
        const contentsForScoring = results.map(result => ({
          content: result.content,
          title: result.title,
          source: result.source,
          url: result.url
        }));
        
        // Get the primary provider
        const primaryProvider = this.aiService.getPrimaryProvider();
        if (!primaryProvider) {
          console.log('No AI provider available, using basic relevance scoring');
          return results;
        }
        
        // Process each content item
        const scoredResults = await Promise.all(
          contentsForScoring.map(async (item) => {
            try {
              // Calculate relevance score
              const relevanceScore = await primaryProvider.calculateRelevance(query, item.content);
              
              // Generate summary if content is long enough
              let summary = '';
              if (item.content.length > 200) {
                summary = await primaryProvider.summarizeContent(item.content, 200);
              }
              
              return {
                ...item,
                relevanceScore,
                summary
              };
            } catch (err) {
              console.error(`Error scoring content '${item.title}':`, err);
              return {
                ...item,
                relevanceScore: 0.5, // Default score
                summary: ''
              };
            }
          })
        );
        
        // Sort by relevance score (highest first)
        const sortedResults = scoredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
        
        // Filter by minimum relevance score
        const minScore = this.aiService.getMinimumRelevanceScore();
        const enhancedResults = sortedResults
          .filter(result => result.relevanceScore >= minScore)
          .map(result => ({
            title: result.title,
            content: result.content,
            url: result.url,
            source: result.source,
            type: results.find(r => r.title === result.title)?.type,
            relevanceScore: result.relevanceScore,
            summary: result.summary
          } as AIEnhancedWikiContent));
          
        console.log(`AI scored ${sortedResults.length} results, ${enhancedResults.length} above threshold`);
        
        // If we have AI-scored results, use them; otherwise fall back to original results
        if (enhancedResults.length > 0) {
          return enhancedResults;
        }
        
        // Log that we're using basic relevance instead of AI
        console.log('No results passed AI relevance threshold, using basic relevance scoring');
      } catch (error) {
        console.error('Error during AI-assisted relevance scoring:', error);
        // Continue with regular results on error
      }
    }
    
    return results;
  }
  
  private async processWikiEntry(entry: WikiEntry, query: string, keywords: string[]): Promise<AIEnhancedWikiContent | null> {
    try {
      // Fetch content (will use cache if available)
      const content = await this.fetchWikiContent(entry);
      
      // Check if content is relevant to the query
      if (!this.isContentRelevantToQuery(content, query, keywords)) {
        return null;
      }
      
      // Extract relevant section
      const relevantSection = this.extractRelevantSection(content, query, keywords);
      
      if (relevantSection) {
        return {
          title: `${entry.name}`,
          content: relevantSection,
          url: entry.url,
          source: this.name,
          type: entry.type
        };
      }
    } catch (error) {
      console.error(`Error processing wiki entry ${entry.name}:`, error);
    }
    return null;
  }
  
  // Check if content is relevant to the query
  private isContentRelevantToQuery(content: string, query: string, keywords: string[]): boolean {
    // If we have a cached search index, use it
    const lowerContent = content.toLowerCase();
    
    // Check for exact phrases
    if (lowerContent.includes(query.toLowerCase())) {
      return true;
    }
    
    // Check for keywords - require at least 50% of keywords to appear
    const keywordMatches = keywords.filter(keyword => lowerContent.includes(keyword));
    return keywordMatches.length > 0 && keywordMatches.length >= Math.max(1, Math.floor(keywords.length * 0.5));
  }
  
  // Extract a section of content relevant to the query
  private extractRelevantSection(content: string, query: string, keywords: string[]): string {
    // First check for code blocks
    const codeBlocks = this.extractCodeBlocks(content);
    const relevantCodeBlocks = codeBlocks.filter(block => {
      return keywords.some(keyword => block.code.toLowerCase().includes(keyword)) ||
             query.toLowerCase().split(' ').some(word => word.length > 3 && block.code.toLowerCase().includes(word));
    });
    
    if (relevantCodeBlocks.length > 0) {
      // Return most relevant code blocks (up to 3)
      return relevantCodeBlocks.slice(0, 3).map(block => 
        `\`\`\`${block.language}\n${block.code}\n\`\`\``
      ).join('\n\n');
    }
    
    // Fall back to content section extraction
    const lowerContent = content.toLowerCase();
    const queryIndex = lowerContent.indexOf(query.toLowerCase());
    
    if (queryIndex >= 0) {
      // Extract content around the query match
      const start = Math.max(0, queryIndex - 150);
      const end = Math.min(content.length, queryIndex + query.length + 350);
      return content.substring(start, end);
    }
    
    // If no exact match, look for keywords
    for (const keyword of keywords) {
      const keywordIndex = lowerContent.indexOf(keyword);
      if (keywordIndex >= 0) {
        // Extract content around the keyword match
        const start = Math.max(0, keywordIndex - 100);
        const end = Math.min(content.length, keywordIndex + keyword.length + 400);
        return content.substring(start, end);
      }
    }
    
    // If all else fails, return a portion of the beginning
    return content.substring(0, 500) + '...';
  }
  
  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - remove common words and split
    const commonWords = ['the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'how'];
    return text
      .split(/\s+/)
      .map(word => word.replace(/[^\w]/g, '').toLowerCase())
      .filter(word => word.length > 2 && !commonWords.includes(word));
  }
  
  // Fallback to simulated content if real fetch fails
  private generateSimulatedContent(entry: WikiEntry, query: string, keywords: string[]): string | null {
    // Check if query has any keywords relevant to this wiki
    const isRelevant = this.isQueryRelevantToWiki(entry, keywords);
    
    if (!isRelevant) {
      return null;
    }
    
    // Generate content based on wiki type and query
    switch (entry.type) {
      case WikiType.Gitbook:
        return this.generateGitbookContent(entry, query, keywords);
      case WikiType.MediaWiki:
        return this.generateMediaWikiContent(entry, query, keywords);
      case WikiType.Markdown:
        return this.generateMarkdownContent(entry, query, keywords);
      case WikiType.Confluence:
        return this.generateConfluenceContent(entry, query, keywords);
      case WikiType.SharePoint:
        return this.generateSharePointContent(entry, query, keywords);
      default:
        return `Information about "${query}" from ${entry.url}\n\nThis is simulated content for testing. In a real implementation, content would be fetched from the wiki.`;
    }
  }
  
  private isQueryRelevantToWiki(entry: WikiEntry, keywords: string[]): boolean {
    // For GitBook wiki about DevOps
    if (entry.url.includes('devops-examples') && 
        keywords.some(k => ['devops', 'docker', 'kubernetes', 'pipeline', 'ci', 'cd', 'jenkins', 'aws', 'terraform'].includes(k))) {
      return true;
    }
    
    // For NixOS wiki
    if (entry.url.includes('nixos') && 
        keywords.some(k => ['nix', 'nixos', 'package', 'flake', 'linux', 'config', 'system'].includes(k))) {
      return true;
    }
    
    // Default - simulate 70% chance of relevance
    return Math.random() > 0.3;
  }
  
  private generateGitbookContent(entry: WikiEntry, query: string, keywords: string[]): string {
    // Simulated GitBook content
    if (entry.url.includes('devops-examples')) {
      if (query.includes('kubernetes') || keywords.includes('kubernetes')) {
        return `# Kubernetes Best Practices\n\nThis guide covers best practices for Kubernetes deployment in production environments.\n\n## Cluster Architecture\n- Use multiple availability zones\n- Set resource quotas\n- Implement proper label strategy\n\n## Security\n- Use RBAC for access control\n- Scan container images\n- Encrypt data at rest\n\n[View full documentation](${entry.url}kubernetes)`;
      }
      
      if (query.includes('pipeline') || keywords.includes('pipeline') || query.includes('ci') || query.includes('cd')) {
        return `# CI/CD Pipeline Examples\n\n## Jenkins Pipeline\n\`\`\`groovy\npipeline {\n    agent any\n    stages {\n        stage('Build') {\n            steps {\n                echo 'Building...'\n                sh 'npm install'\n                sh 'npm run build'\n            }\n        }\n        stage('Test') { /* ... */ }\n        stage('Deploy') { /* ... */ }\n    }\n}\n\`\`\`\n\n[View full documentation](${entry.url}ci-cd)`;
      }
    }
    
    return `# Search Results for "${query}"\n\nFound relevant content in the GitBook documentation.\n\n## Key Points\n- ${keywords.join(', ')}\n- Best practices and examples\n- Step-by-step guides\n\n[View full documentation](${entry.url})`;
  }
  
  private generateMediaWikiContent(entry: WikiEntry, query: string, keywords: string[]): string {
    // Simulated MediaWiki content
    if (entry.url.includes('nixos')) {
      if (query.includes('nix') || keywords.includes('nix') || keywords.includes('nixos')) {
        return `== NixOS Configuration ==\nNixOS is a Linux distribution built on top of the Nix package manager.\n\n=== Basic Configuration ===\n\`\`\`nix\n{ config, pkgs, ... }:\n{\n  imports = [ ./hardware-configuration.nix ];\n  boot.loader.systemd-boot.enable = true;\n  networking.hostName = "nixos";\n  environment.systemPackages = with pkgs; [ vim git ];\n}\n\`\`\`\n\n[View full article](${entry.url}/NixOS_Configuration)`;
      }
      
      if (query.includes('flake') || keywords.includes('flake')) {
        return `== Nix Flakes ==\nFlakes are an upcoming feature of the Nix package manager that allow you to specify your dependencies declaratively.\n\n=== Example flake.nix ===\n\`\`\`nix\n{\n  inputs = {\n    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";\n  };\n  outputs = { self, nixpkgs }: {\n    nixosConfigurations.myhost = nixpkgs.lib.nixosSystem { /* ... */ };\n  };\n}\n\`\`\`\n\n[View full article](${entry.url}/Flakes)`;
      }
    }
    
    return `== ${query} ==\n\nThis article covers information related to ${keywords.join(', ')}.\n\n=== Overview ===\nRelevant documentation and examples can be found in the wiki.\n\n[View full article](${entry.url}/Special:Search?search=${encodeURIComponent(query)})`;
  }
  
  private generateMarkdownContent(entry: WikiEntry, query: string, keywords: string[]): string {
    // Simulated Markdown content
    return `# ${query}\n\n## Overview\nThis documentation covers ${keywords.join(', ')}.\n\n## Examples\n\`\`\`\n// Example code or configuration\n\`\`\`\n\n## See Also\n- [Related Topic 1](${entry.url}related1)\n- [Related Topic 2](${entry.url}related2)\n\n[Return to Documentation](${entry.url})`;
  }
  
  private generateConfluenceContent(entry: WikiEntry, query: string, keywords: string[]): string {
    // Simulated Confluence content
    return `h1. ${query}\n\nh2. Summary\nThis Confluence page contains information about ${keywords.join(', ')}.\n\nh2. Details\n{code}\n// Example details or configuration\n{code}\n\nh2. Related Pages\n- [Related Page 1|${entry.url}/related1]\n- [Related Page 2|${entry.url}/related2]`;
  }
  
  private generateSharePointContent(entry: WikiEntry, query: string, keywords: string[]): string {
    // Simulated SharePoint content
    return `<h1>${query}</h1>\n<h2>Document Summary</h2>\n<p>This SharePoint document contains information related to ${keywords.join(', ')}.</p>\n<h2>Key Points</h2>\n<ul>\n  <li>Point 1</li>\n  <li>Point 2</li>\n  <li>Point 3</li>\n</ul>\n<p><a href="${entry.url}">View full document</a></p>`;
  }

  // Get detailed information about all configured wiki sources
  getWikiSourceDetails(): Array<{
    name: string;
    url: string;
    type: string;
    hasAuth: boolean;
    authType?: string;
    cached: boolean;
    cacheTimestamp?: string;
  }> {
    return this.wikiEntries.map(entry => ({
      name: entry.name,
      url: entry.url,
      type: entry.type,
      hasAuth: !!entry.auth,
      authType: entry.auth?.type,
      cached: !!this.contentCache[entry.url],
      cacheTimestamp: this.contentCache[entry.url] ? 
        new Date(this.contentCache[entry.url].timestamp).toISOString() : 
        undefined
    }));
  }

  // Get summary statistics about wiki sources
  getWikiSourceStats(): {
    totalSources: number;
    sourcesByType: Record<string, number>;
    authenticatedSources: number;
    cachedSources: number;
    cacheTimeoutMinutes: number;
  } {
    const sourcesByType: Record<string, number> = {};
    let authenticatedSources = 0;
    let cachedSources = 0;

    this.wikiEntries.forEach(entry => {
      sourcesByType[entry.type] = (sourcesByType[entry.type] || 0) + 1;
      if (entry.auth) authenticatedSources++;
      if (this.contentCache[entry.url]) cachedSources++;
    });

    return {
      totalSources: this.wikiEntries.length,
      sourcesByType,
      authenticatedSources,
      cachedSources,
      cacheTimeoutMinutes: this.cacheTimeoutMs / (60 * 1000)
    };
  }
}
