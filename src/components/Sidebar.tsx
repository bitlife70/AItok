import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  PlusIcon, 
  XMarkIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  ServerIcon,
  Cog6ToothIcon,
  TrashIcon
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
    createNewConversation,
    deleteConversation
  } = useStore();

  if (!sidebarOpen) return null;

  return (
    <div className="sidebar flex flex-col h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white text-base truncate">AI Talk</h2>
          <button
            onClick={toggleSidebar}
            className="btn-ghost text-gray-600 dark:text-gray-300 flex-shrink-0"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mb-4 overflow-hidden">
          <button
            onClick={() => setActiveTab('conversations')}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded transition-colors min-w-0 ${
              activeTab === 'conversations'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <ChatBubbleOvalLeftEllipsisIcon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Chats</span>
          </button>
          <button
            onClick={() => setActiveTab('mcp')}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded transition-colors min-w-0 ${
              activeTab === 'mcp'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <ServerIcon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">MCP</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded transition-colors min-w-0 ${
              activeTab === 'settings'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Cog6ToothIcon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Settings</span>
          </button>
        </div>

        {activeTab === 'conversations' && (
          <div className="overflow-hidden">
            <button 
              onClick={createNewConversation}
              className="btn-primary w-full flex items-center justify-center gap-2 max-w-full"
            >
              <PlusIcon className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium truncate">{t('sidebar.newChat')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'conversations' && (
          <>
            {conversations.length === 0 ? (
              <div className="p-4 text-center">
                <ChatBubbleOvalLeftEllipsisIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No conversations yet</p>
              </div>
            ) : (
              <div className="p-2">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`conversation-item group ${
                      currentConversation?.id === conversation.id ? 'active' : ''
                    }`}
                  >
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => setCurrentConversation(conversation)}
                    >
                      <div className="conversation-title">
                        {conversation.title}
                      </div>
                      <div className="conversation-meta">
                        {conversation.messages.length} messages • {new Date(conversation.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Are you sure you want to delete this conversation?')) {
                          deleteConversation(conversation.id);
                        }
                      }}
                      className="btn-ghost p-1 w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-2 flex-shrink-0"
                      title="Delete conversation"
                    >
                      <TrashIcon className="w-4 h-4 text-red-500 hover:text-red-700 flex-shrink-0" />
                    </button>
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