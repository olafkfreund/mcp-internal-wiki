import * as fs from 'fs';
import * as path from 'path';

interface WikiConfig {
  wikiUrls: string[];
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
}

export class WikiSource {
  name = 'wiki';
  private wikiEntries: WikiEntry[] = [];
  
  constructor() {
    // Load config from mcp.config.json
    try {
      const configPath = path.join(process.cwd(), 'mcp.config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as WikiConfig;
        
        if (config.wikiUrls && Array.isArray(config.wikiUrls)) {
          this.wikiEntries = config.wikiUrls.map(url => this.parseWikiUrl(url));
          console.log(`Loaded ${this.wikiEntries.length} wiki sources`);
        }
      }
    } catch (error) {
      console.error('Error loading wiki configuration:', error);
    }
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
      name = `MediaWiki: ${hostname}`;
    } else if (hostname.includes('confluence') || url.includes('confluence')) {
      type = WikiType.Confluence;
      name = `Confluence: ${hostname}`;
    } else if (hostname.includes('sharepoint')) {
      type = WikiType.SharePoint;
      name = `SharePoint: ${hostname}`;
    } else if (url.endsWith('.md') || url.includes('/docs/')) {
      type = WikiType.Markdown;
      name = `Markdown: ${hostname}${urlObj.pathname}`;
    }
    
    return { url, type, name };
  }
  
  getContext(params: any) {
    // Extract query from params
    const query = params?.query?.text || '';
    if (!query) {
      return [];
    }
    
    console.log(`Processing query: "${query}"`);
    
    // In a real implementation, you would fetch content from the wiki URLs
    // For now, return stub data related to the query
    const results = [];
    
    // Process query and simulate different results based on keywords
    const keywords = this.extractKeywords(query.toLowerCase());
    
    // Add sample results based on configured wiki URLs
    this.wikiEntries.forEach(entry => {
      // Generate simulated content based on query and wiki type
      const relevantContent = this.generateSimulatedContent(entry, query, keywords);
      
      if (relevantContent) {
        results.push({
          title: `${entry.name}`,
          content: relevantContent,
          url: entry.url,
          source: this.name,
          type: entry.type
        });
      }
    });
    
    // Add fallback if no URLs configured or no relevant content found
    if (results.length === 0) {
      results.push({
        title: 'Example Wiki Page',
        content: `This is a sample wiki content related to "${query}". Configure wiki URLs in mcp.config.json to get real content.`,
        source: this.name
      });
    }
    
    return results;
  }
  
  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - remove common words and split
    const commonWords = ['the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'how'];
    return text
      .split(/\s+/)
      .map(word => word.replace(/[^\w]/g, '').toLowerCase())
      .filter(word => word.length > 2 && !commonWords.includes(word));
  }
  
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
    // In a real implementation, this would check if the wiki contains content for these keywords
    // For testing, we'll simulate some wikis being relevant for certain keywords
    
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
}
