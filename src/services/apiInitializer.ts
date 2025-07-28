import { SecureStorage } from '../utils/encryption';
import { llmService } from './llmService';

export type Provider = 'openai' | 'anthropic' | 'google' | 'local';

export class ApiInitializer {
  static async initializeAllProviders(): Promise<Record<Provider, boolean>> {
    const providerStatus: Record<Provider, boolean> = {
      openai: false,
      anthropic: false,
      google: false,
      local: true
    };

    const providers: Array<{ key: Provider; storageKey: string }> = [
      { key: 'openai', storageKey: 'api_key_openai' },
      { key: 'anthropic', storageKey: 'api_key_anthropic' },
      { key: 'google', storageKey: 'api_key_google' }
    ];

    for (const { key, storageKey } of providers) {
      const apiKey = SecureStorage.getItem(storageKey);
      if (apiKey) {
        llmService.setApiKey(key, apiKey);
        providerStatus[key] = true;
      }
    }

    return providerStatus;
  }

  static getProviderStorageKey(provider: Provider): string | null {
    const mapping: Record<Provider, string | null> = {
      openai: 'api_key_openai',
      anthropic: 'api_key_anthropic',
      google: 'api_key_google',
      local: null
    };
    return mapping[provider];
  }
}