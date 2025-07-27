export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  content?: string;
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  model?: string;
  files?: UploadedFile[];
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
  parentId?: string;
  children?: string[];
  decision?: AgentDecision;
  metadata?: Record<string, any>;
}

export interface AgentDecision {
  question: string;
  options: DecisionOption[];
  selectedOption?: string;
  reasoning?: string;
  confidence?: number;
}

export interface DecisionOption {
  id: string;
  label: string;
  description?: string;
  weight?: number;
  consequences?: string[];
}

export interface ProcessNode {
  id: string;
  type: 'process' | 'decision' | 'tool' | 'input' | 'output';
  label: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  x?: number;
  y?: number;
  children?: string[];
  parent?: string;
  data?: any;
}

export interface ProcessFlow {
  id: string;
  name: string;
  nodes: ProcessNode[];
  edges: FlowEdge[];
  startTime: Date;
  endTime?: Date;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: 'normal' | 'decision' | 'error';
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