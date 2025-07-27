import { create } from 'zustand';
import { Message, Conversation, LLMModel, AgentProcess, MCPServer, Language } from '../types';
import { Storage } from '../utils/storage';

interface AppState {
  // UI State
  currentLanguage: Language;
  sidebarOpen: boolean;
  agentPanelOpen: boolean;
  
  // Chat State
  currentConversation: Conversation | null;
  conversations: Conversation[];
  messages: Message[];
  isLoading: boolean;
  
  // Model State
  selectedModel: LLMModel | null;
  availableModels: LLMModel[];
  
  // Agent State
  agentProcesses: AgentProcess[];
  currentAgentStep: string | null;
  
  // MCP State
  mcpServers: MCPServer[];
  
  // Actions
  setLanguage: (language: Language) => void;
  toggleSidebar: () => void;
  toggleAgentPanel: () => void;
  
  // Conversation actions
  createNewConversation: () => void;
  setCurrentConversation: (conversation: Conversation | null) => void;
  addMessage: (message: Message) => void;
  updateConversation: (conversation: Conversation) => void;
  deleteConversation: (id: string) => void;
  setLoading: (loading: boolean) => void;
  
  // Model actions
  setSelectedModel: (model: LLMModel) => void;
  setAvailableModels: (models: LLMModel[]) => void;
  
  // Agent actions
  addAgentProcess: (process: AgentProcess) => void;
  updateAgentProcess: (id: string, updates: Partial<AgentProcess>) => void;
  setCurrentAgentStep: (step: string | null) => void;
  
  // MCP actions
  addMCPServer: (server: MCPServer) => void;
  updateMCPServer: (id: string, updates: Partial<MCPServer>) => void;
  
  // Persistence actions
  loadConversations: () => void;
  saveConversations: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  // Initial State
  currentLanguage: 'en',
  sidebarOpen: true,
  agentPanelOpen: true,
  
  currentConversation: null,
  conversations: [],
  messages: [],
  isLoading: false,
  
  selectedModel: null,
  availableModels: [],
  
  agentProcesses: [],
  currentAgentStep: null,
  
  mcpServers: [],
  
  // Actions
  setLanguage: (language) => set({ currentLanguage: language }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleAgentPanel: () => set((state) => ({ agentPanelOpen: !state.agentPanelOpen })),
  
  // Conversation actions
  createNewConversation: () => {
    const newConversation = Storage.createNewConversation();
    set((state) => ({
      conversations: [newConversation, ...state.conversations],
      currentConversation: newConversation,
      messages: [],
      agentProcesses: [] // Clear agent processes for new conversation
    }));
    Storage.saveCurrentConversation(newConversation.id);
    get().saveConversations();
  },
  
  setCurrentConversation: (conversation) => {
    set({ 
      currentConversation: conversation,
      messages: conversation?.messages || [],
      agentProcesses: [] // Clear agent processes when switching conversations
    });
    Storage.saveCurrentConversation(conversation?.id || null);
  },
  
  addMessage: (message) => set((state) => {
    const updatedMessages = [...state.messages, message];
    const updatedConversation = state.currentConversation ? {
      ...state.currentConversation,
      messages: updatedMessages,
      updatedAt: new Date(),
      title: updatedMessages.length === 1 ? Storage.updateConversationTitle(state.currentConversation, message.content) : state.currentConversation.title
    } : null;
    
    const updatedConversations = state.conversations.map(conv =>
      conv.id === updatedConversation?.id ? updatedConversation : conv
    );
    
    // Auto-save conversations
    setTimeout(() => get().saveConversations(), 100);
    
    return {
      messages: updatedMessages,
      currentConversation: updatedConversation,
      conversations: updatedConversations
    };
  }),
  
  updateConversation: (conversation) => set((state) => ({
    conversations: state.conversations.map(conv =>
      conv.id === conversation.id ? conversation : conv
    ),
    currentConversation: state.currentConversation?.id === conversation.id ? conversation : state.currentConversation
  })),
  
  deleteConversation: (id) => set((state) => {
    const updatedConversations = state.conversations.filter(conv => conv.id !== id);
    const shouldSelectNew = state.currentConversation?.id === id;
    const newCurrent = shouldSelectNew && updatedConversations.length > 0 ? updatedConversations[0] : null;
    
    get().saveConversations();
    Storage.saveCurrentConversation(newCurrent?.id || null);
    
    return {
      conversations: updatedConversations,
      currentConversation: newCurrent,
      messages: newCurrent?.messages || []
    };
  }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  // Model actions
  setSelectedModel: (model) => set({ selectedModel: model }),
  setAvailableModels: (models) => set({ availableModels: models }),
  
  // Agent actions
  addAgentProcess: (process) => set((state) => ({
    agentProcesses: [...state.agentProcesses, process]
  })),
  updateAgentProcess: (id, updates) => set((state) => ({
    agentProcesses: state.agentProcesses.map(p => 
      p.id === id ? { ...p, ...updates } : p
    )
  })),
  setCurrentAgentStep: (step) => set({ currentAgentStep: step }),
  
  // MCP actions
  addMCPServer: (server) => set((state) => ({
    mcpServers: [...state.mcpServers, server]
  })),
  updateMCPServer: (id, updates) => set((state) => ({
    mcpServers: state.mcpServers.map(s =>
      s.id === id ? { ...s, ...updates } : s
    )
  })),
  
  // Persistence actions
  loadConversations: () => {
    const conversations = Storage.loadConversations();
    const currentConvId = Storage.loadCurrentConversation();
    const currentConversation = conversations.find(conv => conv.id === currentConvId) || null;
    
    set({
      conversations,
      currentConversation,
      messages: currentConversation?.messages || []
    });
  },
  
  saveConversations: () => {
    const { conversations } = get();
    Storage.saveConversations(conversations);
  }
}));