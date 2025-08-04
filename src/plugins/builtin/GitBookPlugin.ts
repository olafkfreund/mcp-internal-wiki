import { WikiSourcePlugin, WikiFetchOptions, WikiContent, WikiSearchOptions, WikiSearchResult, WikiMetadata } from '../types.js';
import { logger } from '../../utils/logger.js';

/**
 * GitBook Plugin for MCP Internal Wiki Server
 * 
 * Provides specialized support for GitBook wikis with optimized content extraction
 * and search capabilities specifically tailored for GitBook's structure and API.
 */
export class GitBookPlugin implements WikiSourcePlugin {
  id = 'gitbook';
  name = 'GitBook Wiki Adapter';
  version = '1.0.0';
  description = 'Specialized adapter for GitBook documentation sites';
  supportedTypes = ['gitbook', 'gitbook.io', 'gitbook.com'];

  private initialized = false;
  private config: any = {};

  async initialize(config: any): Promise<void> {
    this.config = { ...config };
    this.initialized = true;
    logger.info(`GitBook plugin initialized`);
  }

  canHandle(url: string): boolean {
    try {
      const urlObj = new URL(url);
      
      // Check for GitBook domains
      if (urlObj.hostname.includes('gitbook.io') || 
          urlObj.hostname.includes('gitbook.com') ||
          urlObj.hostname.includes('docs.gitbook.com')) {
        return true;
      }

      // Check for GitBook-specific URL patterns
      if (urlObj.pathname.includes('/docs/') && 
          (urlObj.hostname.includes('docs.') || urlObj.hostname.includes('wiki.'))) {
        return true;
      }

      return false;
    } catch (error) {
      logger.debug(`GitBook plugin canHandle error for ${url}:`, error);
      return false;
    }
  }

  async fetchContent(url: string, options?: WikiFetchOptions): Promise<WikiContent> {
    if (!this.initialized) {
      throw new Error('GitBook plugin not initialized');
    }

    try {
      logger.debug(`GitBook plugin fetching content from: ${url}`);

      // Set up headers for GitBook API if available
      const headers: Record<string, string> = {
        'User-Agent': 'MCP-Internal-Wiki/1.0.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...options?.headers
      };

      // Add authentication if provided
      if (options?.authentication?.type === 'bearer') {
        headers['Authorization'] = `Bearer ${options.authentication.credentials.token}`;
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
      
      // Parse GitBook-specific content
      const content = this.parseGitBookContent(html, url);
      
      logger.debug(`GitBook plugin successfully fetched content from: ${url}`);
      return content;
      
    } catch (error) {
      logger.error(`GitBook plugin failed to fetch content from ${url}:`, error);
      throw error;
    }
  }

  async searchContent(query: string, options?: WikiSearchOptions): Promise<WikiSearchResult[]> {
    // GitBook search would require access to their search API
    // This is a placeholder for potential GitBook-specific search implementation
    logger.debug(`GitBook plugin search not implemented for query: ${query}`);
    return [];
  }

  async getMetadata(url: string): Promise<WikiMetadata> {
    try {
      const response = await fetch(url);
      const html = await response.text();
      
      // Extract metadata from GitBook page
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const descriptionMatch = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
      
      return {
        title: titleMatch?.[1] || 'GitBook Documentation',
        description: descriptionMatch?.[1] || 'GitBook documentation site',
        capabilities: ['content-fetch', 'structured-parsing'],
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.warn(`GitBook plugin failed to get metadata for ${url}:`, error);
      return {
        title: 'GitBook Documentation',
        capabilities: ['content-fetch']
      };
    }
  }

  async cleanup(): Promise<void> {
    this.initialized = false;
    logger.debug('GitBook plugin cleaned up');
  }

  private parseGitBookContent(html: string, url: string): WikiContent {
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch?.[1]?.trim() || 'GitBook Page';

    // Extract main content from GitBook's typical structure
    let content = '';
    
    // Try multiple selectors for GitBook content
    const contentSelectors = [
      'article[data-page-id]',
      '.page-content',
      '[data-testid="page-content"]',
      '.gitbook-content',
      'main article',
      'main .content'
    ];

    for (const selector of contentSelectors) {
      const contentMatch = html.match(new RegExp(`<[^>]*class="[^"]*${selector.replace('.', '')}[^"]*"[^>]*>([\\s\\S]*?)<\/[^>]+>`, 'i'));
      if (contentMatch) {
        content = this.cleanHtmlContent(contentMatch[1]);
        break;
      }
    }

    // Fallback to extracting content between common GitBook markers
    if (!content) {
      const bodyMatch = html.match(/<body[^>]*>([\\s\\S]*?)<\/body>/i);
      if (bodyMatch) {
        content = this.cleanHtmlContent(bodyMatch[1]);
      }
    }

    // Extract sections
    const sections = this.extractSections(content);

    // Get last modified date if available
    const lastModifiedMatch = html.match(/<meta[^>]+property="article:modified_time"[^>]+content="([^"]+)"/i);
    const lastModified = lastModifiedMatch?.[1] ? new Date(lastModifiedMatch[1]) : undefined;

    return {
      url,
      title: title.replace(/\s*\|\s*.*$/, ''), // Remove site suffix
      content: content.trim(),
      lastModified,
      sections,
      metadata: {
        source: 'gitbook',
        plugin: this.id,
        contentType: 'documentation'
      }
    };
  }

  private cleanHtmlContent(html: string): string {
    return html
      // Remove script and style tags completely
      .replace(/<(script|style)[^>]*>([\\s\\S]*?)<\/\\1>/gi, '')
      // Remove HTML comments
      .replace(/<!--[\\s\\S]*?-->/g, '')
      // Remove navigation elements
      .replace(/<(nav|aside|header|footer)[^>]*>([\\s\\S]*?)<\/\\1>/gi, '')
      // Convert common HTML elements to text
      .replace(/<br[^>]*>/gi, '\\n')
      .replace(/<\/?(h[1-6]|p|div|section|article)[^>]*>/gi, '\\n')
      .replace(/<\/?(strong|b)>/gi, '**')
      .replace(/<\/?(em|i)>/gi, '*')
      .replace(/<code[^>]*>([^<]+)<\/code>/gi, '`$1`')
      .replace(/<pre[^>]*>([\\s\\S]*?)<\/pre>/gi, '```\\n$1\\n```')
      // Convert links
      .replace(/<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi, '[$2]($1)')
      // Remove remaining HTML tags
      .replace(/<[^>]+>/g, '')
      // Clean up whitespace
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Normalize line breaks
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
}
