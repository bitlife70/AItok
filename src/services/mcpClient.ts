import { JsonRpcClient, JsonRpcNotification } from './jsonRpcClient';
import { MCPTool, MCPResource, MCPPrompt, MCPServerConfig } from './mcpService';

export interface MCPInitializeRequest {
  protocolVersion: string;
  capabilities: {
    roots?: {
      listChanged?: boolean;
    };
    sampling?: {};
  };
  clientInfo: {
    name: string;
    version: string;
  };
}

export interface MCPInitializeResult {
  protocolVersion: string;
  capabilities: {
    logging?: {};
    prompts?: {
      listChanged?: boolean;
    };
    resources?: {
      subscribe?: boolean;
      listChanged?: boolean;
    };
    tools?: {
      listChanged?: boolean;
    };
  };
  serverInfo: {
    name: string;
    version: string;
  };
}

export interface MCPListToolsResult {
  tools: MCPTool[];
}

export interface MCPCallToolRequest {
  name: string;
  arguments?: Record<string, any>;
}

export interface MCPCallToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

export interface MCPListResourcesResult {
  resources: MCPResource[];
}

export interface MCPReadResourceRequest {
  uri: string;
}

export interface MCPReadResourceResult {
  contents: Array<{
    uri: string;
    mimeType?: string;
    text?: string;
    blob?: string;
  }>;
}

export interface MCPListPromptsResult {
  prompts: MCPPrompt[];
}

export interface MCPGetPromptRequest {
  name: string;
  arguments?: Record<string, any>;
}

export interface MCPGetPromptResult {
  description?: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: {
      type: 'text' | 'image' | 'resource';
      text?: string;
      data?: string;
      mimeType?: string;
    };
  }>;
}

export abstract class MCPClient extends JsonRpcClient {
  protected initialized = false;
  protected serverCapabilities: MCPInitializeResult['capabilities'] = {};

  constructor(protected config: MCPServerConfig) {
    super();
  }

  abstract connect(): Promise<void>;

  async initialize(): Promise<MCPInitializeResult> {
    const result = await this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        roots: {
          listChanged: true
        },
        sampling: {}
      },
      clientInfo: {
        name: 'AITok',
        version: '1.0.0'
      }
    } as MCPInitializeRequest);

    this.serverCapabilities = result.capabilities;
    this.initialized = true;

    // Send initialized notification
    await this.notify('notifications/initialized');

    return result;
  }

  async listTools(): Promise<MCPTool[]> {
    this.ensureInitialized();
    const result: MCPListToolsResult = await this.request('tools/list');
    return result.tools || [];
  }

  async callTool(name: string, arguments_?: Record<string, any>): Promise<MCPCallToolResult> {
    this.ensureInitialized();
    return await this.request('tools/call', {
      name,
      arguments: arguments_
    } as MCPCallToolRequest);
  }

  async listResources(): Promise<MCPResource[]> {
    this.ensureInitialized();
    const result: MCPListResourcesResult = await this.request('resources/list');
    return result.resources || [];
  }

  async readResource(uri: string): Promise<MCPReadResourceResult> {
    this.ensureInitialized();
    return await this.request('resources/read', {
      uri
    } as MCPReadResourceRequest);
  }

  async listPrompts(): Promise<MCPPrompt[]> {
    this.ensureInitialized();
    const result: MCPListPromptsResult = await this.request('prompts/list');
    return result.prompts || [];
  }

  async getPrompt(name: string, arguments_?: Record<string, any>): Promise<MCPGetPromptResult> {
    this.ensureInitialized();
    return await this.request('prompts/get', {
      name,
      arguments: arguments_
    } as MCPGetPromptRequest);
  }

  protected onNotification(notification: JsonRpcNotification): void {
    // Handle MCP notifications
    switch (notification.method) {
      case 'notifications/tools/list_changed':
        this.onToolsListChanged();
        break;
      case 'notifications/resources/list_changed':
        this.onResourcesListChanged();
        break;
      case 'notifications/resources/updated':
        this.onResourceUpdated(notification.params);
        break;
      case 'notifications/prompts/list_changed':
        this.onPromptsListChanged();
        break;
      case 'notifications/progress':
        this.onProgress(notification.params);
        break;
      default:
        console.log('Unknown MCP notification:', notification.method, notification.params);
    }
  }

  protected onToolsListChanged(): void {
    console.log('Tools list changed');
  }

  protected onResourcesListChanged(): void {
    console.log('Resources list changed');
  }

  protected onResourceUpdated(params: any): void {
    console.log('Resource updated:', params);
  }

  protected onPromptsListChanged(): void {
    console.log('Prompts list changed');
  }

  protected onProgress(params: any): void {
    console.log('Progress update:', params);
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('MCP client not initialized');
    }
  }

  public getCapabilities(): MCPInitializeResult['capabilities'] {
    return this.serverCapabilities;
  }

  public isInitialized(): boolean {
    return this.initialized;
  }
}