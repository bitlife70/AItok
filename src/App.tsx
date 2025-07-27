import { useEffect } from 'react';
import { useStore } from './store/useStore';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import AgentPanel from './components/AgentPanel';
import { LLMModel } from './types';

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
    conversations
  } = useStore();

  useEffect(() => {
    // Initialize app data
    setAvailableModels(mockModels);
    loadConversations();
    
    if (!selectedModel) {
      setSelectedModel(mockModels[0]);
    }
    
    // Create initial conversation if none exist
    setTimeout(() => {
      if (conversations.length === 0) {
        createNewConversation();
      }
    }, 100);
  }, [setAvailableModels, setSelectedModel, selectedModel, loadConversations, createNewConversation, conversations.length]);

  return (
    <div className="h-screen flex flex-col bg-white">
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <ChatInterface />
        <AgentPanel />
      </div>
    </div>
  );
}

export default App;