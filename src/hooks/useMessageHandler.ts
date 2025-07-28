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

  const createErrorMessage = useCallback((error: Error | string): Message => {
    return {
      id: (Date.now() + 1).toString(),
      content: `Error: ${error instanceof Error ? error.message : error}`,
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

    return {
      messages: prepareLLMMessages(userMessage),
      model: selectedModel.id,
      temperature: 0.7,
      maxTokens: 1000,
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