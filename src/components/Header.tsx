import { useTranslation } from 'react-i18next';
import { ChevronDownIcon, Bars3Icon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useStore } from '../store/useStore';

export default function Header() {
  const { i18n } = useTranslation();
  const { selectedModel, availableModels, toggleSidebar, setLanguage, currentLanguage, setSelectedModel } = useStore();

  const handleLanguageChange = (lang: 'en' | 'ko') => {
    i18n.changeLanguage(lang);
    setLanguage(lang);
  };

  return (
    <div className="header">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="btn-ghost"
        >
          <Bars3Icon className="w-4 h-4" />
        </button>
        
        <h1>AI Talk</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Model Selector */}
        <Menu as="div" className="relative">
          <Menu.Button className="btn-secondary">
            <span className="text-xs">{selectedModel?.name || 'Select Model'}</span>
            <ChevronDownIcon className="w-3 h-3" />
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
            <Menu.Items className="absolute right-0 z-10 mt-2 w-72 origin-top-right bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none rounded-lg border">
              <div className="p-2">
                {availableModels.map(model => (
                  <Menu.Item key={model.id}>
                    {({ active }) => (
                      <button 
                        onClick={() => setSelectedModel(model)}
                        className={`${
                          active ? 'bg-gray-50' : ''
                        } ${selectedModel?.id === model.id ? 'bg-blue-50 text-blue-700' : ''}
                        w-full text-left px-3 py-2 text-sm rounded-md block`}
                      >
                        <div className="font-medium">{model.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{model.description}</div>
                      </button>
                    )}
                  </Menu.Item>
                ))}
              </div>
            </Menu.Items>
          </Transition>
        </Menu>

        {/* Language Selector */}
        <Menu as="div" className="relative">
          <Menu.Button className="btn-secondary">
            <GlobeAltIcon className="w-3 h-3" />
            <span className="text-xs">{currentLanguage.toUpperCase()}</span>
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
            <Menu.Items className="absolute right-0 z-10 mt-2 w-32 origin-top-right bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none rounded-lg border">
              <div className="p-1">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => handleLanguageChange('en')}
                      className={`${
                        active ? 'bg-gray-50' : ''
                      } ${currentLanguage === 'en' ? 'bg-blue-50 text-blue-700' : ''}
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
                        active ? 'bg-gray-50' : ''
                      } ${currentLanguage === 'ko' ? 'bg-blue-50 text-blue-700' : ''}
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