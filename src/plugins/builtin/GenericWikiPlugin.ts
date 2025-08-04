import { WikiSourcePlugin, WikiFetchOptions, WikiContent, WikiSearchOptions, WikiSearchResult, WikiMetadata } from '../types.js';
import { logger } from '../../utils/logger.js';

/**
 * Generic Wiki Plugin for MCP Internal Wiki Server
 * 
 * Provides generic support for various wiki platforms including MediaWiki,
 * Confluence, Notion, and other wiki systems. This is a fallback adapter
 * that attempts to extract content using common patterns.
 */
export class GenericWikiPlugin implements WikiSourcePlugin {
  id = 'generic-wiki';
  name = 'Generic Wiki Adapter';
  version = '1.0.0';
  description = 'Generic adapter for various wiki platforms and documentation sites';
  supportedTypes = ['mediawiki', 'confluence', 'notion', 'generic', 'wiki', 'docs'];

  private initialized = false;
  private config: any = {};

  async initialize(config: any): Promise<void> {
    this.config = { ...config };
    this.initialized = true;
    logger.info(`Generic Wiki plugin initialized`);
  }

  canHandle(url: string): boolean {
    try {
      const urlObj = new URL(url);
      
      // Check for common wiki indicators in hostname
      const wikiIndicators = [
        'wiki', 'docs', 'confluence', 'notion', 'mediawiki',
        'documentation', 'knowledge', 'help', 'support'
      ];
      
      const hostname = urlObj.hostname.toLowerCase();
      for (const indicator of wikiIndicators) {
        if (hostname.includes(indicator)) {
          return true;
        }
      }

      // Check for wiki-like path patterns
      const wikiPathPatterns = [
        '/wiki/', '/docs/', '/documentation/', '/kb/', 
        '/help/', '/manual/', '/guide/', '/reference/'
      ];
      
      const pathname = urlObj.pathname.toLowerCase();
      for (const pattern of wikiPathPatterns) {
        if (pathname.includes(pattern)) {
          return true;
        }
      }

      // This is a generic plugin, so it can handle most HTTP/HTTPS URLs as fallback
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
      
    } catch (error) {
      logger.debug(`Generic Wiki plugin canHandle error for ${url}:`, error);
      return false;
    }
  }

  async fetchContent(url: string, options?: WikiFetchOptions): Promise<WikiContent> {
    if (!this.initialized) {
      throw new Error('Generic Wiki plugin not initialized');
    }

    try {
      logger.debug(`Generic Wiki plugin fetching content from: ${url}`);

      const headers: Record<string, string> = {
        'User-Agent': 'MCP-Internal-Wiki/1.0.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...options?.headers
      };

      // Add authentication if provided
      if (options?.authentication) {
        switch (options.authentication.type) {
          case 'basic':
            const basicAuth = Buffer.from(
              `${options.authentication.credentials.username}:${options.authentication.credentials.password}`
            ).toString('base64');
            headers['Authorization'] = `Basic ${basicAuth}`;
            break;
          case 'bearer':
            headers['Authorization'] = `Bearer ${options.authentication.credentials.token}`;
            break;
          case 'api-key':
            headers[options.authentication.credentials.headerName || 'X-API-Key'] = 
              options.authentication.credentials.apiKey;
            break;
        }
      }

      const fetchOptions: RequestInit = {
        method: 'GET',
        headers,
        signal: options?.timeout ? AbortSignal.timeout(options.timeout) : undefined
      };

      const response = await fetch(url, fetchOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      
      // Parse content using generic strategies
      const content = this.parseGenericContent(html, url);
      
      logger.debug(`Generic Wiki plugin successfully fetched content from: ${url}`);
      return content;
      
    } catch (error) {
      logger.error(`Generic Wiki plugin failed to fetch content from ${url}:`, error);
      throw error;
    }
  }

  async searchContent(query: string, options?: WikiSearchOptions): Promise<WikiSearchResult[]> {
    // Generic search is not implemented - would require site-specific search APIs
    logger.debug(`Generic Wiki plugin search not implemented for query: ${query}`);
    return [];
  }

  async getMetadata(url: string): Promise<WikiMetadata> {
    try {
      const response = await fetch(url);
      const html = await response.text();
      
      // Extract metadata from HTML
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const descriptionMatch = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
      const lastModifiedMatch = html.match(/<meta[^>]+property="article:modified_time"[^>]+content="([^"]+)"/i);
      
      return {
        title: titleMatch?.[1]?.trim() || 'Wiki Page',
        description: descriptionMatch?.[1]?.trim() || 'Generic wiki content',
        capabilities: ['content-fetch', 'generic-parsing'],
        lastUpdated: lastModifiedMatch?.[1] ? new Date(lastModifiedMatch[1]) : new Date()
      };
    } catch (error) {
      logger.warn(`Generic Wiki plugin failed to get metadata for ${url}:`, error);
      return {
        title: 'Wiki Page',
        capabilities: ['content-fetch']
      };
    }
  }

  async cleanup(): Promise<void> {
    this.initialized = false;
    logger.debug('Generic Wiki plugin cleaned up');
  }

  private parseGenericContent(html: string, url: string): WikiContent {
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch?.[1]?.trim() || 'Wiki Page';

    // Try multiple strategies to extract main content
    let content = '';
    
    // Strategy 1: Look for common content selectors
    const contentSelectors = [
      'main',
      '[role="main"]',
      '.main-content',
      '.content',
      '.page-content',
      '.wiki-content',
      '.entry-content',
      '.post-content',
      'article',
      '.confluence-content',
      '.notion-page-content'
    ];

    for (const selector of contentSelectors) {
      const regex = new RegExp(`<[^>]*(?:id|class)="[^"]*${selector.replace('.', '').replace('#', '')}[^"]*"[^>]*>([\\s\\S]*?)<\/[^>]+>`, 'i');
      const match = html.match(regex);
      if (match && match[1].length > content.length) {
        content = match[1];
      }
    }

    // Strategy 2: Look for MediaWiki specific content
    if (!content || content.length < 200) {
      const mediawikiMatch = html.match(/<div[^>]+id="mw-content-text"[^>]*>([\\s\\S]*?)<\/div>/i);
      if (mediawikiMatch) {
        content = mediawikiMatch[1];
      }
    }

    // Strategy 3: Look for Confluence specific content
    if (!content || content.length < 200) {
      const confluenceMatch = html.match(/<div[^>]+class="[^"]*wiki-content[^"]*"[^>]*>([\\s\\S]*?)<\/div>/i);
      if (confluenceMatch) {
        content = confluenceMatch[1];
      }
    }

    // Strategy 4: Fallback to body content with aggressive filtering
    if (!content || content.length < 100) {
      const bodyMatch = html.match(/<body[^>]*>([\\s\\S]*?)<\/body>/i);
      if (bodyMatch) {
        content = bodyMatch[1];
      }
    }

    // Clean and process the content
    content = this.cleanHtmlContent(content);

    // Extract sections
    const sections = this.extractSections(content);

    // Get last modified date
    const lastModifiedMatch = html.match(/<meta[^>]+(?:property="article:modified_time"|name="last-modified")[^>]+content="([^"]+)"/i);
    const lastModified = lastModifiedMatch?.[1] ? new Date(lastModifiedMatch[1]) : undefined;

    // Detect wiki type
    const wikiType = this.detectWikiType(html, url);

    return {
      url,
      title: title.replace(/\s*[\|\-]\s*.*$/, ''), // Remove site suffix
      content: content.trim(),
      lastModified,
      sections,
      metadata: {
        source: 'generic-wiki',
        plugin: this.id,
        wikiType,
        contentType: 'documentation'
      }
    };
  }

  private cleanHtmlContent(html: string): string {
    return html
      // Remove unwanted elements completely
      .replace(/<(script|style|nav|aside|header|footer|form|iframe)[^>]*>([\\s\\S]*?)<\/\\1>/gi, '')
      .replace(/<!--[\\s\\S]*?-->/g, '')
      // Remove navigation and sidebar elements
      .replace(/<div[^>]*(?:class|id)="[^"]*(?:nav|sidebar|menu|toc|breadcrumb)[^"]*"[^>]*>([\\s\\S]*?)<\/div>/gi, '')
      // Convert structural elements
      .replace(/<br[^>]*>/gi, '\\n')
      .replace(/<\/?(h[1-6])[^>]*>/gi, (match, tag) => {
        const level = '#'.repeat(parseInt(tag.slice(1)));
        return match.startsWith('</') ? '\\n\\n' : `\\n\\n${level} `;
      })
      .replace(/<\/?(p|div|section|article)[^>]*>/gi, '\\n')
      // Convert formatting
      .replace(/<\/?(strong|b)>/gi, '**')
      .replace(/<\/?(em|i)>/gi, '*')
      .replace(/<code[^>]*>([^<]+)<\/code>/gi, '`$1`')
      .replace(/<pre[^>]*>([\\s\\S]*?)<\/pre>/gi, '```\\n$1\\n```')
      // Convert lists
      .replace(/<li[^>]*>([\\s\\S]*?)<\/li>/gi, '- $1\\n')
      .replace(/<\/?(ul|ol)[^>]*>/gi, '\\n')
      // Convert links
      .replace(/<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi, '[$2]($1)')
      // Convert images
      .replace(/<img[^>]+alt="([^"]*)"[^>]+src="([^"]+)"[^>]*>/gi, '![$1]($2)')
      // Remove remaining HTML tags
      .replace(/<[^>]+>/g, '')
      // Decode HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      // Clean up whitespace
      .replace(/\\n\\s*\\n\\s*\\n/g, '\\n\\n')
      .replace(/^\\s+|\\s+$/gm, '')
      .trim();
  }

  private extractSections(content: string): Array<{ title: string; content: string; level: number; id?: string }> {
    const sections: Array<{ title: string; content: string; level: number; id?: string }> = [];
    const lines = content.split('\\n');
    
    let currentSection: { title: string; content: string; level: number; id?: string } | null = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Check for markdown-style headers
      const headerMatch = trimmed.match(/^(#{1,6})\\s+(.+)$/);
      if (headerMatch) {
        // Save previous section
        if (currentSection) {
          sections.push(currentSection);
        }
        
        // Start new section
        currentSection = {
          title: headerMatch[2].trim(),
          content: '',
          level: headerMatch[1].length,
          id: this.generateSectionId(headerMatch[2].trim())
        };
      } else if (currentSection) {
        // Add content to current section
        currentSection.content += (currentSection.content ? '\\n' : '') + trimmed;
      }
    }
    
    // Add final section
    if (currentSection) {
      sections.push(currentSection);
    }
    
    return sections;
  }

  private generateSectionId(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\\s-]/g, '')
      .replace(/\\s+/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private detectWikiType(html: string, url: string): string {
    const urlObj = new URL(url);
    
    // Check for MediaWiki
    if (html.includes('MediaWiki') || html.includes('mw-content-text') || urlObj.pathname.includes('/wiki/')) {
      return 'mediawiki';
    }
    
    // Check for Confluence
    if (html.includes('Confluence') || html.includes('confluence-content') || urlObj.hostname.includes('confluence')) {
      return 'confluence';
    }
    
    // Check for Notion
    if (html.includes('notion-') || urlObj.hostname.includes('notion.')) {
      return 'notion';
    }
    
    // Check for GitBook (handled by specific plugin but detected here)
    if (urlObj.hostname.includes('gitbook.')) {
      return 'gitbook';
    }
    
    return 'generic';
  }
}
