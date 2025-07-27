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
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    category: 'reasoning',
    maxTokens: 128000,
    costPer1kTokens: 0.005,
    description: 'Most capable OpenAI model for complex reasoning tasks'
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    category: 'general',
    maxTokens: 128000,
    costPer1kTokens: 0.00015,
    description: 'Fast and efficient model for most tasks'
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    category: 'reasoning',
    maxTokens: 200000,
    costPer1kTokens: 0.003,
    description: 'Excellent for analysis and coding tasks'
  },
  {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    category: 'creative',
    maxTokens: 200000,
    costPer1kTokens: 0.00025,
    description: 'Fast and creative for writing tasks'
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    category: 'reasoning',
    maxTokens: 2000000,
    costPer1kTokens: 0.0035,
    description: 'Google\'s most capable model with large context'
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'google',
    category: 'general',
    maxTokens: 1000000,
    costPer1kTokens: 0.00015,
    description: 'Fast and efficient Google model'
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'google',
    category: 'reasoning',
    maxTokens: 32000,
    costPer1kTokens: 0.0005,
    description: 'Google\'s versatile model for complex tasks'
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

      // Check for Google API key
      const googleKey = SecureStorage.getItem('api_key_google');
      if (googleKey) {
        llmService.setApiKey('google', googleKey);
        setApiKeyConfigured('google', true);
      } else {
        setApiKeyConfigured('google', false);
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