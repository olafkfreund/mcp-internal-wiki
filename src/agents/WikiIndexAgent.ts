import { Agent } from "./Agent";
import { WikiSource } from "../sources/wikiSource";

export interface WikiIndexAgentArgs {
  rebuild?: boolean;
}

export interface WikiIndexAgentResult {
  status: string;
  error?: string;
}

export class WikiIndexAgent implements Agent {
  name = "WikiIndexAgent";
  private wikiSource: WikiSource;

  constructor() {
    this.wikiSource = new WikiSource();
  }

  async initialize() {}

  async run(args: WikiIndexAgentArgs = {}): Promise<WikiIndexAgentResult> {
    try {
      if (args.rebuild) {
        if (typeof (this.wikiSource as any).rebuildIndex === "function") {
          await (this.wikiSource as any).rebuildIndex();
          return { status: "Index rebuilt" };
        } else {
          throw new Error("rebuildIndex not implemented in WikiSource");
        }
      }
      return { status: "No action taken" };
    } catch (error: any) {
      return { status: "error", error: error?.message || String(error) };
    }
  }

  async shutdown() {}
}
