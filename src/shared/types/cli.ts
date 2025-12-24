export type BuiltinAgentId = 'claude' | 'codex' | 'droid' | 'gemini' | 'auggie' | 'cursor';

export interface AgentCliInfo {
  id: string;
  name: string;
  command: string;
  installed: boolean;
  version?: string;
  isBuiltin: boolean;
}

export interface CustomAgent {
  id: string;
  name: string;
  command: string;
  description?: string;
}

export interface AgentCliStatus {
  agents: AgentCliInfo[];
}
