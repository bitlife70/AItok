import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ServerIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { MCPServer } from '../types';
import { mcpService, MCPServerConfig } from '../services/mcpService';

export default function MCPServerPanel() {
  const { t } = useTranslation();
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [showAddServer, setShowAddServer] = useState(false);
  const [newServerConfig, setNewServerConfig] = useState<Partial<MCPServerConfig>>({
    type: 'stdio'
  });

  useEffect(() => {
    // Load initial servers
    setServers(mcpService.getServers());

    // Listen for server updates
    const handleServerUpdate = (updatedServers: MCPServer[]) => {
      setServers(updatedServers);
    };

    mcpService.addListener(handleServerUpdate);

    // Initialize default servers if none exist
    if (mcpService.getServers().length === 0) {
      mcpService.initializeDefaultServers();
    }

    return () => {
      mcpService.removeListener(handleServerUpdate);
    };
  }, []);

  const getStatusIcon = (status: MCPServer['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'disconnected':
        return <XCircleIcon className="w-4 h-4 text-gray-400" />;
      case 'error':
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />;
      default:
        return <XCircleIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: MCPServer['status']) => {
    switch (status) {
      case 'connected':
        return t('mcp.connected');
      case 'disconnected':
        return t('mcp.disconnected');
      case 'error':
        return t('mcp.error');
      default:
        return t('mcp.unknown');
    }
  };

  const handleConnectServer = async (serverId: string) => {
    try {
      const server = servers.find(s => s.id === serverId);
      if (!server) return;

      // For demonstration, we'll just toggle the connection
      if (server.status === 'connected') {
        await mcpService.disconnectServer(serverId);
      } else {
        // In a real implementation, we would need the full config
        // For now, just simulate reconnection
        console.log(`Attempting to reconnect server: ${serverId}`);
      }
    } catch (error) {
      console.error('Failed to toggle server connection:', error);
    }
  };

  const handleAddServer = async () => {
    if (!newServerConfig.name || !newServerConfig.id) {
      alert('Please provide server name and ID');
      return;
    }

    try {
      await mcpService.connectServer(newServerConfig as MCPServerConfig);
      setShowAddServer(false);
      setNewServerConfig({ type: 'stdio' });
    } catch (error) {
      console.error('Failed to add server:', error);
      alert('Failed to add server: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <div className="mcp-server-panel">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900">{t('sidebar.mcpServers')}</h3>
        <button
          onClick={() => setShowAddServer(true)}
          className="btn-icon"
          title="Add MCP Server"
        >
          <PlusIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Add Server Modal */}
      {showAddServer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium mb-4">Add MCP Server</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Server Name
                </label>
                <input
                  type="text"
                  value={newServerConfig.name || ''}
                  onChange={(e) => setNewServerConfig(prev => ({ ...prev, name: e.target.value }))}
                  className="input w-full"
                  placeholder="My MCP Server"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Server ID
                </label>
                <input
                  type="text"
                  value={newServerConfig.id || ''}
                  onChange={(e) => setNewServerConfig(prev => ({ ...prev, id: e.target.value }))}
                  className="input w-full"
                  placeholder="my-server"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Connection Type
                </label>
                <select
                  value={newServerConfig.type}
                  onChange={(e) => setNewServerConfig(prev => ({ ...prev, type: e.target.value as 'stdio' | 'http' }))}
                  className="input w-full"
                >
                  <option value="stdio">STDIO</option>
                  <option value="http">HTTP</option>
                </select>
              </div>

              {newServerConfig.type === 'stdio' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Command
                    </label>
                    <input
                      type="text"
                      value={newServerConfig.command || ''}
                      onChange={(e) => setNewServerConfig(prev => ({ ...prev, command: e.target.value }))}
                      className="input w-full"
                      placeholder="npx @modelcontextprotocol/server-filesystem"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Arguments (one per line)
                    </label>
                    <textarea
                      value={newServerConfig.args?.join('\n') || ''}
                      onChange={(e) => setNewServerConfig(prev => ({ 
                        ...prev, 
                        args: e.target.value.split('\n').filter(arg => arg.trim()) 
                      }))}
                      className="input w-full"
                      rows={3}
                      placeholder="/path/to/directory"
                    />
                  </div>
                </>
              )}

              {newServerConfig.type === 'http' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Server URL
                  </label>
                  <input
                    type="url"
                    value={newServerConfig.url || ''}
                    onChange={(e) => setNewServerConfig(prev => ({ ...prev, url: e.target.value }))}
                    className="input w-full"
                    placeholder="http://localhost:3000"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleAddServer}
                className="btn-primary flex-1"
              >
                Add Server
              </button>
              <button
                onClick={() => {
                  setShowAddServer(false);
                  setNewServerConfig({ type: 'stdio' });
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Servers List */}
      <div className="space-y-2">
        {servers.length === 0 ? (
          <div className="text-center text-sm text-gray-500 py-4">
            No MCP servers configured
          </div>
        ) : (
          servers.map((server) => (
            <div
              key={server.id}
              className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ServerIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-900">
                    {server.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(server.status)}
                  <span className="text-xs text-gray-500">
                    {getStatusText(server.status)}
                  </span>
                </div>
              </div>

              <div className="text-xs text-gray-500 mb-2">
                Type: {server.type.toUpperCase()}
                {server.url && ` • ${server.url}`}
              </div>

              {server.capabilities.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {server.capabilities.map((capability) => (
                    <span
                      key={capability}
                      className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                    >
                      {capability}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleConnectServer(server.id)}
                  className={`text-xs px-2 py-1 rounded ${
                    server.status === 'connected'
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {server.status === 'connected' ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}