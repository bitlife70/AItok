import { MCPClient } from './mcpClient';
import { MCPServerConfig } from './mcpService';
import { JsonRpcMessage } from './jsonRpcClient';

export class MCPStdioClient extends MCPClient {
  private process: any = null;

  constructor(config: MCPServerConfig) {
    super(config);
    if (config.type !== 'stdio') {
      throw new Error('MCPStdioClient can only be used with stdio servers');
    }
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Note: In a browser environment, we can't spawn processes directly
        // This would need to be handled by a backend service or through WebAssembly
        // For now, we'll simulate the connection
        console.log(`Simulating stdio connection to: ${this.config.command} ${this.config.args?.join(' ')}`);
        
        // Simulate successful connection
        setTimeout(() => {
          this.process = { 
            connected: true,
            stdin: { write: this.simulateWrite.bind(this) },
            stdout: { on: this.simulateStdout.bind(this) },
            stderr: { on: this.simulateStderr.bind(this) }
          };
          resolve();
        }, 1000);

      } catch (error) {
        reject(error);
      }
    });
  }

  protected async sendMessage(message: JsonRpcMessage): Promise<void> {
    if (!this.process?.connected) {
      throw new Error('Not connected to MCP server');
    }

    const messageStr = JSON.stringify(message) + '\n';
    console.log('Sending MCP message:', messageStr);
    
    // In a real implementation, this would write to the process stdin
    this.process.stdin.write(messageStr);
  }

  private simulateWrite(data: string): void {
    console.log('Simulated stdin write:', data);
    
    // Simulate responses for common MCP methods
    try {
      const message = JSON.parse(data.trim());
      setTimeout(() => {
        this.simulateResponse(message);
      }, 100);
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  private simulateResponse(request: any): void {
    if (!request.id) return; // Skip notifications

    let result: any;

    switch (request.method) {
      case 'initialize':
        result = {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: { listChanged: true },
            resources: { subscribe: true, listChanged: true },
            prompts: { listChanged: true },
            logging: {}
          },
          serverInfo: {
            name: this.config.name,
            version: '1.0.0'
          }
        };
        break;

      case 'tools/list':
        result = {
          tools: [
            {
              name: 'read_file',
              description: 'Read contents of a file',
              inputSchema: {
                type: 'object',
                properties: {
                  path: { type: 'string', description: 'File path to read' }
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
                  path: { type: 'string', description: 'File path to write' },
                  content: { type: 'string', description: 'Content to write' }
                },
                required: ['path', 'content']
              }
            },
            {
              name: 'list_directory',
              description: 'List contents of a directory',
              inputSchema: {
                type: 'object',
                properties: {
                  path: { type: 'string', description: 'Directory path to list' }
                },
                required: ['path']
              }
            }
          ]
        };
        break;

      case 'tools/call':
        const toolName = request.params?.name;
        const args = request.params?.arguments || {};
        
        switch (toolName) {
          case 'read_file':
            result = {
              content: [{
                type: 'text',
                text: `Mock file content for: ${args.path}`
              }],
              isError: false
            };
            break;
          case 'write_file':
            result = {
              content: [{
                type: 'text',
                text: `Successfully wrote to: ${args.path}`
              }],
              isError: false
            };
            break;
          case 'list_directory':
            result = {
              content: [{
                type: 'text',
                text: `Directory contents for ${args.path}:\n- file1.txt\n- file2.js\n- subdirectory/`
              }],
              isError: false
            };
            break;
          default:
            result = {
              content: [{
                type: 'text',
                text: `Unknown tool: ${toolName}`
              }],
              isError: true
            };
        }
        break;

      case 'resources/list':
        result = {
          resources: [
            {
              uri: 'file:///example/file1.txt',
              name: 'file1.txt',
              description: 'Example text file',
              mimeType: 'text/plain'
            },
            {
              uri: 'file:///example/config.json',
              name: 'config.json',
              description: 'Configuration file',
              mimeType: 'application/json'
            }
          ]
        };
        break;

      case 'resources/read':
        result = {
          contents: [{
            uri: request.params?.uri,
            mimeType: 'text/plain',
            text: `Mock content for resource: ${request.params?.uri}`
          }]
        };
        break;

      case 'prompts/list':
        result = {
          prompts: [
            {
              name: 'analyze_code',
              description: 'Analyze code for issues and improvements',
              arguments: [
                { name: 'language', description: 'Programming language' },
                { name: 'code', description: 'Code to analyze' }
              ]
            },
            {
              name: 'generate_tests',
              description: 'Generate unit tests for code',
              arguments: [
                { name: 'language', description: 'Programming language' },
                { name: 'code', description: 'Code to test' }
              ]
            }
          ]
        };
        break;

      case 'prompts/get':
        const promptName = request.params?.name;
        const promptArgs = request.params?.arguments || {};
        
        result = {
          description: `Generated prompt: ${promptName}`,
          messages: [{
            role: 'user',
            content: {
              type: 'text',
              text: `Please ${promptName.replace('_', ' ')} the following ${promptArgs.language || 'code'}:\n\n${promptArgs.code || 'No code provided'}`
            }
          }]
        };
        break;

      default:
        console.log('Unknown method:', request.method);
        return;
    }

    const response = {
      jsonrpc: '2.0' as const,
      id: request.id,
      result
    };

    console.log('Simulated response:', response);
    this.handleMessage(response);
  }

  private simulateStdout(event: string, _callback: (data: Buffer) => void): void {
    if (event === 'data') {
      // This would normally be called when data arrives from stdout
      console.log('Stdout listener registered');
    }
  }

  private simulateStderr(event: string, _callback: (data: Buffer) => void): void {
    if (event === 'data') {
      // This would normally be called when data arrives from stderr
      console.log('Stderr listener registered');
    }
  }

  async disconnect(): Promise<void> {
    if (this.process) {
      // In a real implementation, this would kill the process
      this.process.connected = false;
      this.process = null;
    }
    super.disconnect();
  }

  isConnected(): boolean {
    return this.process?.connected || false;
  }
}