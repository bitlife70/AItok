import { useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { llmService } from '../services/llmService';
import { Message, UploadedFile } from '../types';
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

  const sendMessage = useCallback(async (content: string, files?: UploadedFile[]) => {
    if (!selectedModel) {
      console.error('No model selected');
      return;
    }

    // Prepare message content with file information
    let messageContent = content;
    if (files && files.length > 0) {
      const fileInfo = files.map(file => {
        if (file.content) {
          return `\n\n[File: ${file.name}]\n${file.content}`;
        }
        return `\n\n[Attached file: ${file.name} (${file.type})]`;
      }).join('');
      messageContent = content + fileInfo;
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date(),
      model: selectedModel.id,
      files: files || []
    };
    addMessage(userMessage);

    // Start agent process tracking with more detailed steps
    const processId = `process-${Date.now()}`;
    
    // Step 1: Input Analysis
    addAgentProcess({
      id: processId,
      step: 'Analyzing user input',
      status: 'running',
      startTime: new Date(),
      details: `Analyzing message: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
      tools: ['text-analyzer'],
      decision: files && files.length > 0 ? {
        question: 'How to handle attached files?',
        options: [
          { id: 'process-text', label: 'Process text files', weight: 0.8 },
          { id: 'analyze-images', label: 'Analyze images', weight: 0.6 },
          { id: 'extract-content', label: 'Extract content', weight: 0.9 }
        ],
        selectedOption: files.some(f => f.content) ? 'process-text' : 'analyze-images',
        reasoning: 'Files detected in message, determining best processing approach',
        confidence: 0.85
      } : undefined
    });
    setCurrentAgentStep('Analyzing user input');

    setLoading(true);
    setIsStreaming(true);
    setStreamingMessage('');

    try {
      // Debug: Check API configuration
      console.log('=== API Debug Info ===');
      console.log('Selected model:', selectedModel);
      console.log('Model provider:', selectedModel.provider);
      console.log('Provider status:', llmService.getProviderStatus(selectedModel.provider));
      console.log('Provider available:', llmService.isProviderAvailable(selectedModel.provider) ? 'YES' : 'NO');
      
      // Complete input analysis
      updateAgentProcess(processId, {
        status: 'completed',
        endTime: new Date()
      });

      // Step 2: Model Selection & Context Preparation
      const contextProcessId = `process-context-${Date.now()}`;
      addAgentProcess({
        id: contextProcessId,
        step: 'Preparing context for LLM',
        status: 'running',
        startTime: new Date(),
        details: `Using model: ${selectedModel.name}`,
        tools: ['context-builder', 'token-counter'],
        parentId: processId,
        decision: {
          question: 'Which model strategy to use?',
          options: [
            { id: 'direct', label: 'Direct response', weight: 0.7 },
            { id: 'chain-of-thought', label: 'Chain of thought', weight: 0.8 },
            { id: 'tool-use', label: 'Tool-assisted', weight: 0.6 }
          ],
          selectedOption: 'chain-of-thought',
          reasoning: `Selected ${selectedModel.name} for optimal response quality`,
          confidence: 0.92
        }
      });
      setCurrentAgentStep('Preparing context for LLM');

      // Prepare LLM request
      const llmMessages = messages.concat([userMessage]).map(msg => {
        if (msg.files && msg.files.length > 0) {
          let msgContent = msg.content;
          const fileInfo = msg.files.map(file => {
            if (file.content) {
              return `\n\n[File: ${file.name}]\n${file.content}`;
            }
            return `\n\n[Attached file: ${file.name} (${file.type})]`;
          }).join('');
          msgContent = msg.content + fileInfo;
          return {
            role: msg.role,
            content: msgContent
          };
        }
        return {
          role: msg.role,
          content: msg.content
        };
      });

      const request: LLMRequest = {
        messages: llmMessages,
        model: selectedModel.id,
        temperature: 0.7,
        maxTokens: 1000,
        stream: true
      };

      // Complete context preparation
      updateAgentProcess(contextProcessId, {
        status: 'completed',
        endTime: new Date()
      });

      // Step 3: LLM Streaming
      const streamProcessId = `process-stream-${Date.now()}`;
      addAgentProcess({
        id: streamProcessId,
        step: 'Streaming LLM response',
        status: 'running',
        startTime: new Date(),
        details: 'Receiving real-time response from LLM',
        tools: ['stream-processor', 'response-validator'],
        parentId: contextProcessId
      });
      setCurrentAgentStep('Streaming LLM response');

      let assistantContent = '';
      let responseId = '';

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

      // Complete streaming process
      updateAgentProcess(streamProcessId, {
        status: 'completed',
        endTime: new Date()
      });

      // Step 4: Final Processing
      const finalProcessId = `process-final-${Date.now()}`;
      addAgentProcess({
        id: finalProcessId,
        step: 'Finalizing response',
        status: 'running',
        startTime: new Date(),
        details: `Generated ${assistantContent.length} characters`,
        tools: ['response-formatter', 'quality-checker'],
        parentId: streamProcessId
      });

      // Complete final processing
      setTimeout(() => {
        updateAgentProcess(finalProcessId, {
          status: 'completed',
          endTime: new Date()
        });
        setCurrentAgentStep(null);
      }, 500);

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