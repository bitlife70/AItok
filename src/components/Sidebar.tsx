import { useTranslation } from 'react-i18next';
import { 
  PlusIcon, 
  XMarkIcon,
  ChatBubbleOvalLeftEllipsisIcon
} from '@heroicons/react/24/outline';
import { useStore } from '../store/useStore';

export default function Sidebar() {
  const { t } = useTranslation();
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
    <div className="sidebar flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 text-base">Chats</h2>
          <button
            onClick={toggleSidebar}
            className="btn-ghost"
          >
            <XMarkIcon className="w-3 h-3" />
          </button>
        </div>
        
        <button 
          onClick={createNewConversation}
          className="btn-primary w-full"
        >
          <PlusIcon className="w-3 h-3" />
          <span className="text-xs">{t('sidebar.newChat')}</span>
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
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
      </div>
    </div>
  );
}