import request from 'supertest';
import express from 'express';
import { WikiManager } from '../src/wikiManager';
import { registerRoutes } from '../src/routes';

describe('MCP Wiki Server', () => {
  let app: express.Express;
  let wikiManager: WikiManager;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    wikiManager = new WikiManager();
    registerRoutes(app, wikiManager);
  });

  it('should add a wiki URL and list it', async () => {
    // Mock addWikiUrl to avoid real HTTP requests
    jest.spyOn(wikiManager, 'addWikiUrl').mockImplementation(async (url: string) => {
      wikiManager['entries'].push({ url, content: 'test content', format: 'markdown' });
    });
    await request(app).post('/wiki').send({ url: 'http://example.com' }).expect(201);
    const res = await request(app).get('/wiki');
    expect(res.body.urls).toContain('http://example.com');
  });

  it('should return 400 if URL is missing', async () => {
    await request(app).post('/wiki').send({}).expect(400);
  });

  it('should return 404 for missing content', async () => {
    const res = await request(app).get('/wiki/content').query({ url: 'http://notfound.com' });
    expect(res.status).toBe(404);
  });
});
