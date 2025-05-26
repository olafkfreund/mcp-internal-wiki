import axios from 'axios';
import { parse as parseMarkdown } from 'marked';
// Placeholder imports for other formats
// import { parse as parseMediaWiki } from 'mediawiki-parser';
// import { parse as parseGitbook } from 'gitbook-parser';
// import { parse as parseConfluence } from 'confluence-parser';
// import { parse as parseSharepoint } from 'sharepoint-parser';

export type WikiFormat = 'markdown' | 'mediawiki' | 'gitbook' | 'confluence' | 'sharepoint' | 'auto';

export interface WikiEntry {
  url: string;
  content: string;
  format: WikiFormat;
}

function detectFormat(url: string, content: string): WikiFormat {
  if (/confluence/.test(url)) return 'confluence';
  if (/sharepoint/.test(url)) return 'sharepoint';
  if (/gitbook/.test(url)) return 'gitbook';
  if (/mediawiki/.test(url)) return 'mediawiki';
  if (/\.md$/.test(url) || /^#|^\s*\*/m.test(content)) return 'markdown';
  return 'auto';
}

export class WikiManager {
  private entries: WikiEntry[] = [];

  async addWikiUrl(url: string): Promise<void> {
    const response = await axios.get(url);
    const content = response.data;
    const format = detectFormat(url, content);
    this.entries.push({ url, content, format });
  }

  listUrls(): string[] {
    return this.entries.map(e => e.url);
  }

  getContent(url: string): string | undefined {
    return this.entries.find(e => e.url === url)?.content;
  }

  extractCommands(url: string): string[] {
    const entry = this.entries.find(e => e.url === url);
    if (!entry) return [];
    switch (entry.format) {
      case 'markdown':
        // Example: extract code blocks as commands
        return (entry.content.match(/```[\w]*\n([\s\S]*?)```/g) || []).map(block => block.replace(/```[\w]*\n|```/g, '').trim());
      case 'mediawiki':
        // TODO: Implement MediaWiki parsing
        return [];
      case 'gitbook':
        // TODO: Implement Gitbook parsing
        return [];
      case 'confluence':
        // TODO: Implement Confluence parsing
        return [];
      case 'sharepoint':
        // TODO: Implement Sharepoint parsing
        return [];
      default:
        return [];
    }
  }

  extractTemplates(url: string): string[] {
    const entry = this.entries.find(e => e.url === url);
    if (!entry) return [];
    switch (entry.format) {
      case 'markdown':
        // Example: extract template code blocks
        return (entry.content.match(/```template[\w]*\n([\s\S]*?)```/g) || []).map(block => block.replace(/```template[\w]*\n|```/g, '').trim());
      case 'mediawiki':
        // TODO: Implement MediaWiki template extraction
        return [];
      case 'gitbook':
        // TODO: Implement Gitbook template extraction
        return [];
      case 'confluence':
        // TODO: Implement Confluence template extraction
        return [];
      case 'sharepoint':
        // TODO: Implement Sharepoint template extraction
        return [];
      default:
        return [];
    }
  }
}
