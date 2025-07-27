import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  PaperAirplaneIcon, 
  PaperClipIcon
} from '@heroicons/react/24/outline';
import { useStore } from '../store/useStore';
import { useChat } from '../hooks/useChat';

export default function ChatInterface() {
  const { t } = useTranslation();
  const { messages, isLoading, selectedModel } = useStore();
  const { sendMessage, streamingMessage, isStreaming } = useChat();
  const [inputValue, setInputValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || isStreaming) return;

    const messageContent = inputValue;
    setInputValue('');
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    await sendMessage(messageContent);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="main-content flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Welcome to AI Talk
              </h3>
              <p className="text-gray-500 mb-4">
                Start a conversation with your AI assistant
              </p>
              {selectedModel && (
                <div className="text-sm text-gray-400">
                  Using {selectedModel.name}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {messages.map((message) => (
              <div key={message.id} className={`message message-${message.role}`}>
                <div className="message-meta">
                  {message.role === 'user' ? 'You' : selectedModel?.name || 'AI'} • {message.timestamp.toLocaleTimeString()}
                </div>
                <div className={`message-bubble message-bubble-${message.role}`}>
                  {message.content}
                </div>
              </div>
            ))}
            
            {/* Streaming Message */}
            {(isLoading || isStreaming) && (
              <div className="message message-assistant">
                <div className="message-meta">
                  {selectedModel?.name || 'AI'} • now
                </div>
                <div className="message-bubble message-bubble-assistant">
                  {isStreaming && streamingMessage ? (
                    <span>{streamingMessage}<span className="inline-block w-2 h-4 bg-gray-400 ml-1 animate-pulse">|</span></span>
                  ) : (
                    <div className="loading-dots">
                      <div className="loading-dot"></div>
                      <div className="loading-dot"></div>
                      <div className="loading-dot"></div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <button
              type="button"
              className="btn-icon"
            >
              <PaperClipIcon className="w-4 h-4" />
            </button>

            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('chat.placeholder')}
                className="input resize-none"
                rows={1}
                disabled={isLoading || isStreaming}
                style={{ 
                  minHeight: '36px',
                  maxHeight: '120px',
                  height: 'auto'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading || isStreaming}
              className="btn-icon"
              style={{ 
                background: !inputValue.trim() || isLoading || isStreaming ? '#9ca3af' : '#3b82f6',
                color: 'white'
              }}
            >
              <PaperAirplaneIcon className="w-4 h-4" />
            </button>
          </form>
          
          <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
            <span>Press Enter to send, Shift+Enter for new line</span>
            {selectedModel && <span>{selectedModel.name}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}