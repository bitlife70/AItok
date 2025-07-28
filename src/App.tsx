import { useEffect } from 'react';
import { useStore } from './store/useStore';
import { ThemeProvider } from './contexts/ThemeContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import AgentPanel from './components/AgentPanel';
import { DEFAULT_MODELS } from './constants/models';
import { ApiInitializer } from './services/apiInitializer';

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
    setAvailableModels(DEFAULT_MODELS);
    loadConversations();
    
    // Initialize API keys
    const initializeApiKeys = async () => {
      const providerStatus = await ApiInitializer.initializeAllProviders();
      
      Object.entries(providerStatus).forEach(([provider, status]) => {
        setApiKeyConfigured(provider as any, status);
      });
    };

    initializeApiKeys();
    
    if (!selectedModel) {
      setSelectedModel(DEFAULT_MODELS[0]);
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
      <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Header />
        
        <div className="flex-1 flex overflow-hidden">
          <div className="w-80 flex-shrink-0">
            <Sidebar />
          </div>
          <div className="flex-1 min-w-0">
            <ChatInterface />
          </div>
          <div className="w-96 flex-shrink-0">
            <AgentPanel />
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;