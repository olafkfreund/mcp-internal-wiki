// Agent interface for MCP Internal Wiki Server
export interface Agent {
  name: string;
  initialize?(): Promise<void>;
  run(...args: any[]): Promise<any>;
  shutdown?(): Promise<void>;
}
