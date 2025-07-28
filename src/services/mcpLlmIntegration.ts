import { mcpService } from './mcpService';
import { mcpToolExecutor, ToolExecutionRequest } from './mcpToolExecutor';
import { LLMRequest } from '../types/api';

export interface MCPFunctionCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  serverId: string;
}

export interface MCPFunctionResult {
  id: string;
  result: any;
  success: boolean;
  error?: string;
}

export class MCPLLMIntegration {
  
  async enrichLLMRequest(request: LLMRequest): Promise<LLMRequest> {
    // Get available tools from all connected MCP servers
    const availableTools = await this.getAvailableToolsForLLM();
    
    if (availableTools.length === 0) {
      return request; // No tools available, return original request
    }
    
    // Add tools to the LLM request
    const enrichedRequest: LLMRequest = {
      ...request,
      tools: availableTools,
      tool_choice: 'auto' // Let the LLM decide when to use tools
    };
    
    return enrichedRequest;
  }

  private async getAvailableToolsForLLM(): Promise<any[]> {
    try {
      const toolsFromServers = await mcpService.listTools();
      const llmTools = [];
      
      for (const serverTools of toolsFromServers) {
        for (const tool of serverTools.tools) {
          llmTools.push({
            type: 'function',
            function: {
              name: `${serverTools.serverId}__${tool.name}`,
              description: `[MCP:${serverTools.serverId}] ${tool.description}`,
              parameters: tool.inputSchema || {
                type: 'object',
                properties: {},
                required: []
              }
            }
          });
        }
      }
      
      return llmTools;
    } catch (error) {
      console.error('Failed to get MCP tools for LLM:', error);
      return [];
    }
  }

  parseFunctionCalls(llmResponse: any): MCPFunctionCall[] {
    const functionCalls: MCPFunctionCall[] = [];
    
    // Handle different LLM response formats
    if (llmResponse.tool_calls) {
      // OpenAI format
      for (const toolCall of llmResponse.tool_calls) {
        if (toolCall.type === 'function') {
          const funcName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments || '{}');
          
          const parsed = this.parseMCPFunctionName(funcName);
          if (parsed) {
            functionCalls.push({
              id: toolCall.id,
              name: parsed.toolName,
              arguments: args,
              serverId: parsed.serverId
            });
          }
        }
      }
    } else if (llmResponse.function_call) {
      // Legacy OpenAI format
      const funcName = llmResponse.function_call.name;
      const args = JSON.parse(llmResponse.function_call.arguments || '{}');
      
      const parsed = this.parseMCPFunctionName(funcName);
      if (parsed) {
        functionCalls.push({
          id: `func-${Date.now()}`,
          name: parsed.toolName,
          arguments: args,
          serverId: parsed.serverId
        });
      }
    }
    
    return functionCalls;
  }

  private parseMCPFunctionName(functionName: string): { serverId: string; toolName: string } | null {
    // Function names are in format: serverId__toolName
    const parts = functionName.split('__');
    if (parts.length >= 2) {
      return {
        serverId: parts[0],
        toolName: parts.slice(1).join('__') // In case tool name contains __
      };
    }
    return null;
  }

  async executeFunctionCalls(
    functionCalls: MCPFunctionCall[],
    context?: {
      messageId?: string;
      conversationId?: string;
    }
  ): Promise<MCPFunctionResult[]> {
    if (functionCalls.length === 0) {
      return [];
    }
    
    // Convert to tool execution requests
    const requests: ToolExecutionRequest[] = functionCalls.map(call => ({
      serverId: call.serverId,
      toolName: call.name,
      arguments: call.arguments,
      messageId: context?.messageId,
      conversationId: context?.conversationId
    }));
    
    // Execute tools
    const results = await mcpToolExecutor.executeTools(requests, context);
    
    // Convert back to function results
    return results.map((result, index) => ({
      id: functionCalls[index].id,
      result: result.result,
      success: result.success,
      error: result.error
    }));
  }

  formatFunctionResultsForLLM(
    functionResults: MCPFunctionResult[],
    format: 'openai' | 'anthropic' | 'generic' = 'generic'
  ): any[] {
    switch (format) {
      case 'openai':
        return functionResults.map(result => ({
          tool_call_id: result.id,
          role: 'tool',
          content: result.success 
            ? JSON.stringify(result.result)
            : `Error: ${result.error}`
        }));
        
      case 'anthropic':
        return functionResults.map(result => ({
          type: 'tool_result',
          tool_use_id: result.id,
          content: result.success 
            ? [{ type: 'text', text: JSON.stringify(result.result) }]
            : [{ type: 'text', text: `Error: ${result.error}` }],
          is_error: !result.success
        }));
        
      default:
        return functionResults.map(result => ({
          id: result.id,
          content: result.success 
            ? JSON.stringify(result.result)
            : `Error: ${result.error}`,
          success: result.success
        }));
    }
  }

  async processLLMWithTools(
    request: LLMRequest,
    context?: {
      messageId?: string;
      conversationId?: string;
    }
  ): Promise<{
    response: any;
    toolResults?: MCPFunctionResult[];
    enrichedRequest: LLMRequest;
  }> {
    // Enrich request with available MCP tools
    const enrichedRequest = await this.enrichLLMRequest(request);
    
    // Here you would normally call the LLM service
    // For now, we'll return a mock response that might include tool calls
    const mockResponse = this.createMockLLMResponse(enrichedRequest);
    
    // Parse any function calls from the response
    const functionCalls = this.parseFunctionCalls(mockResponse);
    
    let toolResults: MCPFunctionResult[] = [];
    if (functionCalls.length > 0) {
      // Execute the function calls
      toolResults = await this.executeFunctionCalls(functionCalls, context);
      
      // Add tool results back to the conversation context
      mockResponse.tool_results = this.formatFunctionResultsForLLM(toolResults);
    }
    
    return {
      response: mockResponse,
      toolResults: toolResults.length > 0 ? toolResults : undefined,
      enrichedRequest
    };
  }

  private createMockLLMResponse(request: LLMRequest): any {
    // This is a mock - in real implementation, this would be the actual LLM response
    const hasTools = request.tools && request.tools.length > 0;
    
    if (hasTools && Math.random() > 0.5) {
      // Simulate the LLM deciding to use a tool
      const tool = request.tools![0];
      return {
        id: `mock-${Date.now()}`,
        role: 'assistant',
        content: 'I need to use a tool to help with this request.',
        tool_calls: [{
          id: `call-${Date.now()}`,
          type: 'function',
          function: {
            name: tool.function.name,
            arguments: JSON.stringify({
              path: '/example/path',
              content: 'example content'
            })
          }
        }]
      };
    } else {
      // Normal response without tools
      return {
        id: `mock-${Date.now()}`,
        role: 'assistant',
        content: 'This is a mock response without tool usage.'
      };
    }
  }

  async getToolUsageStats(): Promise<{
    totalCalls: number;
    successRate: number;
    popularTools: Array<{
      serverId: string;
      toolName: string;
      usage: number;
    }>;
  }> {
    const stats = mcpToolExecutor.getExecutionStats();
    
    const popularTools = stats.mostUsedTools.map(item => {
      const [serverId, toolName] = item.tool.split(':');
      return {
        serverId,
        toolName,
        usage: item.count
      };
    });
    
    return {
      totalCalls: stats.total,
      successRate: stats.total > 0 ? stats.successful / stats.total : 0,
      popularTools
    };
  }

  async getAvailableToolsDescription(): Promise<string> {
    const toolsFromServers = await mcpService.listTools();
    
    if (toolsFromServers.length === 0) {
      return 'No MCP tools are currently available.';
    }
    
    let description = 'Available MCP tools:\n\n';
    
    for (const serverTools of toolsFromServers) {
      const server = mcpService.getServer(serverTools.serverId);
      description += `**${server?.name || serverTools.serverId}**:\n`;
      
      for (const tool of serverTools.tools) {
        description += `- \`${tool.name}\`: ${tool.description}\n`;
      }
      description += '\n';
    }
    
    return description;
  }
}

// Global instance
export const mcpLlmIntegration = new MCPLLMIntegration();