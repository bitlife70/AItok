export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  model?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LLMModel {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'local';
  category: 'reasoning' | 'coding' | 'creative' | 'general';
  maxTokens: number;
  costPer1kTokens: number;
  description: string;
}

export interface AgentProcess {
  id: string;
  step: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  startTime: Date;
  endTime?: Date;
  details?: string;
  tools?: string[];
}

export interface MCPServer {
  id: string;
  name: string;
  url?: string;
  type: 'stdio' | 'http';
  status: 'connected' | 'disconnected' | 'error';
  capabilities: string[];
}

export type Language = 'en' | 'ko';