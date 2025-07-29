import { useState, useEffect } from 'react';
import { 
  KeyIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  CloudIcon,
  ComputerDesktopIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { llmService } from '../services/llmService';
import { SecureStorage } from '../utils/encryption';
import { useStore } from '../store/useStore';

interface APIProvider {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  keyPlaceholder: string;
  testEndpoint?: string;
  isLocal?: boolean;
}

const API_PROVIDERS: APIProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4, GPT-3.5 models',
    icon: <CloudIcon className="w-5 h-5" />,
    keyPlaceholder: 'sk-...',
    testEndpoint: 'https://api.openai.com/v1/models'
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude models',
    icon: <CloudIcon className="w-5 h-5" />,
    keyPlaceholder: 'sk-ant-...',
    testEndpoint: 'https://api.anthropic.com/v1/messages'
  },
  {
    id: 'google',
    name: 'Google',
    description: 'Gemini models',
    icon: <CloudIcon className="w-5 h-5" />,
    keyPlaceholder: 'AIza...',
    testEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models'
  },
  {
    id: 'local',
    name: 'Ollama (Local)',
    description: 'Local models via Ollama',
    icon: <ComputerDesktopIcon className="w-5 h-5" />,
    keyPlaceholder: 'No API key required',
    isLocal: true,
    testEndpoint: 'http://localhost:11434/api/tags'
  }
];

interface ConnectionStatus {
  status: 'idle' | 'testing' | 'connected' | 'error';
  message?: string;
}

export default function APISettings() {
  const { setApiKeyConfigured } = useStore();
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [connectionStatus, setConnectionStatus] = useState<Record<string, ConnectionStatus>>({});

  useEffect(() => {
    // Load saved API keys from secure storage
    const loadedKeys: Record<string, string> = {};
    
    API_PROVIDERS.forEach(provider => {
      if (!provider.isLocal) {
        const savedKey = SecureStorage.getItem(`api_key_${provider.id}`);
        if (savedKey) {
          loadedKeys[provider.id] = savedKey;
          llmService.setApiKey(provider.id, savedKey);
          setApiKeyConfigured(provider.id, true);
        } else {
          setApiKeyConfigured(provider.id, false);
        }
      } else {
        // For local providers, always mark as configured
        setApiKeyConfigured(provider.id, true);
      }
    });
    
    setApiKeys(loadedKeys);

    // Initialize connection status
    const initialStatus: Record<string, ConnectionStatus> = {};
    API_PROVIDERS.forEach(provider => {
      initialStatus[provider.id] = { status: 'idle' };
    });
    setConnectionStatus(initialStatus);
  }, []);

  const saveApiKey = (providerId: string, key: string) => {
    const newKeys = { ...apiKeys, [providerId]: key };
    setApiKeys(newKeys);
    
    // Save to secure storage
    if (key.trim()) {
      SecureStorage.setItem(`api_key_${providerId}`, key);
      setApiKeyConfigured(providerId, true);
    } else {
      SecureStorage.removeItem(`api_key_${providerId}`);
      setApiKeyConfigured(providerId, false);
    }
    
    // Set in llmService
    llmService.setApiKey(providerId, key);
  };

  const toggleKeyVisibility = (providerId: string) => {
    setShowKeys(prev => ({
      ...prev,
      [providerId]: !prev[providerId]
    }));
  };

  const testConnection = async (providerId: string) => {
    const provider = API_PROVIDERS.find(p => p.id === providerId);
    if (!provider) return;

    setConnectionStatus(prev => ({
      ...prev,
      [providerId]: { status: 'testing', message: 'Testing connection...' }
    }));

    try {
      if (provider.isLocal) {
        // Test local Ollama connection
        const response = await fetch(provider.testEndpoint!, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setConnectionStatus(prev => ({
            ...prev,
            [providerId]: { 
              status: 'connected', 
              message: `Connected! Found ${data.models?.length || 0} models` 
            }
          }));
          // Update global state for local provider
          setApiKeyConfigured(providerId, true);
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } else {
        // Test cloud API connection
        const apiKey = apiKeys[providerId];
        if (!apiKey) {
          throw new Error('API key required');
        }

        let testResponse;
        if (providerId === 'openai') {
          testResponse = await fetch('https://api.openai.com/v1/models', {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          });
        } else if (providerId === 'anthropic') {
          testResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'claude-3-haiku-20240307',
              max_tokens: 1,
              messages: [{ role: 'user', content: 'test' }]
            })
          });
        } else if (providerId === 'google') {
          testResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [{ 
                parts: [{ text: 'test' }] 
              }],
              generationConfig: { 
                maxOutputTokens: 1 
              }
            })
          });
        }

        if (testResponse && testResponse.ok) {
          setConnectionStatus(prev => ({
            ...prev,
            [providerId]: { 
              status: 'connected', 
              message: 'Connection successful!' 
            }
          }));
          // Update global state
          setApiKeyConfigured(providerId, true);
        } else if (testResponse) {
          throw new Error(`HTTP ${testResponse.status}: ${testResponse.statusText}`);
        }
      }
    } catch (error) {
      console.error(`Connection test failed for ${providerId}:`, error);
      setConnectionStatus(prev => ({
        ...prev,
        [providerId]: { 
          status: 'error', 
          message: error instanceof Error ? error.message : 'Connection failed'
        }
      }));
      // Update global state on error (only for providers that require API keys)
      if (provider && !provider.isLocal) {
        setApiKeyConfigured(providerId, false);
      }
    }
  };

  const getStatusIcon = (status: ConnectionStatus) => {
    switch (status.status) {
      case 'connected':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'testing':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500 animate-pulse" />;
      default:
        return <KeyIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: ConnectionStatus) => {
    switch (status.status) {
      case 'connected': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'testing': return 'text-yellow-600';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="api-settings space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">API Configuration</h3>
        <p className="text-sm text-gray-600">
          Configure your API keys to connect to different LLM providers. Your keys are stored locally in your browser.
        </p>
      </div>

      <div className="space-y-4">
        {API_PROVIDERS.map(provider => (
          <div key={provider.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {provider.icon}
                <div>
                  <h4 className="font-medium text-gray-900">{provider.name}</h4>
                  <p className="text-sm text-gray-600">{provider.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(connectionStatus[provider.id] || { status: 'idle' })}
                <span className={`text-sm font-medium ${getStatusColor(connectionStatus[provider.id] || { status: 'idle' })}`}>
                  {connectionStatus[provider.id]?.status || 'idle'}
                </span>
              </div>
            </div>

            {!provider.isLocal ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type={showKeys[provider.id] ? 'text' : 'password'}
                        value={apiKeys[provider.id] || ''}
                        onChange={(e) => saveApiKey(provider.id, e.target.value)}
                        placeholder={provider.keyPlaceholder}
                        className="input w-full pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => toggleKeyVisibility(provider.id)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showKeys[provider.id] ? (
                          <EyeSlashIcon className="w-4 h-4" />
                        ) : (
                          <EyeIcon className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <button
                      onClick={() => testConnection(provider.id)}
                      disabled={!apiKeys[provider.id] || connectionStatus[provider.id]?.status === 'testing'}
                      className="btn-secondary"
                    >
                      {connectionStatus[provider.id]?.status === 'testing' ? 'Testing...' : 'Test'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Make sure Ollama is running on localhost:11434
                  </span>
                  <button
                    onClick={() => testConnection(provider.id)}
                    disabled={connectionStatus[provider.id]?.status === 'testing'}
                    className="btn-secondary"
                  >
                    {connectionStatus[provider.id]?.status === 'testing' ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>
              </div>
            )}

            {connectionStatus[provider.id]?.message && (
              <div className={`mt-2 text-sm ${getStatusColor(connectionStatus[provider.id]!)}`}>
                {connectionStatus[provider.id]!.message}
              </div>
            )}

            {connectionStatus[provider.id]?.status === 'connected' && !provider.isLocal && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-700 font-medium">
                    API key is valid and ready to use!
                  </span>
                </div>
              </div>
            )}

            {connectionStatus[provider.id]?.status === 'error' && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                <div className="flex items-center gap-2">
                  <XCircleIcon className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-700">
                    Connection failed. Please check your {provider.isLocal ? 'Ollama installation' : 'API key'}.
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Getting API Keys</h4>
        <div className="space-y-2 text-sm text-blue-800">
          <div>
            <strong>OpenAI:</strong> Visit{' '}
            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">
              platform.openai.com/api-keys
            </a>
          </div>
          <div>
            <strong>Anthropic:</strong> Visit{' '}
            <a href="https://console.anthropic.com/account/keys" target="_blank" rel="noopener noreferrer" className="underline">
              console.anthropic.com/account/keys
            </a>
          </div>
          <div>
            <strong>Google:</strong> Visit{' '}
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline">
              aistudio.google.com/app/apikey
            </a>
          </div>
          <div>
            <strong>Ollama:</strong> Install from{' '}
            <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="underline">
              ollama.ai
            </a>{' '}
            and run models locally
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheckIcon className="w-5 h-5 text-blue-500" />
          <h4 className="font-medium text-gray-900">Security & Privacy</h4>
        </div>
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            <strong>🔒 Local Encryption:</strong> API keys are encrypted using browser-specific fingerprinting before storage.
          </p>
          <p>
            <strong>🏠 Local Storage:</strong> All data stays in your browser - nothing is sent to external servers except the official API endpoints.
          </p>
          <p>
            <strong>🛡️ No Tracking:</strong> We don't collect, store, or transmit your API keys or conversations to any third parties.
          </p>
          <p className="text-yellow-700">
            <strong>⚠️ Note:</strong> This is client-side encryption for basic protection. For enterprise use, consider server-side key management.
          </p>
        </div>
      </div>
    </div>
  );
}