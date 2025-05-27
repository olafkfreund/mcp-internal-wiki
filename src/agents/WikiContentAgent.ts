import { Agent } from "./Agent";
import { WikiSource } from "../sources/wikiSource";

export interface WikiContentAgentArgs {
  query: string;
  maxResults?: number;
  minRelevanceScore?: number;
}

export interface WikiContentAgentResult {
  results: any[];
  error?: string;
}

// Agent that wraps WikiSource for content fetching
export class WikiContentAgent implements Agent {
  name = "WikiContentAgent";
  private wikiSource: WikiSource;
  private config: { maxResults?: number; minRelevanceScore?: number; verbose?: boolean };

  constructor(config?: { maxResults?: number; minRelevanceScore?: number; verbose?: boolean }) {
    this.wikiSource = new WikiSource();
    this.config = config || {};
  }

  async initialize() {
    // Prefetch wiki content for faster queries
    if (typeof this.wikiSource["prefetchWikiContent"] === "function") {
      try {
        await (this.wikiSource as any).prefetchWikiContent();
        this.log("Prefetch complete");
      } catch (e) {
        this.log("WikiContentAgent prefetch failed: " + e);
      }
    }
  }

  private log(message: string) {
    // Simple logging, can be replaced with a logger
    if (this.config.verbose) {
      // eslint-disable-next-line no-console
      console.log(`[WikiContentAgent] ${message}`);
    }
  }

  async run(args: WikiContentAgentArgs): Promise<WikiContentAgentResult> {
    try {
      if (!args || typeof args.query !== "string") {
        throw new Error("Query string is required");
      }
      const maxResults = args.maxResults ?? this.config.maxResults;
      const minRelevanceScore = args.minRelevanceScore ?? this.config.minRelevanceScore;
      const contextResults = await this.wikiSource.getContext({ query: { text: args.query } });
      let filtered = contextResults;
      if (minRelevanceScore !== undefined) {
        filtered = filtered.filter((r: any) => r.relevanceScore === undefined || r.relevanceScore >= minRelevanceScore);
      }
      if (maxResults !== undefined) {
        filtered = filtered.slice(0, maxResults);
      }
      this.log(`Query: '${args.query}', Results: ${filtered.length}`);
      return { results: filtered };
    } catch (error: any) {
      this.log(`Error: ${error?.message || String(error)}`);
      return { results: [], error: error?.message || String(error) };
    }
  }

  async shutdown() {
    // Optionally clean up resources
  }
}
