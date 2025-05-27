import { Agent } from "./Agent";

export class AgentManager {
  private agents: Map<string, Agent> = new Map();

  register(agent: Agent) {
    this.agents.set(agent.name, agent);
  }

  getAgent(name: string): Agent | undefined {
    return this.agents.get(name);
  }

  async initializeAll() {
    for (const agent of this.agents.values()) {
      if (agent.initialize) await agent.initialize();
    }
  }

  async shutdownAll() {
    for (const agent of this.agents.values()) {
      if (agent.shutdown) await agent.shutdown();
    }
  }
}
