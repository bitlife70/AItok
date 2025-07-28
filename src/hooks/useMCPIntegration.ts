import { useCallback, useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { mcpService, MCPTool } from '../services/mcpService';
import { mcpLlmIntegration, MCPFunctionCall, MCPFunctionResult } from '../services/mcpLlmIntegration';
import { MCPServerRegistry } from '../services/mcpServerRegistry';

export function useMCPIntegration() {
  const { selectedModel, addAgentProcess, updateAgentProcess } = useStore();
  const [availableTools, setAvailableTools] = useState<Array<{ serverId: string; tools: MCPTool[] }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load available tools when component mounts or servers change
  useEffect(() => {
    loadAvailableTools();
    
    // Listen for server changes
    const handleServerUpdate = () => {
      loadAvailableTools();
    };
    
    mcpService.addListener(handleServerUpdate);
    
    return () => {
      mcpService.removeListener(handleServerUpdate);
    };
  }, []);

  const loadAvailableTools = useCallback(async () => {
    try {
      const tools = await mcpService.listTools();
      setAvailableTools(tools);
    } catch (error) {
      console.error('Failed to load MCP tools:', error);
      setAvailableTools([]);
    }
  }, []);

  const enrichLLMRequest = useCallback(async (originalRequest: any) => {
    if (!selectedModel) return originalRequest;
    
    try {
      return await mcpLlmIntegration.enrichLLMRequest(originalRequest);
    } catch (error) {
      console.error('Failed to enrich LLM request with MCP tools:', error);
      return originalRequest;
    }
  }, [selectedModel]);

  const processFunctionCalls = useCallback(async (
    llmResponse: any,
    context?: { messageId?: string; conversationId?: string }
  ): Promise<{
    functionCalls: MCPFunctionCall[];
    results: MCPFunctionResult[];
    hasToolCalls: boolean;
  }> => {
    const functionCalls = mcpLlmIntegration.parseFunctionCalls(llmResponse);
    
    if (functionCalls.length === 0) {
      return {
        functionCalls: [],
        results: [],
        hasToolCalls: false
      };
    }

    setIsLoading(true);
    
    // Track function calls in agent process
    const processId = `mcp-tools-${Date.now()}`;
    addAgentProcess({
      id: processId,
      step: 'Executing MCP tools',
      status: 'running',
      startTime: new Date(),
      details: `Executing ${functionCalls.length} tool(s): ${functionCalls.map(fc => fc.name).join(', ')}`,
      tools: functionCalls.map(fc => fc.name),
      metadata: {
        functionCalls,
        context
      }
    });

    try {
      const results = await mcpLlmIntegration.executeFunctionCalls(functionCalls, context);
      
      // Update agent process with results
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;
      
      updateAgentProcess(processId, {
        status: failureCount === 0 ? 'completed' : 'error',
        endTime: new Date(),
        details: `Completed ${successCount}/${results.length} tool executions successfully`
      });

      return {
        functionCalls,
        results,
        hasToolCalls: true
      };
    } catch (error) {
      updateAgentProcess(processId, {
        status: 'error',
        endTime: new Date(),
        details: `Failed to execute tools: ${error instanceof Error ? error.message : 'Unknown error'}`
      });

      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [addAgentProcess, updateAgentProcess]);

  const getToolsDescription = useCallback(async (): Promise<string> => {
    return await mcpLlmIntegration.getAvailableToolsDescription();
  }, []);

  const getConnectedServers = useCallback(() => {
    return mcpService.getServers().filter(server => server.status === 'connected');
  }, []);

  const getServerTemplates = useCallback(() => {
    return MCPServerRegistry.getTemplates();
  }, []);

  const connectServer = useCallback(async (config: any) => {
    try {
      await mcpService.connectServer(config);
      MCPServerRegistry.saveServer(config);
      await loadAvailableTools();
      return true;
    } catch (error) {
      console.error('Failed to connect MCP server:', error);
      return false;
    }
  }, [loadAvailableTools]);

  const disconnectServer = useCallback(async (serverId: string) => {
    try {
      await mcpService.disconnectServer(serverId);
      await loadAvailableTools();
      return true;
    } catch (error) {
      console.error('Failed to disconnect MCP server:', error);
      return false;
    }
  }, [loadAvailableTools]);

  const getToolUsageStats = useCallback(async () => {
    return await mcpLlmIntegration.getToolUsageStats();
  }, []);

  const formatToolResultsForLLM = useCallback((
    results: MCPFunctionResult[],
    providerFormat: 'openai' | 'anthropic' | 'generic' = 'generic'
  ) => {
    return mcpLlmIntegration.formatFunctionResultsForLLM(results, providerFormat);
  }, []);

  return {
    // State
    availableTools,
    isLoading,
    
    // Tools info
    toolCount: availableTools.reduce((sum, server) => sum + server.tools.length, 0),
    connectedServers: getConnectedServers(),
    
    // Core functions
    enrichLLMRequest,
    processFunctionCalls,
    formatToolResultsForLLM,
    
    // Utility functions
    getToolsDescription,
    getToolUsageStats,
    loadAvailableTools,
    
    // Server management
    getServerTemplates,
    connectServer,
    disconnectServer,
    
    // Check if MCP is available
    isMCPAvailable: availableTools.length > 0
  };
}