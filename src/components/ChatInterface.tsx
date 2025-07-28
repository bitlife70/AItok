import React, { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';
import { useMemoizedSelectors } from '../hooks/useMemoizedSelectors';
import { useChat } from '../hooks/useChat';
import { useScrollToBottom } from '../hooks/useScrollToBottom';
import { UploadedFile } from '../types';
import FileUpload from './FileUpload';
import MarkdownMessage from './MarkdownMessage';

const ChatInterface = React.memo(() => {
  const { t } = useTranslation();
  const { chatSelectors } = useMemoizedSelectors();
  const { messages, isLoading, selectedModel } = chatSelectors;
  const { sendMessage, streamingMessage, isStreaming } = useChat();
  const [inputValue, setInputValue] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { ref: messagesEndRef } = useScrollToBottom([messages, streamingMessage]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputValue.trim() && selectedFiles.length === 0) || isLoading || isStreaming) return;

    const messageContent = inputValue;
    const messageFiles = [...selectedFiles];
    
    setInputValue('');
    setSelectedFiles([]);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    await sendMessage(messageContent, messageFiles);
  }, [inputValue, selectedFiles, isLoading, isStreaming, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [handleSubmit]);

  return (
    <div className="main-content flex flex-col h-full bg-transparent">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center h-full p-8">
            <div className="text-center max-w-2xl mx-auto">
              {/* 메인 아이콘 */}
              <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>

              {/* 메인 타이틀 */}
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
                AI Talk
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                Your intelligent conversation partner
              </p>

              {/* 기능 소개 카드들 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-gray-700/20 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4 mx-auto">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Smart Responses</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Get intelligent, contextual answers to your questions</p>
                </div>

                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-gray-700/20 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-4 mx-auto">
                    <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Multiple Models</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Choose from various AI models for different needs</p>
                </div>

                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-gray-700/20 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center mb-4 mx-auto">
                    <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Secure & Private</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Your conversations are private and secure</p>
                </div>
              </div>

              {/* 시작 버튼과 모델 정보 */}
              <div className="space-y-4">
                {selectedModel && (
                  <div className="inline-flex items-center gap-2 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20 dark:border-gray-700/20">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Ready with {selectedModel.name}
                    </span>
                  </div>
                )}
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  💡 Start typing your message below to begin the conversation
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {messages.map((message) => (
              <div key={message.id} className={`message message-${message.role}`}>
                <div className="message-meta text-gray-500 dark:text-gray-400">
                  {message.role === 'user' ? 'You' : selectedModel?.name || 'AI'} • {message.timestamp.toLocaleTimeString()}
                </div>
                <div className={`message-bubble message-bubble-${message.role}`}>
                  {message.files && message.files.length > 0 && (
                    <div className="mb-2 space-y-1">
                      {message.files.map((file) => (
                        <div key={file.id} className="inline-flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                          <span>{file.name}</span>
                          <span className="text-gray-500 dark:text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {message.role === 'assistant' ? (
                    <MarkdownMessage content={message.content} />
                  ) : (
                    <div className="whitespace-pre-wrap break-words">{message.content}</div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Streaming Message */}
            {(isLoading || isStreaming) && (
              <div className="message message-assistant">
                <div className="message-meta text-gray-500 dark:text-gray-400">
                  {selectedModel?.name || 'AI'} • now
                </div>
                <div className="message-bubble message-bubble-assistant">
                  {isStreaming && streamingMessage ? (
                    <div className="relative">
                      <MarkdownMessage content={streamingMessage} />
                      <span className="inline-block w-2 h-4 bg-gray-400 dark:bg-gray-500 ml-1 animate-pulse">|</span>
                    </div>
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
      <div className="border-t border-white/20 dark:border-gray-700/30 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-6">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="flex items-end gap-4">
            <FileUpload
              onFilesSelected={setSelectedFiles}
              maxFiles={5}
              maxSizePerFile={10}
            />

            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('chat.placeholder')}
                className="input resize-none bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
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
              disabled={(!inputValue.trim() && selectedFiles.length === 0) || isLoading || isStreaming}
              className="btn-icon"
              style={{ 
                background: (!inputValue.trim() && selectedFiles.length === 0) || isLoading || isStreaming ? '#9ca3af' : '#3b82f6',
                color: 'white'
              }}
            >
              <PaperAirplaneIcon className="w-4 h-4" />
            </button>
          </form>
          
          <div className="flex items-center justify-between mt-2 text-xs text-gray-400 dark:text-gray-500">
            <span>Press Enter to send, Shift+Enter for new line</span>
            {selectedModel && <span>{selectedModel.name}</span>}
          </div>
        </div>
      </div>
    </div>
  );
});

ChatInterface.displayName = 'ChatInterface';

export default ChatInterface;