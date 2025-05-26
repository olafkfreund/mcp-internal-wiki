import { Express, Request, Response } from 'express';
import { WikiManager } from './wikiManager';

export function registerRoutes(app: Express, wikiManager: WikiManager) {
  app.post('/wiki', async (req: Request, res: Response) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });
    try {
      await wikiManager.addWikiUrl(url);
      res.status(201).json({ message: 'Wiki URL added', url });
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch or add URL', details: String(e) });
    }
  });

  app.get('/wiki', (req: Request, res: Response) => {
    res.json({ urls: wikiManager.listUrls() });
  });

  app.get('/wiki/content', (req: Request, res: Response) => {
    const { url } = req.query;
    if (typeof url !== 'string') return res.status(400).json({ error: 'URL is required' });
    const content = wikiManager.getContent(url);
    if (!content) return res.status(404).json({ error: 'Content not found' });
    res.json({ url, content });
  });

  app.get('/wiki/commands', (req: Request, res: Response) => {
    const { url } = req.query;
    if (typeof url !== 'string') return res.status(400).json({ error: 'URL is required' });
    const commands = wikiManager.extractCommands(url);
    res.json({ url, commands });
  });

  app.get('/wiki/templates', (req: Request, res: Response) => {
    const { url } = req.query;
    if (typeof url !== 'string') return res.status(400).json({ error: 'URL is required' });
    const templates = wikiManager.extractTemplates(url);
    res.json({ url, templates });
  });
}
