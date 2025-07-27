import { Conversation } from '../types';

const STORAGE_KEYS = {
  CONVERSATIONS: 'aitok_conversations',
  CURRENT_CONVERSATION: 'aitok_current_conversation',
  SETTINGS: 'aitok_settings'
};

export class Storage {
  static saveConversations(conversations: Conversation[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
    } catch (error) {
      console.error('Failed to save conversations:', error);
    }
  }

  static loadConversations(): Conversation[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
      if (!stored) return [];
      
      const conversations = JSON.parse(stored);
      return conversations.map((conv: any) => ({
        ...conv,
        createdAt: new Date(conv.createdAt),
        updatedAt: new Date(conv.updatedAt),
        messages: conv.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }));
    } catch (error) {
      console.error('Failed to load conversations:', error);
      return [];
    }
  }

  static saveCurrentConversation(conversationId: string | null): void {
    try {
      if (conversationId) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_CONVERSATION, conversationId);
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_CONVERSATION);
      }
    } catch (error) {
      console.error('Failed to save current conversation:', error);
    }
  }

  static loadCurrentConversation(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.CURRENT_CONVERSATION);
    } catch (error) {
      console.error('Failed to load current conversation:', error);
      return null;
    }
  }

  static saveSettings(settings: any): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  static loadSettings(): any {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to load settings:', error);
      return {};
    }
  }

  static createNewConversation(title?: string): Conversation {
    const now = new Date();
    return {
      id: `conv-${Date.now()}`,
      title: title || `New Chat ${now.toLocaleDateString()}`,
      messages: [],
      createdAt: now,
      updatedAt: now
    };
  }

  static updateConversationTitle(conversation: Conversation, firstMessage?: string): string {
    if (firstMessage && firstMessage.length > 0) {
      // Generate title from first message
      const title = firstMessage.length > 50 
        ? firstMessage.substring(0, 50) + '...'
        : firstMessage;
      return title;
    }
    return conversation.title;
  }
}