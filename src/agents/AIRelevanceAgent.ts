import { Agent } from "./Agent";
import { AIService } from "../ai/aiService";
import { AIEnhancedWikiContent } from "../ai/types";

export interface AIRelevanceAgentArgs {
  query: string;
  contents: { title: string; content: string; url?: string }[];
  minScore?: number;
}

export interface AIRelevanceAgentResult {
  results: Array<AIEnhancedWikiContent & { relevanceScore: number }>; 
  error?: string;
}

export class AIRelevanceAgent implements Agent {
  name = "AIRelevanceAgent";
  private aiService: AIService;
  private minScore?: number;

  constructor(config?: { minScore?: number }) {
    this.aiService = new AIService({ enabled: true, primaryProvider: 'mock', providers: { mock: { type: 'mock', enabled: true } } });
    this.minScore = config?.minScore;
  }

  async initialize() {
    // Optionally warm up AI providers
  }

  async run(args: AIRelevanceAgentArgs): Promise<AIRelevanceAgentResult> {
    try {
      if (!args || !args.query || !Array.isArray(args.contents)) {
        throw new Error("Query and contents array are required");
      }
      const provider = this.aiService.getPrimaryProvider();
      if (!provider) throw new Error("No AI provider available");
      const results = await Promise.all(
        args.contents.map(async (item) => {
          const relevanceScore = await provider.calculateRelevance(args.query, item.content);
          return { ...item, relevanceScore, source: (item as any).source || 'wiki' };
        })
      );
      const minScore = args.minScore ?? this.minScore ?? 0;
      const filtered = results.filter(r => r.relevanceScore >= minScore);
      return { results: filtered };
    } catch (error: any) {
      return { results: [], error: error?.message || String(error) };
    }
  }

  async shutdown() {}
}
