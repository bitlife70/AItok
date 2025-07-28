import { useCallback } from 'react';
import { useStore } from '../store/useStore';
import { llmService } from '../services/llmService';
import { UploadedFile } from '../types';
import { useAgentProcess } from './useAgentProcess';
import { useMessageHandler } from './useMessageHandler';
import { useStreamingResponse } from './useStreamingResponse';
import { AgentProcessService } from '../services/agentProcessService';

export function useChat() {
  const { setLoading, selectedModel } = useStore();
  const agentProcess = useAgentProcess();
  const messageHandler = useMessageHandler();
  const { streamingMessage, isStreaming, streamResponse } = useStreamingResponse();

  const sendMessage = useCallback(async (content: string, files?: UploadedFile[]) => {
    if (!selectedModel) {
      console.error('No model selected');
      return;
    }

    // Create and add user message
    const userMessage = messageHandler.createUserMessage(content, files);
    messageHandler.addMessage(userMessage);

    // Start agent process tracking
    const processId = AgentProcessService.generateProcessId();
    agentProcess.startInputAnalysis(processId, content, files);

    setLoading(true);

    try {
      // Debug: Check API configuration
      console.log('=== API Debug Info ===');
      console.log('Selected model:', selectedModel);
      console.log('Model provider:', selectedModel.provider);
      console.log('Provider status:', llmService.getProviderStatus(selectedModel.provider));
      console.log('Provider available:', llmService.isProviderAvailable(selectedModel.provider) ? 'YES' : 'NO');
      
      // Complete input analysis and start context preparation
      agentProcess.completeInputAnalysis(processId);
      const contextProcessId = agentProcess.startContextPreparation(processId, selectedModel.name);

      // Create LLM request
      const request = messageHandler.createLLMRequest(userMessage);
      
      // Complete context preparation and start streaming
      agentProcess.completeProcess(contextProcessId);
      const streamProcessId = agentProcess.startStreaming(contextProcessId);

      // Stream the response
      const { content: assistantContent, id: responseId } = await streamResponse(request);

      // Create and add assistant message
      const assistantMessage = messageHandler.createAssistantMessage(assistantContent, responseId);
      messageHandler.addMessage(assistantMessage);

      // Complete streaming and do final processing
      agentProcess.completeProcess(streamProcessId);
      const finalProcessId = agentProcess.startFinalProcessing(streamProcessId, assistantContent.length);

      // Complete final processing
      setTimeout(() => {
        agentProcess.completeProcess(finalProcessId);
        agentProcess.finishAllProcesses();
      }, 500);

    } catch (error) {
      console.error('Error sending message:', error);
      
      agentProcess.errorProcess(processId, error instanceof Error ? error : 'Unknown error');
      
      const errorMessage = messageHandler.createErrorMessage(error instanceof Error ? error.message : 'Failed to get response');
      messageHandler.addMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [selectedModel, agentProcess, messageHandler, streamResponse, setLoading]);

  return {
    sendMessage,
    streamingMessage,
    isStreaming
  };
}