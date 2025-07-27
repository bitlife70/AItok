import { LLMRequest, LLMResponse, LLMStreamChunk } from '../types/api';

class LLMService {
  private providers: Map<string, any> = new Map();

  // Initialize providers with API keys from environment
  constructor() {
    this.setupProviders();
  }

  private setupProviders() {
    // OpenAI provider
    if (typeof window !== 'undefined' && (window as any).OPENAI_API_KEY) {
      this.providers.set('openai', {
        apiKey: (window as any).OPENAI_API_KEY,
        baseUrl: 'https://api.openai.com/v1'
      });
    }

    // Anthropic provider
    if (typeof window !== 'undefined' && (window as any).ANTHROPIC_API_KEY) {
      this.providers.set('anthropic', {
        apiKey: (window as any).ANTHROPIC_API_KEY,
        baseUrl: 'https://api.anthropic.com/v1'
      });
    }

    // Local provider (Ollama)
    this.providers.set('local', {
      baseUrl: 'http://localhost:11434/api'
    });
  }

  async sendMessage(request: LLMRequest): Promise<LLMResponse> {
    const provider = this.getProviderFromModel(request.model);
    
    switch (provider) {
      case 'openai':
        return this.sendOpenAIMessage(request);
      case 'anthropic':
        return this.sendAnthropicMessage(request);
      case 'local':
        return this.sendOllamaMessage(request);
      default:
        return this.sendMockMessage(request);
    }
  }

  async *streamMessage(request: LLMRequest): AsyncGenerator<LLMStreamChunk> {
    const provider = this.getProviderFromModel(request.model);
    
    switch (provider) {
      case 'openai':
        yield* this.streamOpenAIMessage(request);
        break;
      case 'anthropic':
        yield* this.streamAnthropicMessage(request);
        break;
      case 'local':
        yield* this.streamOllamaMessage(request);
        break;
      default:
        yield* this.streamMockMessage(request);
        break;
    }
  }

  private getProviderFromModel(model: string): string {
    if (model.startsWith('gpt-')) return 'openai';
    if (model.startsWith('claude-')) return 'anthropic';
    if (model.startsWith('llama') || model.startsWith('mistral')) return 'local';
    return 'mock';
  }

  private async sendOpenAIMessage(request: LLMRequest): Promise<LLMResponse> {
    const provider = this.providers.get('openai');
    if (!provider) throw new Error('OpenAI provider not configured');

    try {
      const response = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.apiKey}`
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          temperature: request.temperature || 0.7,
          max_tokens: request.maxTokens || 1000
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        id: data.id,
        content: data.choices[0].message.content,
        model: data.model,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens
        },
        finishReason: data.choices[0].finish_reason
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  private async sendAnthropicMessage(request: LLMRequest): Promise<LLMResponse> {
    const provider = this.providers.get('anthropic');
    if (!provider) throw new Error('Anthropic provider not configured');

    try {
      const response = await fetch(`${provider.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': provider.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          max_tokens: request.maxTokens || 1000
        })
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        id: data.id,
        content: data.content[0].text,
        model: data.model,
        usage: {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens
        },
        finishReason: data.stop_reason
      };
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw error;
    }
  }

  private async sendOllamaMessage(request: LLMRequest): Promise<LLMResponse> {
    const provider = this.providers.get('local');
    
    try {
      const response = await fetch(`${provider.baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        id: Date.now().toString(),
        content: data.message.content,
        model: request.model,
        usage: {
          promptTokens: data.prompt_eval_count || 0,
          completionTokens: data.eval_count || 0,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
        },
        finishReason: 'stop'
      };
    } catch (error) {
      console.error('Ollama API error:', error);
      throw error;
    }
  }

  private async sendMockMessage(request: LLMRequest): Promise<LLMResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    const lastMessage = request.messages[request.messages.length - 1];
    const mockResponses = [
      `I understand you're asking about: "${lastMessage.content}". This is a simulated response from ${request.model}.`,
      `Thank you for your question about "${lastMessage.content}". As an AI assistant using ${request.model}, I can help you with that.`,
      `That's an interesting question: "${lastMessage.content}". Let me provide some thoughts using ${request.model}.`,
      `Based on your message "${lastMessage.content}", here's my response from ${request.model}.`
    ];

    const response = mockResponses[Math.floor(Math.random() * mockResponses.length)];
    
    return {
      id: Date.now().toString(),
      content: response,
      model: request.model,
      usage: {
        promptTokens: lastMessage.content.length / 4,
        completionTokens: response.length / 4,
        totalTokens: (lastMessage.content.length + response.length) / 4
      },
      finishReason: 'stop'
    };
  }

  private async *streamOpenAIMessage(request: LLMRequest): AsyncGenerator<LLMStreamChunk> {
    // Mock streaming for now - implement actual streaming later
    const response = await this.sendOpenAIMessage({ ...request, stream: false });
    const words = response.content.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      const delta = words[i] + (i < words.length - 1 ? ' ' : '');
      const content = words.slice(0, i + 1).join(' ');
      
      yield {
        id: response.id,
        content,
        delta,
        finished: i === words.length - 1
      };
    }
  }

  private async *streamAnthropicMessage(request: LLMRequest): AsyncGenerator<LLMStreamChunk> {
    // Mock streaming for now
    const response = await this.sendAnthropicMessage({ ...request, stream: false });
    const words = response.content.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      const delta = words[i] + (i < words.length - 1 ? ' ' : '');
      const content = words.slice(0, i + 1).join(' ');
      
      yield {
        id: response.id,
        content,
        delta,
        finished: i === words.length - 1
      };
    }
  }

  private async *streamOllamaMessage(request: LLMRequest): AsyncGenerator<LLMStreamChunk> {
    // Mock streaming for now
    const response = await this.sendOllamaMessage({ ...request, stream: false });
    const words = response.content.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      const delta = words[i] + (i < words.length - 1 ? ' ' : '');
      const content = words.slice(0, i + 1).join(' ');
      
      yield {
        id: response.id,
        content,
        delta,
        finished: i === words.length - 1
      };
    }
  }

  private async *streamMockMessage(request: LLMRequest): AsyncGenerator<LLMStreamChunk> {
    const response = await this.sendMockMessage({ ...request, stream: false });
    const words = response.content.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      const delta = words[i] + (i < words.length - 1 ? ' ' : '');
      const content = words.slice(0, i + 1).join(' ');
      
      yield {
        id: response.id,
        content,
        delta,
        finished: i === words.length - 1
      };
    }
  }

  // Add API key for a provider
  setApiKey(provider: string, apiKey: string) {
    const providerConfig = this.providers.get(provider);
    if (providerConfig) {
      providerConfig.apiKey = apiKey;
    }
  }

  // Check if provider is available
  isProviderAvailable(provider: string): boolean {
    const config = this.providers.get(provider);
    return config && (provider === 'local' || config.apiKey);
  }
}

export const llmService = new LLMService();