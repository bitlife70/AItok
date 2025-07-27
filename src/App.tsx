import { useEffect } from 'react';
import { useStore } from './store/useStore';
import { ThemeProvider } from './contexts/ThemeContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import AgentPanel from './components/AgentPanel';
import { LLMModel } from './types';
import { SecureStorage } from './utils/encryption';
import { llmService } from './services/llmService';

// Mock data for development
const mockModels: LLMModel[] = [
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    category: 'reasoning',
    maxTokens: 8192,
    costPer1kTokens: 0.03,
    description: 'Most capable model for complex reasoning tasks'
  },
  {
    id: 'claude-3',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    category: 'reasoning',
    maxTokens: 200000,
    costPer1kTokens: 0.003,
    description: 'Excellent for analysis and coding tasks'
  },
  {
    id: 'gpt-4-code',
    name: 'GPT-4 Code',
    provider: 'openai',
    category: 'coding',
    maxTokens: 8192,
    costPer1kTokens: 0.03,
    description: 'Optimized for programming and code generation'
  },
  {
    id: 'claude-creative',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    category: 'creative',
    maxTokens: 200000,
    costPer1kTokens: 0.0002,
    description: 'Fast and creative for writing tasks'
  }
];

function App() {
  const { 
    setAvailableModels, 
    setSelectedModel,
    selectedModel,
    loadConversations,
    createNewConversation,
    conversations,
    setApiKeyConfigured
  } = useStore();

  useEffect(() => {
    // Initialize app data
    setAvailableModels(mockModels);
    loadConversations();
    
    // Initialize API key status
    const initializeApiKeys = async () => {
      // Check for OpenAI API key
      const openaiKey = SecureStorage.getItem('api_key_openai');
      if (openaiKey) {
        llmService.setApiKey('openai', openaiKey);
        setApiKeyConfigured('openai', true);
      } else {
        setApiKeyConfigured('openai', false);
      }

      // Check for Anthropic API key
      const anthropicKey = SecureStorage.getItem('api_key_anthropic');
      if (anthropicKey) {
        llmService.setApiKey('anthropic', anthropicKey);
        setApiKeyConfigured('anthropic', true);
      } else {
        setApiKeyConfigured('anthropic', false);
      }

      // Local provider is always available
      setApiKeyConfigured('local', true);
    };

    initializeApiKeys();
    
    if (!selectedModel) {
      setSelectedModel(mockModels[0]);
    }
    
    // Create initial conversation if none exist
    setTimeout(() => {
      if (conversations.length === 0) {
        createNewConversation();
      }
    }, 100);
  }, [setAvailableModels, setSelectedModel, selectedModel, loadConversations, createNewConversation, conversations.length, setApiKeyConfigured]);

  return (
    <ThemeProvider>
      <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
        <Header />
        
        <div className="flex-1 flex overflow-hidden">
          <Sidebar />
          <ChatInterface />
          <AgentPanel />
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;