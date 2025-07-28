import { useMemo } from 'react';
import { useStore } from '../store/useStore';

export function useMemoizedSelectors() {
  const store = useStore();

  const chatSelectors = useMemo(() => ({
    messages: store.messages,
    isLoading: store.isLoading,
    selectedModel: store.selectedModel,
    currentConversation: store.currentConversation
  }), [store.messages, store.isLoading, store.selectedModel, store.currentConversation]);

  const uiSelectors = useMemo(() => ({
    sidebarOpen: store.sidebarOpen,
    agentPanelOpen: store.agentPanelOpen,
    currentTheme: store.currentTheme,
    currentLanguage: store.currentLanguage
  }), [store.sidebarOpen, store.agentPanelOpen, store.currentTheme, store.currentLanguage]);

  const agentSelectors = useMemo(() => ({
    agentProcesses: store.agentProcesses,
    currentAgentStep: store.currentAgentStep
  }), [store.agentProcesses, store.currentAgentStep]);

  const modelSelectors = useMemo(() => ({
    availableModels: store.availableModels,
    apiKeysConfigured: store.apiKeysConfigured
  }), [store.availableModels, store.apiKeysConfigured]);

  const conversationSelectors = useMemo(() => ({
    conversations: store.conversations
  }), [store.conversations]);

  return {
    chatSelectors,
    uiSelectors,
    agentSelectors,
    modelSelectors,
    conversationSelectors,
    // Actions (these don't need memoization as they're stable)
    actions: {
      addMessage: store.addMessage,
      setLoading: store.setLoading,
      createNewConversation: store.createNewConversation,
      setCurrentConversation: store.setCurrentConversation,
      toggleSidebar: store.toggleSidebar,
      toggleAgentPanel: store.toggleAgentPanel,
      setSelectedModel: store.setSelectedModel,
      addAgentProcess: store.addAgentProcess,
      updateAgentProcess: store.updateAgentProcess,
      setCurrentAgentStep: store.setCurrentAgentStep
    }
  };
}