import { useCallback } from 'react';
import { useStore } from '../store/useStore';
import { Message, UploadedFile } from '../types';
import { LLMRequest } from '../types/api';

export function useMessageHandler() {
  const { messages, addMessage, selectedModel } = useStore();

  const createUserMessage = useCallback((content: string, files?: UploadedFile[]): Message => {
    return {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date(),
      model: selectedModel?.id || '',
      files: files || []
    };
  }, [selectedModel]);

  const createAssistantMessage = useCallback((content: string, responseId?: string): Message => {
    return {
      id: responseId || (Date.now() + 1).toString(),
      content,
      role: 'assistant',
      timestamp: new Date(),
      model: selectedModel?.id || ''
    };
  }, [selectedModel]);

  const createErrorMessage = useCallback((error: Error | string | unknown): Message => {
    let errorMessage: string;
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else {
      errorMessage = String(error) || 'An unknown error occurred';
    }
    
    return {
      id: (Date.now() + 1).toString(),
      content: `Error: ${errorMessage}`,
      role: 'assistant',
      timestamp: new Date(),
      model: selectedModel?.id || ''
    };
  }, [selectedModel]);

  const prepareMessageContent = useCallback((content: string, files?: UploadedFile[]): string => {
    if (!files || files.length === 0) return content;
    
    const fileInfo = files.map(file => {
      if (file.content) {
        return `\n\n[File: ${file.name}]\n${file.content}`;
      }
      return `\n\n[Attached file: ${file.name} (${file.type})]`;
    }).join('');
    
    return content + fileInfo;
  }, []);

  const prepareLLMMessages = useCallback((userMessage: Message) => {
    return messages.concat([userMessage]).map(msg => {
      if (msg.files && msg.files.length > 0) {
        const msgContent = prepareMessageContent(msg.content, msg.files);
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
  }, [messages, prepareMessageContent]);

  const createLLMRequest = useCallback((userMessage: Message): LLMRequest => {
    if (!selectedModel) {
      throw new Error('No model selected');
    }

    if (!userMessage || !userMessage.content) {
      throw new Error('Invalid user message: content is required');
    }

    const llmMessages = prepareLLMMessages(userMessage);
    
    // Validate prepared messages
    if (!llmMessages || llmMessages.length === 0) {
      throw new Error('Failed to prepare messages for LLM request');
    }

    // Ensure all messages have required fields
    for (const msg of llmMessages) {
      if (!msg.role || !msg.content) {
        throw new Error('Invalid message format in LLM request');
      }
    }

    return {
      messages: llmMessages,
      model: selectedModel.id,
      temperature: Math.max(0, Math.min(2, 0.7)), // Clamp temperature between 0 and 2
      maxTokens: Math.max(1, Math.min(4096, 1000)), // Clamp maxTokens between 1 and 4096
      stream: true
    };
  }, [selectedModel, prepareLLMMessages]);

  return {
    createUserMessage,
    createAssistantMessage,
    createErrorMessage,
    prepareMessageContent,
    createLLMRequest,
    addMessage
  };
}