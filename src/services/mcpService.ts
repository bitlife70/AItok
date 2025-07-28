import { MCPServer } from '../types';
import { MCPClient } from './mcpClient';
import { MCPStdioClient } from './mcpStdioClient';
import { MCPHttpClient } from './mcpHttpClient';

export interface MCPCapability {
  name: string;
  description: string;
  version: string;
}

export interface MCPServerConfig {
  id: string;
  name: string;
  type: 'stdio' | 'http';
  url?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPPrompt {
  name: string;
  description: string;
  arguments?: any[];
}

class MCPService {
  private servers: Map<string, MCPServerConnection> = new Map();
  private listeners: ((servers: MCPServer[]) => void)[] = [];

  // Add a listener for server status changes
  addListener(callback: (servers: MCPServer[]) => void) {
    this.listeners.push(callback);
  }

  removeListener(callback: (servers: MCPServer[]) => void) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  private notifyListeners() {
    const servers = Array.from(this.servers.values()).map(conn => conn.getServerInfo());
    this.listeners.forEach(listener => listener(servers));
  }

  // Connect to an MCP server
  async connectServer(config: MCPServerConfig): Promise<void> {
    try {
      const connection = new MCPServerConnection(config);
      await connection.connect();
      this.servers.set(config.id, connection);
      this.notifyListeners();
    } catch (error) {
      console.error(`Failed to connect to MCP server ${config.name}:`, error);
      throw error;
    }
  }

  // Disconnect from an MCP server
  async disconnectServer(serverId: string): Promise<void> {
    const connection = this.servers.get(serverId);
    if (connection) {
      await connection.disconnect();
      this.servers.delete(serverId);
      this.notifyListeners();
    }
  }

  // Get all connected servers
  getServers(): MCPServer[] {
    return Array.from(this.servers.values()).map(conn => conn.getServerInfo());
  }

  // Get server by ID
  getServer(serverId: string): MCPServer | undefined {
    const connection = this.servers.get(serverId);
    return connection?.getServerInfo();
  }

  // List available tools from all servers
  async listTools(): Promise<{ serverId: string; tools: MCPTool[] }[]> {
    const results = [];
    for (const [serverId, connection] of this.servers) {
      try {
        const tools = await connection.listTools();
        results.push({ serverId, tools });
      } catch (error) {
        console.error(`Failed to list tools from server ${serverId}:`, error);
      }
    }
    return results;
  }

  // Call a tool from a specific server
  async callTool(serverId: string, toolName: string, arguments_: any): Promise<any> {
    const connection = this.servers.get(serverId);
    if (!connection) {
      throw new Error(`Server ${serverId} not found`);
    }
    return await connection.callTool(toolName, arguments_);
  }

  // List available resources from all servers
  async listResources(): Promise<{ serverId: string; resources: MCPResource[] }[]> {
    const results = [];
    for (const [serverId, connection] of this.servers) {
      try {
        const resources = await connection.listResources();
        results.push({ serverId, resources });
      } catch (error) {
        console.error(`Failed to list resources from server ${serverId}:`, error);
      }
    }
    return results;
  }

  // Get a resource from a specific server
  async getResource(serverId: string, uri: string): Promise<any> {
    const connection = this.servers.get(serverId);
    if (!connection) {
      throw new Error(`Server ${serverId} not found`);
    }
    return await connection.getResource(uri);
  }

  // List available prompts from all servers
  async listPrompts(): Promise<{ serverId: string; prompts: MCPPrompt[] }[]> {
    const results = [];
    for (const [serverId, connection] of this.servers) {
      try {
        const prompts = await connection.listPrompts();
        results.push({ serverId, prompts });
      } catch (error) {
        console.error(`Failed to list prompts from server ${serverId}:`, error);
      }
    }
    return results;
  }

  // Get a prompt from a specific server
  async getPrompt(serverId: string, promptName: string, arguments_?: any): Promise<any> {
    const connection = this.servers.get(serverId);
    if (!connection) {
      throw new Error(`Server ${serverId} not found`);
    }
    return await connection.getPrompt(promptName, arguments_);
  }

  // Initialize with default servers
  async initializeDefaultServers(): Promise<void> {
    // Add some common MCP servers
    const defaultServers: MCPServerConfig[] = [
      {
        id: 'filesystem',
        name: 'File System',
        type: 'stdio',
        command: 'npx',
        args: ['@modelcontextprotocol/server-filesystem', '/tmp'],
        env: {}
      },
      {
        id: 'git',
        name: 'Git Operations',
        type: 'stdio',
        command: 'npx',
        args: ['@modelcontextprotocol/server-git', '--repository', '.'],
        env: {}
      }
    ];

    // Try to connect to each default server
    for (const config of defaultServers) {
      try {
        await this.connectServer(config);
      } catch (error) {
        console.warn(`Failed to initialize default server ${config.name}:`, error);
        // Add as disconnected server for UI purposes
        const disconnectedConnection = new MCPServerConnection(config);
        disconnectedConnection.setStatus('error');
        this.servers.set(config.id, disconnectedConnection);
      }
    }
    this.notifyListeners();
  }
}

class MCPServerConnection {
  private config: MCPServerConfig;
  private status: 'connected' | 'disconnected' | 'error' = 'disconnected';
  private capabilities: string[] = [];
  private lastError?: string;
  private client: MCPClient | null = null;

  constructor(config: MCPServerConfig) {
    this.config = config;
    this.createClient();
  }

  private createClient(): void {
    if (this.config.type === 'stdio') {
      this.client = new MCPStdioClient(this.config);
    } else if (this.config.type === 'http') {
      this.client = new MCPHttpClient(this.config);
    } else {
      throw new Error(`Unsupported MCP server type: ${this.config.type}`);
    }
  }

  async connect(): Promise<void> {
    if (!this.client) {
      throw new Error('MCP client not initialized');
    }

    try {
      await this.client.connect();
      const initResult = await this.client.initialize();
      
      this.capabilities = Object.keys(initResult.capabilities);
      this.status = 'connected';
      this.lastError = undefined;
      
      console.log(`Connected to MCP server ${this.config.name}:`, initResult.serverInfo);
    } catch (error) {
      this.status = 'error';
      this.lastError = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
    }
    this.status = 'disconnected';
    this.capabilities = [];
    this.lastError = undefined;
  }

  setStatus(status: 'connected' | 'disconnected' | 'error') {
    this.status = status;
  }

  getServerInfo(): MCPServer {
    return {
      id: this.config.id,
      name: this.config.name,
      url: this.config.url,
      type: this.config.type,
      status: this.status,
      capabilities: this.capabilities
    };
  }


  async listTools(): Promise<MCPTool[]> {
    if (this.status !== 'connected' || !this.client) {
      throw new Error('Server not connected');
    }

    return await this.client.listTools();
  }

  async callTool(toolName: string, arguments_: any): Promise<any> {
    if (this.status !== 'connected' || !this.client) {
      throw new Error('Server not connected');
    }

    return await this.client.callTool(toolName, arguments_);
  }

  async listResources(): Promise<MCPResource[]> {
    if (this.status !== 'connected' || !this.client) {
      throw new Error('Server not connected');
    }

    return await this.client.listResources();
  }

  async getResource(uri: string): Promise<any> {
    if (this.status !== 'connected' || !this.client) {
      throw new Error('Server not connected');
    }

    return await this.client.readResource(uri);
  }

  async listPrompts(): Promise<MCPPrompt[]> {
    if (this.status !== 'connected' || !this.client) {
      throw new Error('Server not connected');
    }

    return await this.client.listPrompts();
  }

  async getPrompt(promptName: string, arguments_?: any): Promise<any> {
    if (this.status !== 'connected' || !this.client) {
      throw new Error('Server not connected');
    }

    return await this.client.getPrompt(promptName, arguments_);
  }
}

export const mcpService = new MCPService();