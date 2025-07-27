export interface LLMRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  model: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface LLMResponse {
  id: string;
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'length' | 'function_call' | 'content_filter';
}

export interface LLMStreamChunk {
  id: string;
  content: string;
  delta: string;
  finished: boolean;
}

export interface LLMProvider {
  id: string;
  name: string;
  apiKey?: string;
  baseUrl?: string;
  models: string[];
}

export interface APIError {
  code: string;
  message: string;
  details?: any;
}