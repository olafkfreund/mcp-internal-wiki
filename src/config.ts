import fs from 'fs';
import path from 'path';

export function loadWikiUrlsFromConfig(): string[] {
  const configPath = path.resolve(process.cwd(), 'mcp.config.json');
  if (!fs.existsSync(configPath)) return [];
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (Array.isArray(config.wikiUrls)) {
      return config.wikiUrls;
    }
  } catch (e) {
    console.warn('Failed to load mcp.config.json:', e);
  }
  return [];
}
