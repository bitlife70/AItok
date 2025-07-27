import { useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { llmService } from '../services/llmService';
import { Message } from '../types';
import { LLMRequest } from '../types/api';

export function useChat() {
  const { 
    messages, 
    addMessage, 
    setLoading, 
    selectedModel,
    addAgentProcess,
    updateAgentProcess,
    setCurrentAgentStep
  } = useStore();
  
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = useCallback(async (content: string) => {
    if (!selectedModel) {
      console.error('No model selected');
      return;
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date(),
      model: selectedModel.id
    };
    addMessage(userMessage);

    // Start agent process tracking
    const processId = `process-${Date.now()}`;
    addAgentProcess({
      id: processId,
      step: 'Processing user input',
      status: 'running',
      startTime: new Date(),
      details: `Analyzing message: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
      tools: []
    });
    setCurrentAgentStep('Processing user input');

    setLoading(true);
    setIsStreaming(true);
    setStreamingMessage('');

    try {
      // Update agent process
      updateAgentProcess(processId, {
        step: 'Sending to LLM',
        details: `Using model: ${selectedModel.name}`
      });
      setCurrentAgentStep('Sending to LLM');

      // Prepare LLM request
      const llmMessages = messages.concat([userMessage]).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const request: LLMRequest = {
        messages: llmMessages,
        model: selectedModel.id,
        temperature: 0.7,
        maxTokens: 1000,
        stream: true
      };

      let assistantContent = '';
      let responseId = '';

      // Stream the response
      updateAgentProcess(processId, {
        step: 'Receiving response',
        details: 'Streaming response from LLM'
      });
      setCurrentAgentStep('Receiving response');

      for await (const chunk of llmService.streamMessage(request)) {
        responseId = chunk.id;
        assistantContent = chunk.content;
        setStreamingMessage(chunk.content);

        if (chunk.finished) {
          break;
        }
      }

      // Add assistant message
      const assistantMessage: Message = {
        id: responseId || (Date.now() + 1).toString(),
        content: assistantContent,
        role: 'assistant',
        timestamp: new Date(),
        model: selectedModel.id
      };
      addMessage(assistantMessage);

      // Complete agent process
      updateAgentProcess(processId, {
        status: 'completed',
        endTime: new Date(),
        step: 'Response completed',
        details: `Generated ${assistantContent.length} characters`
      });
      setCurrentAgentStep(null);

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Update agent process with error
      updateAgentProcess(processId, {
        status: 'error',
        endTime: new Date(),
        step: 'Error occurred',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      setCurrentAgentStep(null);

      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        role: 'assistant',
        timestamp: new Date(),
        model: selectedModel.id
      };
      addMessage(errorMessage);
    } finally {
      setLoading(false);
      setIsStreaming(false);
      setStreamingMessage('');
    }
  }, [selectedModel, messages, addMessage, setLoading, addAgentProcess, updateAgentProcess, setCurrentAgentStep]);

  return {
    sendMessage,
    streamingMessage,
    isStreaming
  };
}