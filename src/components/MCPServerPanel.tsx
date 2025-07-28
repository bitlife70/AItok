import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ServerIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  WrenchScrewdriverIcon,
  DocumentTextIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { MCPServer } from '../types';
import { mcpService, MCPServerConfig, MCPTool } from '../services/mcpService';
import { MCPServerRegistry, MCPServerTemplate } from '../services/mcpServerRegistry';
import { mcpToolExecutor } from '../services/mcpToolExecutor';

export default function MCPServerPanel() {
  const { t } = useTranslation();
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [showAddServer, setShowAddServer] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [serverTools, setServerTools] = useState<Record<string, MCPTool[]>>({});
  const [templates, setTemplates] = useState<MCPServerTemplate[]>([]);
  const [newServerConfig, setNewServerConfig] = useState<Partial<MCPServerConfig>>({
    type: 'stdio'
  });

  useEffect(() => {
    // Load initial servers and templates
    setServers(mcpService.getServers());
    setTemplates(MCPServerRegistry.getTemplates());

    // Listen for server updates
    const handleServerUpdate = (updatedServers: MCPServer[]) => {
      setServers(updatedServers);
      loadServerTools(updatedServers);
    };

    mcpService.addListener(handleServerUpdate);

    // Initialize default servers if none exist
    if (mcpService.getServers().length === 0) {
      mcpService.initializeDefaultServers();
    }

    // Load tools for existing servers
    loadServerTools(mcpService.getServers());

    return () => {
      mcpService.removeListener(handleServerUpdate);
    };
  }, []);

  const loadServerTools = async (serverList: MCPServer[]) => {
    const toolsMap: Record<string, MCPTool[]> = {};
    
    for (const server of serverList) {
      if (server.status === 'connected') {
        try {
          const allTools = await mcpService.listTools();
          const serverToolsData = allTools.find(t => t.serverId === server.id);
          if (serverToolsData) {
            toolsMap[server.id] = serverToolsData.tools;
          }
        } catch (error) {
          console.error(`Failed to load tools for server ${server.id}:`, error);
        }
      }
    }
    
    setServerTools(toolsMap);
  };

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
    // Validate configuration
    const errors = MCPServerRegistry.validateServerConfig(newServerConfig as MCPServerConfig);
    if (errors.length > 0) {
      alert('Configuration errors:\n' + errors.join('\n'));
      return;
    }

    try {
      const config = newServerConfig as MCPServerConfig;
      await mcpService.connectServer(config);
      
      // Save server configuration
      MCPServerRegistry.saveServer(config);
      
      setShowAddServer(false);
      setNewServerConfig({ type: 'stdio' });
    } catch (error) {
      console.error('Failed to add server:', error);
      alert('Failed to add server: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleAddFromTemplate = (template: MCPServerTemplate) => {
    const config = MCPServerRegistry.createServerFromTemplate(template.id, {
      name: template.name
    });
    
    setNewServerConfig(config);
    setShowTemplates(false);
    setShowAddServer(true);
  };

  const handleRemoveServer = async (serverId: string) => {
    if (!confirm('Are you sure you want to remove this server?')) {
      return;
    }

    try {
      await mcpService.disconnectServer(serverId);
      MCPServerRegistry.removeServer(serverId);
    } catch (error) {
      console.error('Failed to remove server:', error);
      alert('Failed to remove server: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleTestTool = async (serverId: string, toolName: string) => {
    try {
      // Get tool schema for test arguments
      const tools = serverTools[serverId] || [];
      const tool = tools.find(t => t.name === toolName);
      
      if (!tool) {
        alert('Tool not found');
        return;
      }

      // Create simple test arguments
      const testArgs: Record<string, any> = {};
      if (tool.inputSchema?.properties) {
        Object.entries(tool.inputSchema.properties).forEach(([key, prop]: [string, any]) => {
          if (prop.type === 'string') {
            testArgs[key] = 'test';
          } else if (prop.type === 'number') {
            testArgs[key] = 123;
          } else if (prop.type === 'boolean') {
            testArgs[key] = true;
          }
        });
      }

      const result = await mcpToolExecutor.executeTool({
        serverId,
        toolName,
        arguments: testArgs
      });

      alert(`Tool test ${result.success ? 'succeeded' : 'failed'}:\n${JSON.stringify(result.result, null, 2)}`);
    } catch (error) {
      console.error('Failed to test tool:', error);
      alert('Failed to test tool: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <div className="w-full h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('sidebar.mcpServers')}</h3>
        <div className="flex gap-1">
          <button
            onClick={() => setShowTemplates(true)}
            className="btn-icon"
            title="Browse Templates"
          >
            <DocumentTextIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAddServer(true)}
            className="btn-icon"
            title="Add Custom Server"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Templates Modal */}
      {showTemplates && (
        <>
          {/* Solid black overlay */}
          <div 
            className="fixed inset-0 z-[9998]"
            style={{
              backgroundColor: '#000000',
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0
            }}
            onClick={() => setShowTemplates(false)}
          />
          {/* Modal container */}
          <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
          >
            <div 
              className="modal-content rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto shadow-2xl border relative pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
                borderColor: document.documentElement.classList.contains('dark') ? '#4b5563' : '#d1d5db',
                position: 'relative',
                zIndex: 10000
              }}
            >
            <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">MCP Server Templates</h3>
            
            <div className="grid gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">{template.name}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{template.description}</p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                      {template.category}
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Type: {template.type.toUpperCase()}
                  </div>
                  
                  {template.installInstructions && (
                    <div className="text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 p-2 rounded mb-2">
                      <strong>Install:</strong> {template.installInstructions}
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddFromTemplate(template)}
                      className="btn-primary text-xs"
                    >
                      Use Template
                    </button>
                    {template.documentation && (
                      <a
                        href={template.documentation}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary text-xs"
                      >
                        Documentation
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowTemplates(false)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
            </div>
          </div>
        </>
      )}

      {/* Add Server Modal */}
      {showAddServer && (
        <>
          {/* Solid black overlay */}
          <div 
            className="fixed inset-0 z-[9998]"
            style={{
              backgroundColor: '#000000',
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0
            }}
            onClick={() => setShowAddServer(false)}
          />
          {/* Modal container */}
          <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
          >
            <div 
              className="modal-content rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl border relative pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
                borderColor: document.documentElement.classList.contains('dark') ? '#4b5563' : '#d1d5db',
                position: 'relative',
                zIndex: 10000
              }}
            >
            <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">Add MCP Server</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
        </>
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

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleConnectServer(server.id)}
                  className={`text-xs px-2 py-1 rounded ${
                    server.status === 'connected'
                      ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800'
                      : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800'
                  }`}
                >
                  {server.status === 'connected' ? 'Disconnect' : 'Connect'}
                </button>
                
                <button
                  onClick={() => setSelectedServer(selectedServer === server.id ? null : server.id)}
                  className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800"
                >
                  {selectedServer === server.id ? 'Hide Tools' : 'Show Tools'}
                </button>
                
                <button
                  onClick={() => handleRemoveServer(server.id)}
                  className="text-xs px-2 py-1 rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800"
                  title="Remove Server"
                >
                  <TrashIcon className="w-3 h-3" />
                </button>
              </div>
              
              {/* Tools List */}
              {selectedServer === server.id && serverTools[server.id] && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Available Tools ({serverTools[server.id].length})
                  </h5>
                  <div className="space-y-2">
                    {serverTools[server.id].map((tool) => (
                      <div
                        key={tool.name}
                        className="bg-gray-50 dark:bg-gray-700 rounded p-2"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                            {tool.name}
                          </span>
                          <button
                            onClick={() => handleTestTool(server.id, tool.name)}
                            className="text-xs px-1 py-0.5 rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800"
                            title="Test Tool"
                          >
                            <WrenchScrewdriverIcon className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {tool.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}