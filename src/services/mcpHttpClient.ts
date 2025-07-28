import { MCPClient } from './mcpClient';
import { MCPServerConfig } from './mcpService';
import { JsonRpcMessage } from './jsonRpcClient';

export class MCPHttpClient extends MCPClient {
  private eventSource: EventSource | null = null;

  constructor(config: MCPServerConfig) {
    super(config);
    if (config.type !== 'http') {
      throw new Error('MCPHttpClient can only be used with HTTP servers');
    }
    if (!config.url) {
      throw new Error('HTTP MCP server requires URL');
    }
  }

  async connect(): Promise<void> {
    // Test connection to the server
    try {
      const response = await fetch(`${this.config.url}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Set up Server-Sent Events for notifications
      this.eventSource = new EventSource(`${this.config.url}/events`);
      
      this.eventSource.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse SSE message:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
      };

      console.log(`Connected to HTTP MCP server: ${this.config.url}`);
    } catch (error) {
      throw new Error(`Failed to connect to MCP server: ${error}`);
    }
  }

  protected async sendMessage(message: JsonRpcMessage): Promise<void> {
    if (!this.config.url) {
      throw new Error('Server URL not configured');
    }

    try {
      const response = await fetch(`${this.config.url}/jsonrpc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle response for requests (not notifications)
      if ('id' in message) {
        const responseMessage = await response.json();
        this.handleMessage(responseMessage);
      }
    } catch (error) {
      throw new Error(`Failed to send message: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    super.disconnect();
  }

  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }
}