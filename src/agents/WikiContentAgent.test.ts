import { WikiContentAgent, WikiContentAgentArgs } from "./WikiContentAgent";

describe("WikiContentAgent", () => {
  let agent: WikiContentAgent;

  beforeAll(async () => {
    agent = new WikiContentAgent({ maxResults: 2, minRelevanceScore: 0.5, verbose: true });
    await agent.initialize();
  });

  afterAll(async () => {
    await agent.shutdown();
  });

  it("returns results for a valid query", async () => {
    const args: WikiContentAgentArgs = { query: "NixOS configuration" };
    const result = await agent.run(args);
    expect(result.error).toBeUndefined();
    expect(Array.isArray(result.results)).toBe(true);
    expect(result.results.length).toBeGreaterThan(0);
  });

  it("applies maxResults and minRelevanceScore filters", async () => {
    const args: WikiContentAgentArgs = { query: "NixOS", maxResults: 1, minRelevanceScore: 0.7 };
    const result = await agent.run(args);
    expect(result.results.length).toBeLessThanOrEqual(1);
    if (result.results.length > 0 && result.results[0].relevanceScore !== undefined) {
      expect(result.results[0].relevanceScore).toBeGreaterThanOrEqual(0.7);
    }
  });

  it("returns an error for invalid input", async () => {
    // @ts-expect-error: purposely passing invalid args
    const result = await agent.run({});
    expect(result.error).toBeDefined();
    expect(result.results.length).toBe(0);
  });
});
