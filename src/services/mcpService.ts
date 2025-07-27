import { MCPServer } from '../types';

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

  constructor(config: MCPServerConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      if (this.config.type === 'stdio') {
        await this.connectStdio();
      } else if (this.config.type === 'http') {
        await this.connectHttp();
      }
      this.status = 'connected';
      this.lastError = undefined;
    } catch (error) {
      this.status = 'error';
      this.lastError = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  async disconnect(): Promise<void> {
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

  private async connectStdio(): Promise<void> {
    // For now, simulate stdio connection
    // In a real implementation, this would spawn a child process
    // and communicate via JSON-RPC over stdin/stdout
    console.log(`Connecting to stdio MCP server: ${this.config.command} ${this.config.args?.join(' ')}`);
    
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock capabilities for demonstration
    this.capabilities = ['tools', 'resources', 'prompts'];
  }

  private async connectHttp(): Promise<void> {
    if (!this.config.url) {
      throw new Error('HTTP server requires URL');
    }

    console.log(`Connecting to HTTP MCP server: ${this.config.url}`);
    
    // In a real implementation, this would make HTTP requests to establish connection
    // and discover capabilities
    try {
      const response = await fetch(`${this.config.url}/capabilities`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const capabilities = await response.json();
      this.capabilities = capabilities.capabilities || [];
    } catch (error) {
      // Fall back to mock capabilities for demonstration
      this.capabilities = ['tools', 'resources'];
    }
  }

  async listTools(): Promise<MCPTool[]> {
    if (this.status !== 'connected') {
      throw new Error('Server not connected');
    }

    // Mock tools for demonstration
    return [
      {
        name: 'read_file',
        description: 'Read a file from the filesystem',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to the file' }
          },
          required: ['path']
        }
      },
      {
        name: 'write_file',
        description: 'Write content to a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to the file' },
            content: { type: 'string', description: 'Content to write' }
          },
          required: ['path', 'content']
        }
      }
    ];
  }

  async callTool(toolName: string, arguments_: any): Promise<any> {
    if (this.status !== 'connected') {
      throw new Error('Server not connected');
    }

    console.log(`Calling tool ${toolName} with arguments:`, arguments_);
    
    // Mock tool execution for demonstration
    return {
      result: `Mock result for ${toolName}`,
      success: true
    };
  }

  async listResources(): Promise<MCPResource[]> {
    if (this.status !== 'connected') {
      throw new Error('Server not connected');
    }

    // Mock resources for demonstration
    return [
      {
        uri: 'file:///tmp/example.txt',
        name: 'example.txt',
        description: 'Example text file',
        mimeType: 'text/plain'
      }
    ];
  }

  async getResource(uri: string): Promise<any> {
    if (this.status !== 'connected') {
      throw new Error('Server not connected');
    }

    console.log(`Getting resource: ${uri}`);
    
    // Mock resource content for demonstration
    return {
      uri,
      content: 'Mock resource content',
      mimeType: 'text/plain'
    };
  }

  async listPrompts(): Promise<MCPPrompt[]> {
    if (this.status !== 'connected') {
      throw new Error('Server not connected');
    }

    // Mock prompts for demonstration
    return [
      {
        name: 'code_review',
        description: 'Review code for best practices',
        arguments: [
          { name: 'language', description: 'Programming language' },
          { name: 'code', description: 'Code to review' }
        ]
      }
    ];
  }

  async getPrompt(promptName: string, arguments_?: any): Promise<any> {
    if (this.status !== 'connected') {
      throw new Error('Server not connected');
    }

    console.log(`Getting prompt ${promptName} with arguments:`, arguments_);
    
    // Mock prompt content for demonstration
    return {
      name: promptName,
      messages: [
        {
          role: 'user',
          content: `Please review this ${arguments_?.language || 'code'}: ${arguments_?.code || 'example code'}`
        }
      ]
    };
  }
}

export const mcpService = new MCPService();