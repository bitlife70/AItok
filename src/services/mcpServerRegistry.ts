import { MCPServerConfig } from './mcpService';
import { Storage } from '../utils/storage';

export interface MCPServerTemplate {
  id: string;
  name: string;
  description: string;
  type: 'stdio' | 'http';
  category: 'filesystem' | 'git' | 'database' | 'api' | 'custom';
  defaultConfig: Partial<MCPServerConfig>;
  installInstructions?: string;
  documentation?: string;
}

export class MCPServerRegistry {
  private static readonly STORAGE_KEY = 'mcp_servers';
  private static readonly TEMPLATES_KEY = 'mcp_server_templates';

  // Built-in server templates
  private static defaultTemplates: MCPServerTemplate[] = [
    {
      id: 'filesystem',
      name: 'File System',
      description: 'Access and manipulate files and directories',
      type: 'stdio',
      category: 'filesystem',
      defaultConfig: {
        command: 'npx',
        args: ['@modelcontextprotocol/server-filesystem', '/tmp'],
        env: {}
      },
      installInstructions: 'npm install -g @modelcontextprotocol/server-filesystem',
      documentation: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem'
    },
    {
      id: 'git',
      name: 'Git Operations',
      description: 'Git repository operations and history',
      type: 'stdio',
      category: 'git',
      defaultConfig: {
        command: 'npx',
        args: ['@modelcontextprotocol/server-git', '--repository', '.'],
        env: {}
      },
      installInstructions: 'npm install -g @modelcontextprotocol/server-git',
      documentation: 'https://github.com/modelcontextprotocol/servers/tree/main/src/git'
    },
    {
      id: 'sqlite',
      name: 'SQLite Database',
      description: 'Query and manipulate SQLite databases',
      type: 'stdio',
      category: 'database',
      defaultConfig: {
        command: 'npx',
        args: ['@modelcontextprotocol/server-sqlite', '--db-path', 'database.db'],
        env: {}
      },
      installInstructions: 'npm install -g @modelcontextprotocol/server-sqlite',
      documentation: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite'
    },
    {
      id: 'brave-search',
      name: 'Brave Search',
      description: 'Web search capabilities using Brave Search API',
      type: 'stdio',
      category: 'api',
      defaultConfig: {
        command: 'npx',
        args: ['@modelcontextprotocol/server-brave-search'],
        env: {
          BRAVE_API_KEY: ''
        }
      },
      installInstructions: 'npm install -g @modelcontextprotocol/server-brave-search',
      documentation: 'https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search'
    },
    {
      id: 'postgres',
      name: 'PostgreSQL Database',
      description: 'Query and manipulate PostgreSQL databases',
      type: 'stdio',
      category: 'database',
      defaultConfig: {
        command: 'npx',
        args: ['@modelcontextprotocol/server-postgres'],
        env: {
          POSTGRES_CONNECTION_STRING: 'postgresql://user:password@localhost:5432/database'
        }
      },
      installInstructions: 'npm install -g @modelcontextprotocol/server-postgres',
      documentation: 'https://github.com/modelcontextprotocol/servers/tree/main/src/postgres'
    },
    {
      id: 'http-example',
      name: 'HTTP Server Example',
      description: 'Example HTTP-based MCP server',
      type: 'http',
      category: 'custom',
      defaultConfig: {
        url: 'http://localhost:3001'
      },
      documentation: 'https://modelcontextprotocol.io/docs/concepts/transports#http-with-server-sent-events-sse'
    }
  ];

  static getTemplates(): MCPServerTemplate[] {
    const savedTemplates = Storage.getItem(this.TEMPLATES_KEY);
    const customTemplates = savedTemplates ? JSON.parse(savedTemplates) : [];
    return [...this.defaultTemplates, ...customTemplates];
  }

  static getTemplate(id: string): MCPServerTemplate | undefined {
    return this.getTemplates().find(template => template.id === id);
  }

  static addCustomTemplate(template: MCPServerTemplate): void {
    const customTemplates = this.getCustomTemplates();
    const existingIndex = customTemplates.findIndex(t => t.id === template.id);
    
    if (existingIndex >= 0) {
      customTemplates[existingIndex] = template;
    } else {
      customTemplates.push(template);
    }
    
    Storage.setItem(this.TEMPLATES_KEY, JSON.stringify(customTemplates));
  }

  static removeCustomTemplate(id: string): void {
    const customTemplates = this.getCustomTemplates();
    const filtered = customTemplates.filter(t => t.id !== id);
    Storage.setItem(this.TEMPLATES_KEY, JSON.stringify(filtered));
  }

  static getCustomTemplates(): MCPServerTemplate[] {
    const savedTemplates = Storage.getItem(this.TEMPLATES_KEY);
    return savedTemplates ? JSON.parse(savedTemplates) : [];
  }

  static createServerFromTemplate(templateId: string, customConfig: Partial<MCPServerConfig>): MCPServerConfig {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const serverId = customConfig.id || `${templateId}-${Date.now()}`;
    
    return {
      id: serverId,
      name: customConfig.name || template.name,
      type: template.type,
      ...template.defaultConfig,
      ...customConfig
    };
  }

  static getSavedServers(): MCPServerConfig[] {
    const saved = Storage.getItem(this.STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  }

  static saveServer(config: MCPServerConfig): void {
    const servers = this.getSavedServers();
    const existingIndex = servers.findIndex(s => s.id === config.id);
    
    if (existingIndex >= 0) {
      servers[existingIndex] = config;
    } else {
      servers.push(config);
    }
    
    Storage.setItem(this.STORAGE_KEY, JSON.stringify(servers));
  }

  static removeServer(id: string): void {
    const servers = this.getSavedServers();
    const filtered = servers.filter(s => s.id !== id);
    Storage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
  }

  static exportServers(): string {
    const servers = this.getSavedServers();
    const customTemplates = this.getCustomTemplates();
    
    const exportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      servers,
      customTemplates
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  static importServers(jsonData: string): { servers: number; templates: number } {
    const data = JSON.parse(jsonData);
    
    if (!data.version || !data.servers) {
      throw new Error('Invalid export data format');
    }
    
    // Import servers
    const existingServers = this.getSavedServers();
    const importedServers = data.servers.filter((server: MCPServerConfig) => 
      !existingServers.some(existing => existing.id === server.id)
    );
    
    const allServers = [...existingServers, ...importedServers];
    Storage.setItem(this.STORAGE_KEY, JSON.stringify(allServers));
    
    // Import custom templates
    let importedTemplates = 0;
    if (data.customTemplates) {
      const existingTemplates = this.getCustomTemplates();
      const newTemplates = data.customTemplates.filter((template: MCPServerTemplate) =>
        !existingTemplates.some(existing => existing.id === template.id)
      );
      
      const allTemplates = [...existingTemplates, ...newTemplates];
      Storage.setItem(this.TEMPLATES_KEY, JSON.stringify(allTemplates));
      importedTemplates = newTemplates.length;
    }
    
    return {
      servers: importedServers.length,
      templates: importedTemplates
    };
  }

  static validateServerConfig(config: MCPServerConfig): string[] {
    const errors: string[] = [];
    
    if (!config.id?.trim()) {
      errors.push('Server ID is required');
    }
    
    if (!config.name?.trim()) {
      errors.push('Server name is required');
    }
    
    if (!['stdio', 'http'].includes(config.type)) {
      errors.push('Server type must be either "stdio" or "http"');
    }
    
    if (config.type === 'stdio') {
      if (!config.command?.trim()) {
        errors.push('Command is required for stdio servers');
      }
    } else if (config.type === 'http') {
      if (!config.url?.trim()) {
        errors.push('URL is required for HTTP servers');
      } else {
        try {
          new URL(config.url);
        } catch {
          errors.push('Invalid URL format');
        }
      }
    }
    
    return errors;
  }

  static getServersByCategory(category: MCPServerTemplate['category']): MCPServerTemplate[] {
    return this.getTemplates().filter(template => template.category === category);
  }

  static searchTemplates(query: string): MCPServerTemplate[] {
    const lowercaseQuery = query.toLowerCase();
    return this.getTemplates().filter(template =>
      template.name.toLowerCase().includes(lowercaseQuery) ||
      template.description.toLowerCase().includes(lowercaseQuery) ||
      template.category.toLowerCase().includes(lowercaseQuery)
    );
  }
}