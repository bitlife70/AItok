import { LLMModel } from '../types';

export const DEFAULT_MODELS: LLMModel[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    category: 'reasoning',
    maxTokens: 128000,
    costPer1kTokens: 0.005,
    description: 'Most capable OpenAI model for complex reasoning tasks'
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    category: 'general',
    maxTokens: 128000,
    costPer1kTokens: 0.00015,
    description: 'Fast and efficient model for most tasks'
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    category: 'reasoning',
    maxTokens: 200000,
    costPer1kTokens: 0.003,
    description: 'Excellent for analysis and coding tasks'
  },
  {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    category: 'creative',
    maxTokens: 200000,
    costPer1kTokens: 0.00025,
    description: 'Fast and creative for writing tasks'
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    category: 'reasoning',
    maxTokens: 2000000,
    costPer1kTokens: 0.0035,
    description: 'Google\'s most capable model with large context'
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'google',
    category: 'general',
    maxTokens: 1000000,
    costPer1kTokens: 0.00015,
    description: 'Fast and efficient Google model'
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'google',
    category: 'reasoning',
    maxTokens: 32000,
    costPer1kTokens: 0.0005,
    description: 'Google\'s versatile model for complex tasks'
  }
];