import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  PlusIcon, 
  XMarkIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  ServerIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { useStore } from '../store/useStore';
import MCPServerPanel from './MCPServerPanel';
import APISettings from './APISettings';

export default function Sidebar() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'conversations' | 'mcp' | 'settings'>('conversations');
  const { 
    sidebarOpen, 
    toggleSidebar, 
    conversations, 
    currentConversation,
    setCurrentConversation,
    createNewConversation
  } = useStore();

  if (!sidebarOpen) return null;

  return (
    <div className="sidebar flex flex-col h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white text-base">AI Talk</h2>
          <button
            onClick={toggleSidebar}
            className="btn-ghost text-gray-600 dark:text-gray-300"
          >
            <XMarkIcon className="w-3 h-3" />
          </button>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mb-4">
          <button
            onClick={() => setActiveTab('conversations')}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded transition-colors ${
              activeTab === 'conversations'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <ChatBubbleOvalLeftEllipsisIcon className="w-3 h-3" />
            Chats
          </button>
          <button
            onClick={() => setActiveTab('mcp')}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded transition-colors ${
              activeTab === 'mcp'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <ServerIcon className="w-3 h-3" />
            MCP
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded transition-colors ${
              activeTab === 'settings'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Cog6ToothIcon className="w-3 h-3" />
            Settings
          </button>
        </div>

        {activeTab === 'conversations' && (
          <button 
            onClick={createNewConversation}
            className="btn-primary w-full"
          >
            <PlusIcon className="w-3 h-3" />
            <span className="text-xs">{t('sidebar.newChat')}</span>
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'conversations' && (
          <>
            {conversations.length === 0 ? (
              <div className="p-4 text-center">
                <ChatBubbleOvalLeftEllipsisIcon className="w-5 h-5 mx-auto text-gray-300 mb-2" />
                <p className="text-xs text-gray-500">No conversations yet</p>
              </div>
            ) : (
              <div className="p-2">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`conversation-item ${
                      currentConversation?.id === conversation.id ? 'active' : ''
                    }`}
                    onClick={() => setCurrentConversation(conversation)}
                  >
                    <div className="conversation-title">
                      {conversation.title}
                    </div>
                    <div className="conversation-meta">
                      {conversation.messages.length} messages • {new Date(conversation.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'mcp' && (
          <div className="p-4">
            <MCPServerPanel />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="p-4">
            <APISettings />
          </div>
        )}
      </div>
    </div>
  );
}