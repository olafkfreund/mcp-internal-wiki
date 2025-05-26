import express from 'express';
import { WikiManager } from './wikiManager';
import { registerRoutes } from './routes';
import { loadWikiUrlsFromConfig } from './config';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const wikiManager = new WikiManager();

// Load wiki URLs from config at startup
(async () => {
  const urls = loadWikiUrlsFromConfig();
  for (const url of urls) {
    try {
      await wikiManager.addWikiUrl(url);
      console.log(`Loaded wiki URL from config: ${url}`);
    } catch (e) {
      console.warn(`Failed to load wiki URL from config: ${url}`, e);
    }
  }
})();

registerRoutes(app, wikiManager);

app.listen(port, () => {
  console.log(`MCP Wiki Server running at http://localhost:${port}`);
});
