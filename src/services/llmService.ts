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

    // Google provider
    if (typeof window !== 'undefined' && (window as any).GOOGLE_API_KEY) {
      this.providers.set('google', {
        apiKey: (window as any).GOOGLE_API_KEY,
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta'
      });
    }

    // Local provider (Ollama)
    this.providers.set('local', {
      baseUrl: 'http://localhost:11434/api'
    });
  }

  async sendMessage(request: LLMRequest): Promise<LLMResponse> {
    const provider = this.getProviderFromModel(request.model);
    
    // Check if provider is actually available with API key
    if (!this.isProviderAvailable(provider)) {
      console.warn(`Provider ${provider} not available, falling back to mock response`);
      return this.sendMockMessage(request);
    }
    
    switch (provider) {
      case 'openai':
        return this.sendOpenAIMessage(request);
      case 'anthropic':
        return this.sendAnthropicMessage(request);
      case 'google':
        return this.sendGoogleMessage(request);
      case 'local':
        return this.sendOllamaMessage(request);
      default:
        return this.sendMockMessage(request);
    }
  }

  async *streamMessage(request: LLMRequest): AsyncGenerator<LLMStreamChunk> {
    const provider = this.getProviderFromModel(request.model);
    
    // Check if provider is actually available with API key
    if (!this.isProviderAvailable(provider)) {
      console.warn(`Provider ${provider} not available for streaming, falling back to mock response`);
      yield* this.streamMockMessage(request);
      return;
    }
    
    switch (provider) {
      case 'openai':
        yield* this.streamOpenAIMessage(request);
        break;
      case 'anthropic':
        yield* this.streamAnthropicMessage(request);
        break;
      case 'google':
        yield* this.streamGoogleMessage(request);
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
    if (model.startsWith('gpt-') || model.includes('gpt') || model.startsWith('o1-')) return 'openai';
    if (model.startsWith('claude-') || model.includes('claude')) return 'anthropic';
    if (model.startsWith('gemini') || model.includes('gemini')) return 'google';
    if (model.startsWith('llama') || model.startsWith('mistral') || model.startsWith('qwen')) return 'local';
    return 'mock';
  }

  private async sendOpenAIMessage(request: LLMRequest): Promise<LLMResponse> {
    const provider = this.providers.get('openai');
    if (!provider) throw new Error('OpenAI provider not configured');

    try {
      const requestBody = {
        model: request.model,
        messages: request.messages,
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 1000
      };

      console.log('OpenAI API Request (non-stream):', {
        url: `${provider.baseUrl}/chat/completions`,
        model: request.model,
        messageCount: request.messages.length
      });

      const response = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      console.log('OpenAI API Response (non-stream):', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API Error Response (non-stream):', errorText);
        
        // Handle quota exceeded error gracefully
        if (response.status === 429) {
          console.warn('OpenAI API quota exceeded, falling back to mock response');
          return this.sendMockMessage(request);
        }
        
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
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

  private async sendGoogleMessage(request: LLMRequest): Promise<LLMResponse> {
    const provider = this.providers.get('google');
    if (!provider) throw new Error('Google provider not configured');

    try {
      // Convert messages to Google format
      const contents = this.convertMessagesToGoogleFormat(request.messages);

      const requestBody = {
        contents,
        generationConfig: {
          temperature: request.temperature || 0.7,
          maxOutputTokens: request.maxTokens || 1000,
        }
      };

      console.log('Google API Request (non-stream):', {
        url: `${provider.baseUrl}/models/${request.model}:generateContent`,
        model: request.model,
        messageCount: request.messages.length
      });

      const response = await fetch(`${provider.baseUrl}/models/${request.model}:generateContent?key=${provider.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Google API Response (non-stream):', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Google API Error Response (non-stream):', errorText);
        
        // Handle quota exceeded error gracefully
        if (response.status === 429) {
          console.warn('Google API quota exceeded, falling back to mock response');
          return this.sendMockMessage(request);
        }
        
        throw new Error(`Google API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      return {
        id: Date.now().toString(),
        content: data.candidates[0].content.parts[0].text,
        model: request.model,
        usage: {
          promptTokens: data.usageMetadata?.promptTokenCount || 0,
          completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: data.usageMetadata?.totalTokenCount || 0
        },
        finishReason: data.candidates[0].finishReason
      };
    } catch (error) {
      console.error('Google API error:', error);
      throw error;
    }
  }

  private convertMessagesToGoogleFormat(messages: any[]) {
    const contents = [];
    
    for (const message of messages) {
      // Google Gemini format doesn't use role field in contents array
      // Instead, it alternates between user and model responses
      contents.push({
        parts: [{ text: message.content }]
      });
    }
    
    return contents;
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
    
    // Check if this is a fallback due to quota issues
    const isQuotaFallback = request.model.startsWith('gpt-') || request.model.startsWith('claude-');
    
    const mockResponses = isQuotaFallback ? [
      `📝 *Demo Mode* - I understand you're asking about: "${lastMessage.content}". (Note: This is a simulated response due to API quota limits. Please check your API billing or try again later for actual ${request.model} responses.)`,
      `💡 *Demo Response* - Thank you for your question about "${lastMessage.content}". This is a demonstration of how ${request.model} would respond. To use the actual model, please ensure your API quota is available.`,
      `🔄 *Simulated Response* - That's an interesting question: "${lastMessage.content}". This demo shows the interface working. For real ${request.model} responses, please check your API limits.`,
      `⚡ *Demo Answer* - Based on your message "${lastMessage.content}", here's a simulated response. The actual ${request.model} would provide more comprehensive answers once API access is restored.`
    ] : [
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
    const provider = this.providers.get('openai');
    if (!provider) {
      yield* this.streamMockMessage(request);
      return;
    }

    try {
      const requestBody = {
        model: request.model,
        messages: request.messages,
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 1000,
        stream: true
      };

      console.log('OpenAI API Request:', {
        url: `${provider.baseUrl}/chat/completions`,
        model: request.model,
        messageCount: request.messages.length
      });

      const response = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      console.log('OpenAI API Response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API Error Response:', errorText);
        
        // Handle quota exceeded error gracefully
        if (response.status === 429) {
          console.warn('OpenAI API quota exceeded, falling back to mock response');
          yield* this.streamMockMessage(request);
          return;
        }
        
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let content = '';
      let responseId = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield {
                id: responseId,
                content,
                delta: '',
                finished: true
              };
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.choices && parsed.choices[0]) {
                const choice = parsed.choices[0];
                responseId = parsed.id;
                
                if (choice.delta && choice.delta.content) {
                  const delta = choice.delta.content;
                  content += delta;
                  
                  yield {
                    id: responseId,
                    content,
                    delta,
                    finished: false
                  };
                }
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } catch (error) {
      console.error('OpenAI streaming error:', error);
      yield* this.streamMockMessage(request);
    }
  }

  private async *streamAnthropicMessage(request: LLMRequest): AsyncGenerator<LLMStreamChunk> {
    const provider = this.providers.get('anthropic');
    if (!provider) {
      yield* this.streamMockMessage(request);
      return;
    }

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
          max_tokens: request.maxTokens || 1000,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let content = '';
      let responseId = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            try {
              const parsed = JSON.parse(data);
              
              if (parsed.type === 'message_start') {
                responseId = parsed.message.id;
              } else if (parsed.type === 'content_block_delta') {
                const delta = parsed.delta.text;
                content += delta;
                
                yield {
                  id: responseId,
                  content,
                  delta,
                  finished: false
                };
              } else if (parsed.type === 'message_delta' && parsed.delta.stop_reason) {
                yield {
                  id: responseId,
                  content,
                  delta: '',
                  finished: true
                };
                return;
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } catch (error) {
      console.error('Anthropic streaming error:', error);
      yield* this.streamMockMessage(request);
    }
  }

  private async *streamGoogleMessage(request: LLMRequest): AsyncGenerator<LLMStreamChunk> {
    // Google Gemini API doesn't support true streaming yet
    // So we'll simulate streaming by using the regular API and chunking the response
    try {
      const response = await this.sendGoogleMessage(request);
      const words = response.content.split(' ');
      
      for (let i = 0; i < words.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate streaming delay
        const delta = words[i] + (i < words.length - 1 ? ' ' : '');
        const content = words.slice(0, i + 1).join(' ');
        
        yield {
          id: response.id,
          content,
          delta,
          finished: i === words.length - 1
        };
      }
    } catch (error) {
      console.error('Google streaming error:', error);
      yield* this.streamMockMessage(request);
    }
  }

  private async *streamOllamaMessage(request: LLMRequest): AsyncGenerator<LLMStreamChunk> {
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
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let content = '';
      const responseId = Date.now().toString();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            
            if (parsed.message && parsed.message.content) {
              const delta = parsed.message.content;
              content += delta;
              
              yield {
                id: responseId,
                content,
                delta,
                finished: parsed.done || false
              };
            }

            if (parsed.done) {
              return;
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      }
    } catch (error) {
      console.error('Ollama streaming error:', error);
      yield* this.streamMockMessage(request);
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
    let providerConfig = this.providers.get(provider);
    if (!providerConfig) {
      // Create provider config if it doesn't exist
      if (provider === 'openai') {
        providerConfig = {
          baseUrl: 'https://api.openai.com/v1'
        };
      } else if (provider === 'anthropic') {
        providerConfig = {
          baseUrl: 'https://api.anthropic.com/v1'
        };
      } else if (provider === 'google') {
        providerConfig = {
          baseUrl: 'https://generativelanguage.googleapis.com/v1beta'
        };
      } else if (provider === 'local') {
        providerConfig = {
          baseUrl: 'http://localhost:11434/api'
        };
      } else {
        providerConfig = {};
      }
      this.providers.set(provider, providerConfig);
    }
    
    if (provider !== 'local') {
      providerConfig.apiKey = apiKey;
    }
    
    // Also set in window for backward compatibility
    if (typeof window !== 'undefined') {
      if (provider === 'openai') {
        (window as any).OPENAI_API_KEY = apiKey;
      } else if (provider === 'anthropic') {
        (window as any).ANTHROPIC_API_KEY = apiKey;
      } else if (provider === 'google') {
        (window as any).GOOGLE_API_KEY = apiKey;
      }
    }
  }

  // Check if provider is available
  isProviderAvailable(provider: string): boolean {
    const config = this.providers.get(provider);
    if (!config) return false;
    
    if (provider === 'local') return true;
    
    // Check if API key exists and is not empty
    const hasValidKey = config.apiKey && config.apiKey.trim().length > 0;
    console.log(`Provider ${provider} availability:`, {
      hasConfig: !!config,
      hasApiKey: !!config.apiKey,
      keyLength: config.apiKey ? config.apiKey.length : 0,
      isValid: hasValidKey
    });
    
    return hasValidKey;
  }

  // Get provider status
  getProviderStatus(provider: string): 'available' | 'no-key' | 'not-configured' {
    const config = this.providers.get(provider);
    if (!config) return 'not-configured';
    if (provider === 'local') return 'available';
    return config.apiKey ? 'available' : 'no-key';
  }

  // Test connection to a provider
  async testConnection(provider: string): Promise<{ success: boolean; message: string }> {
    try {
      if (provider === 'local') {
        const response = await fetch('http://localhost:11434/api/tags');
        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            message: `Connected! Found ${data.models?.length || 0} models`
          };
        } else {
          return {
            success: false,
            message: 'Ollama server not responding. Make sure Ollama is running.'
          };
        }
      } else {
        const config = this.providers.get(provider);
        if (!config?.apiKey) {
          return {
            success: false,
            message: 'API key not configured'
          };
        }

        if (provider === 'openai') {
          // Test with a simple chat completion request
          const testResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [{ role: 'user', content: 'test' }],
              max_tokens: 1
            })
          });
          
          if (testResponse.ok) {
            return {
              success: true,
              message: 'Connected! API key is valid'
            };
          } else {
            const errorText = await testResponse.text();
            return {
              success: false,
              message: `OpenAI API error: ${testResponse.status} ${testResponse.statusText} - ${errorText}`
            };
          }
        } else if (provider === 'anthropic') {
          // For Anthropic, we'll just validate the API key format since testing requires a request
          if (config.apiKey.startsWith('sk-ant-')) {
            return {
              success: true,
              message: 'API key format is valid'
            };
          } else {
            return {
              success: false,
              message: 'Invalid API key format. Should start with sk-ant-'
            };
          }
        } else if (provider === 'google') {
          // Test with a simple generate content request
          const testResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.apiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [{ 
                parts: [{ text: 'test' }] 
              }],
              generationConfig: { 
                maxOutputTokens: 1 
              }
            })
          });
          
          if (testResponse.ok) {
            return {
              success: true,
              message: 'Connected! API key is valid'
            };
          } else {
            const errorText = await testResponse.text();
            return {
              success: false,
              message: `Google API error: ${testResponse.status} ${testResponse.statusText} - ${errorText}`
            };
          }
        }
      }

      return {
        success: false,
        message: 'Unknown provider'
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }
}

export const llmService = new LLMService();