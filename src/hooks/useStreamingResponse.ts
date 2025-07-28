import { useState, useCallback } from 'react';
import { llmService } from '../services/llmService';
import { LLMRequest } from '../types/api';

export function useStreamingResponse() {
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);

  const streamResponse = useCallback(async (request: LLMRequest) => {
    setIsStreaming(true);
    setStreamingMessage('');

    let assistantContent = '';
    let responseId = '';

    try {
      for await (const chunk of llmService.streamMessage(request)) {
        responseId = chunk.id;
        assistantContent = chunk.content;
        setStreamingMessage(chunk.content);

        if (chunk.finished) {
          break;
        }
      }

      return { content: assistantContent, id: responseId };
    } finally {
      setIsStreaming(false);
      setStreamingMessage('');
    }
  }, []);

  return {
    streamingMessage,
    isStreaming,
    streamResponse
  };
}