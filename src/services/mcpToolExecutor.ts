import { mcpService, MCPTool } from './mcpService';
import { useStore } from '../store/useStore';

export interface ToolExecutionRequest {
  serverId: string;
  toolName: string;
  arguments: Record<string, any>;
  messageId?: string;
  conversationId?: string;
}

export interface ToolExecutionResult {
  id: string;
  serverId: string;
  toolName: string;
  arguments: Record<string, any>;
  result: any;
  success: boolean;
  error?: string;
  startTime: Date;
  endTime: Date;
  duration: number;
}

export interface ToolExecutionContext {
  messageId?: string;
  conversationId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export class MCPToolExecutor {
  private executionHistory: ToolExecutionResult[] = [];
  private activeExecutions = new Map<string, AbortController>();

  async executeTools(
    requests: ToolExecutionRequest[],
    context?: ToolExecutionContext
  ): Promise<ToolExecutionResult[]> {
    const results: ToolExecutionResult[] = [];
    
    // Execute tools in parallel
    const promises = requests.map(request => this.executeTool(request, context));
    const executionResults = await Promise.allSettled(promises);
    
    executionResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        // Create error result for failed executions
        const request = requests[index];
        results.push({
          id: `error-${Date.now()}-${index}`,
          serverId: request.serverId,
          toolName: request.toolName,
          arguments: request.arguments,
          result: null,
          success: false,
          error: result.reason?.message || 'Unknown error',
          startTime: new Date(),
          endTime: new Date(),
          duration: 0
        });
      }
    });
    
    return results;
  }

  async executeTool(
    request: ToolExecutionRequest,
    context: ToolExecutionContext = {}
  ): Promise<ToolExecutionResult> {
    const executionId = `${request.serverId}-${request.toolName}-${Date.now()}`;
    const abortController = new AbortController();
    this.activeExecutions.set(executionId, abortController);
    
    const startTime = new Date();
    
    try {
      // Validate tool exists and is available
      await this.validateToolExecution(request);
      
      // Track execution in agent process
      this.trackToolExecution(request, context, 'started');
      
      // Execute the tool
      const result = await mcpService.callTool(
        request.serverId,
        request.toolName,
        request.arguments
      );
      
      const endTime = new Date();
      const executionResult: ToolExecutionResult = {
        id: executionId,
        serverId: request.serverId,
        toolName: request.toolName,
        arguments: request.arguments,
        result,
        success: true,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime()
      };
      
      // Store in history
      this.executionHistory.push(executionResult);
      this.trackToolExecution(request, context, 'completed', executionResult);
      
      return executionResult;
      
    } catch (error) {
      const endTime = new Date();
      const executionResult: ToolExecutionResult = {
        id: executionId,
        serverId: request.serverId,
        toolName: request.toolName,
        arguments: request.arguments,
        result: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime()
      };
      
      this.executionHistory.push(executionResult);
      this.trackToolExecution(request, context, 'error', executionResult);
      
      throw error;
    } finally {
      this.activeExecutions.delete(executionId);
    }
  }

  private async validateToolExecution(request: ToolExecutionRequest): Promise<void> {
    // Check if server exists and is connected
    const server = mcpService.getServer(request.serverId);
    if (!server) {
      throw new Error(`MCP server not found: ${request.serverId}`);
    }
    
    if (server.status !== 'connected') {
      throw new Error(`MCP server not connected: ${server.name}`);
    }
    
    // Check if tool exists
    const tools = await mcpService.listTools();
    const serverTools = tools.find(t => t.serverId === request.serverId);
    if (!serverTools) {
      throw new Error(`No tools available from server: ${request.serverId}`);
    }
    
    const tool = serverTools.tools.find(t => t.name === request.toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${request.toolName} on server ${request.serverId}`);
    }
    
    // Validate arguments against schema
    this.validateToolArguments(tool, request.arguments);
  }

  private validateToolArguments(tool: MCPTool, arguments_: Record<string, any>): void {
    if (!tool.inputSchema) return;
    
    const schema = tool.inputSchema;
    
    // Basic validation - in a real implementation, you'd use a proper JSON schema validator
    if (schema.required) {
      for (const requiredField of schema.required) {
        if (!(requiredField in arguments_)) {
          throw new Error(`Required argument missing: ${requiredField}`);
        }
      }
    }
    
    // Type validation for properties
    if (schema.properties) {
      for (const [key, value] of Object.entries(arguments_)) {
        const propSchema = schema.properties[key];
        if (propSchema && propSchema.type) {
          const actualType = typeof value;
          const expectedType = propSchema.type;
          
          if (expectedType === 'string' && actualType !== 'string') {
            throw new Error(`Argument ${key} must be a string`);
          }
          if (expectedType === 'number' && actualType !== 'number') {
            throw new Error(`Argument ${key} must be a number`);
          }
          if (expectedType === 'boolean' && actualType !== 'boolean') {
            throw new Error(`Argument ${key} must be a boolean`);
          }
        }
      }
    }
  }

  private trackToolExecution(
    request: ToolExecutionRequest,
    context?: ToolExecutionContext,
    status: 'started' | 'completed' | 'error',
    result?: ToolExecutionResult
  ): void {
    const processId = `tool-${request.serverId}-${request.toolName}-${Date.now()}`;
    
    const store = useStore.getState();
    
    switch (status) {
      case 'started':
        store.addAgentProcess({
          id: processId,
          step: `Executing tool: ${request.toolName}`,
          status: 'running',
          startTime: new Date(),
          details: `Server: ${request.serverId}, Arguments: ${JSON.stringify(request.arguments)}`,
          tools: [request.toolName],
          metadata: {
            serverId: request.serverId,
            toolName: request.toolName,
            arguments: request.arguments,
            context
          }
        });
        break;
        
      case 'completed':
        store.updateAgentProcess(processId, {
          status: 'completed',
          endTime: new Date(),
          details: `Successfully executed ${request.toolName} in ${result?.duration}ms`
        });
        break;
        
      case 'error':
        store.updateAgentProcess(processId, {
          status: 'error',
          endTime: new Date(),
          details: `Failed to execute ${request.toolName}: ${result?.error}`
        });
        break;
    }
  }

  abortExecution(executionId: string): void {
    const controller = this.activeExecutions.get(executionId);
    if (controller) {
      controller.abort();
      this.activeExecutions.delete(executionId);
    }
  }

  abortAllExecutions(): void {
    for (const [id, controller] of this.activeExecutions) {
      controller.abort();
    }
    this.activeExecutions.clear();
  }

  getExecutionHistory(limit?: number): ToolExecutionResult[] {
    const history = [...this.executionHistory].reverse(); // Most recent first
    return limit ? history.slice(0, limit) : history;
  }

  getExecutionById(id: string): ToolExecutionResult | undefined {
    return this.executionHistory.find(exec => exec.id === id);
  }

  getExecutionsByTool(toolName: string): ToolExecutionResult[] {
    return this.executionHistory.filter(exec => exec.toolName === toolName);
  }

  getExecutionsByServer(serverId: string): ToolExecutionResult[] {
    return this.executionHistory.filter(exec => exec.serverId === serverId);
  }

  getExecutionStats(): {
    total: number;
    successful: number;
    failed: number;
    averageDuration: number;
    mostUsedTools: Array<{ tool: string; count: number }>;
  } {
    const total = this.executionHistory.length;
    const successful = this.executionHistory.filter(exec => exec.success).length;
    const failed = total - successful;
    
    const totalDuration = this.executionHistory.reduce((sum, exec) => sum + exec.duration, 0);
    const averageDuration = total > 0 ? totalDuration / total : 0;
    
    // Count tool usage
    const toolCounts = new Map<string, number>();
    this.executionHistory.forEach(exec => {
      const key = `${exec.serverId}:${exec.toolName}`;
      toolCounts.set(key, (toolCounts.get(key) || 0) + 1);
    });
    
    const mostUsedTools = Array.from(toolCounts.entries())
      .map(([tool, count]) => ({ tool, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return {
      total,
      successful,
      failed,
      averageDuration,
      mostUsedTools
    };
  }

  clearHistory(): void {
    this.executionHistory = [];
  }

  exportHistory(): string {
    return JSON.stringify({
      version: '1.0',
      timestamp: new Date().toISOString(),
      executions: this.executionHistory
    }, null, 2);
  }
}

// Global instance
export const mcpToolExecutor = new MCPToolExecutor();