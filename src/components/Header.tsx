import { useTranslation } from 'react-i18next';
import { ChevronDownIcon, Bars3Icon, GlobeAltIcon, WifiIcon, ExclamationTriangleIcon, CpuChipIcon, SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { Fragment, useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useTheme } from '../contexts/ThemeContext';
import { llmService } from '../services/llmService';

export default function Header() {
  const { i18n } = useTranslation();
  const { selectedModel, availableModels, toggleSidebar, toggleAgentPanel, agentPanelOpen, setLanguage, currentLanguage, setSelectedModel, apiKeysConfigured } = useStore();
  const { theme, setTheme } = useTheme();
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  const handleLanguageChange = (lang: 'en' | 'ko') => {
    i18n.changeLanguage(lang);
    setLanguage(lang);
  };

  // Check API status when selected model or API keys change
  useEffect(() => {
    if (!selectedModel) {
      setApiStatus('error');
      return;
    }

    const provider = selectedModel.provider;
    
    // Check both llmService status and store status
    const llmStatus = llmService.getProviderStatus(provider);
    const storeStatus = apiKeysConfigured[provider];
    
    // For local providers, always check if available
    if (provider === 'local') {
      if (llmStatus === 'available') {
        setApiStatus('connected');
      } else {
        setApiStatus('error');
      }
    } else {
      // For cloud providers, check if API key is configured
      if (storeStatus && llmStatus === 'available') {
        setApiStatus('connected');
      } else {
        setApiStatus('error');
      }
    }
  }, [selectedModel, apiKeysConfigured]);

  const getApiStatusIcon = () => {
    switch (apiStatus) {
      case 'connected':
        return <WifiIcon className="w-3 h-3 text-green-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="w-3 h-3 text-red-500" />;
      default:
        return <WifiIcon className="w-3 h-3 text-yellow-500 animate-pulse" />;
    }
  };

  const getApiStatusText = () => {
    switch (apiStatus) {
      case 'connected':
        return 'API Connected';
      case 'error':
        return 'API Not Configured';
      default:
        return 'Checking...';
    }
  };

  return (
    <div className="header">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="btn-ghost text-gray-600 dark:text-gray-300"
        >
          <Bars3Icon className="w-4 h-4" />
        </button>
        
        <h1 className="text-gray-900 dark:text-white">AI Talk</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* API Status */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-sm border transition-all duration-300 ${
          apiStatus === 'connected' 
            ? 'bg-emerald-50/80 dark:bg-emerald-900/20 border-emerald-200/50 dark:border-emerald-800/50' 
            : apiStatus === 'error'
            ? 'bg-rose-50/80 dark:bg-rose-900/20 border-rose-200/50 dark:border-rose-800/50'
            : 'bg-amber-50/80 dark:bg-amber-900/20 border-amber-200/50 dark:border-amber-800/50'
        }`} title={getApiStatusText()}>
          {getApiStatusIcon()}
          <span className={`text-xs font-medium ${
            apiStatus === 'connected'
              ? 'text-emerald-700 dark:text-emerald-400'
              : apiStatus === 'error'
              ? 'text-rose-700 dark:text-rose-400'
              : 'text-amber-700 dark:text-amber-400'
          }`}>
            {apiStatus === 'connected' ? 'Ready' : apiStatus === 'error' ? 'Setup Required' : 'Checking...'}
          </span>
        </div>

        {/* Agent Panel Toggle */}
        <button
          onClick={toggleAgentPanel}
          className={`btn-secondary min-w-[80px] h-9 ${agentPanelOpen ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : ''}`}
          title={agentPanelOpen ? 'Hide Agent Panel' : 'Show Agent Panel'}
        >
          <CpuChipIcon className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-medium">Agent</span>
        </button>

        {/* Model Selector */}
        <Menu as="div" className="relative">
          <Menu.Button className="btn-secondary min-w-[120px] h-9">
            <span className="text-sm font-medium truncate">{selectedModel?.name || 'Select Model'}</span>
            <ChevronDownIcon className="w-4 h-4 flex-shrink-0" />
          </Menu.Button>
          
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 z-[9999] mt-2 w-72 origin-top-right bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl shadow-2xl border border-white/20 dark:border-gray-700/30 focus:outline-none rounded-2xl">
              <div className="p-2">
                {availableModels.map(model => (
                  <Menu.Item key={model.id}>
                    {({ active }) => (
                      <button 
                        onClick={() => setSelectedModel(model)}
                        className={`${
                          active ? 'bg-gray-50 dark:bg-gray-700' : ''
                        } ${selectedModel?.id === model.id ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}
                        w-full text-left px-3 py-2 text-sm rounded-md block`}
                      >
                        <div className="font-medium">{model.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{model.description}</div>
                      </button>
                    )}
                  </Menu.Item>
                ))}
              </div>
            </Menu.Items>
          </Transition>
        </Menu>

        {/* Theme Selector */}
        <Menu as="div" className="relative">
          <Menu.Button className="btn-secondary min-w-[80px] h-9">
            {theme === 'light' && <SunIcon className="w-4 h-4 flex-shrink-0" />}
            {theme === 'dark' && <MoonIcon className="w-4 h-4 flex-shrink-0" />}
            {theme === 'system' && <ComputerDesktopIcon className="w-4 h-4 flex-shrink-0" />}
            <span className="text-sm font-medium capitalize">{theme}</span>
            <ChevronDownIcon className="w-4 h-4 flex-shrink-0" />
          </Menu.Button>
          
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 z-[9999] mt-2 w-32 origin-top-right bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl shadow-2xl border border-white/20 dark:border-gray-700/30 focus:outline-none rounded-2xl">
              <div className="p-1">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => setTheme('light')}
                      className={`${
                        active ? 'bg-gray-50 dark:bg-gray-700' : ''
                      } ${theme === 'light' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}
                      w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2`}
                    >
                      <SunIcon className="w-4 h-4" />
                      Light
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => setTheme('dark')}
                      className={`${
                        active ? 'bg-gray-50 dark:bg-gray-700' : ''
                      } ${theme === 'dark' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}
                      w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2`}
                    >
                      <MoonIcon className="w-4 h-4" />
                      Dark
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => setTheme('system')}
                      className={`${
                        active ? 'bg-gray-50 dark:bg-gray-700' : ''
                      } ${theme === 'system' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}
                      w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2`}
                    >
                      <ComputerDesktopIcon className="w-4 h-4" />
                      System
                    </button>
                  )}
                </Menu.Item>
              </div>
            </Menu.Items>
          </Transition>
        </Menu>

        {/* Language Selector */}
        <Menu as="div" className="relative">
          <Menu.Button className="btn-secondary min-w-[100px] h-9">
            <GlobeAltIcon className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium">{currentLanguage === 'en' ? 'English' : '한국어'}</span>
            <ChevronDownIcon className="w-4 h-4 flex-shrink-0" />
          </Menu.Button>
          
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 z-[9999] mt-2 w-40 origin-top-right bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl shadow-2xl border border-white/20 dark:border-gray-700/30 focus:outline-none rounded-2xl">
              <div className="p-1">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => handleLanguageChange('en')}
                      className={`${
                        active ? 'bg-gray-50 dark:bg-gray-700' : ''
                      } ${currentLanguage === 'en' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}
                      w-full text-left px-3 py-2 text-sm rounded-md`}
                    >
                      English
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => handleLanguageChange('ko')}
                      className={`${
                        active ? 'bg-gray-50 dark:bg-gray-700' : ''
                      } ${currentLanguage === 'ko' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}
                      w-full text-left px-3 py-2 text-sm rounded-md`}
                    >
                      한국어
                    </button>
                  )}
                </Menu.Item>
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      </div>
    </div>
  );
}