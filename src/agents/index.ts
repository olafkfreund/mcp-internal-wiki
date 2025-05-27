import { AgentManager } from "./AgentManager";
import { WikiContentAgent } from "./WikiContentAgent";
import { AIRelevanceAgent } from "./AIRelevanceAgent";
import { WikiIndexAgent } from "./WikiIndexAgent";

// Register and initialize agents here
const agentManager = new AgentManager();

// Register WikiContentAgent
agentManager.register(new WikiContentAgent());

// Register AIRelevanceAgent
agentManager.register(new AIRelevanceAgent());

// Register WikiIndexAgent
agentManager.register(new WikiIndexAgent());

// Optionally, initialize all agents at startup
(async () => {
  await agentManager.initializeAll();
})();

export { agentManager };
