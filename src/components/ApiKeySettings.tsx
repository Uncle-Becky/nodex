import React, { useEffect, useState } from 'react';
import { apiKeyManager } from '../services/ApiKeyManager';
import type { LLMProvider } from '../types/llm';

interface ApiKeySettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiKeySettings: React.FC<ApiKeySettingsProps> = ({
  isOpen,
  onClose,
}) => {
  const [providers, setProviders] = useState<
    Record<
      LLMProvider,
      {
        key: string;
        hasKey: boolean;
        isValid: boolean;
        lastUsed?: number;
        usageCount: number;
        rateLimitStatus: {
          canMakeRequest: boolean;
          minuteUsage: number;
          hourUsage: number;
          dayUsage: number;
        };
      }
    >
  >({
    openai: {
      key: '',
      hasKey: false,
      isValid: false,
      usageCount: 0,
      rateLimitStatus: {
        canMakeRequest: false,
        minuteUsage: 0,
        hourUsage: 0,
        dayUsage: 0,
      },
    },
    claude: {
      key: '',
      hasKey: false,
      isValid: false,
      usageCount: 0,
      rateLimitStatus: {
        canMakeRequest: false,
        minuteUsage: 0,
        hourUsage: 0,
        dayUsage: 0,
      },
    },
    gemini: {
      key: '',
      hasKey: false,
      isValid: false,
      usageCount: 0,
      rateLimitStatus: {
        canMakeRequest: false,
        minuteUsage: 0,
        hourUsage: 0,
        dayUsage: 0,
      },
    },
    perplexity: {
      key: '',
      hasKey: false,
      isValid: false,
      usageCount: 0,
      rateLimitStatus: {
        canMakeRequest: false,
        minuteUsage: 0,
        hourUsage: 0,
        dayUsage: 0,
      },
    },
  });
  const [isValidating, setIsValidating] = useState<
    Record<LLMProvider, boolean>
  >({
    openai: false,
    claude: false,
    gemini: false,
    perplexity: false,
  });

  useEffect(() => {
    if (isOpen) {
      loadProviderStatus();
    }
  }, [isOpen]);

  const loadProviderStatus = () => {
    const allProviders: LLMProvider[] = [
      'openai',
      'claude',
      'gemini',
      'perplexity',
    ];
    const newProviders = { ...providers };

    allProviders.forEach(provider => {
      const status = apiKeyManager.getProviderStatus(provider);
      newProviders[provider] = {
        key: newProviders[provider].key,
        hasKey: status.hasKey,
        isValid: status.isValid,
        lastUsed: status.lastUsed,
        usageCount: status.usageCount,
        rateLimitStatus: status.rateLimitStatus,
      };
    });

    setProviders(newProviders);
  };

  const handleKeyChange = (provider: LLMProvider, key: string) => {
    setProviders(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        key,
      },
    }));
  };

  const handleSaveKey = async (provider: LLMProvider) => {
    const key = providers[provider].key.trim();
    if (!key) return;

    setIsValidating(prev => ({ ...prev, [provider]: true }));

    try {
      apiKeyManager.setApiKey(provider, key);
      const isValid = await apiKeyManager.validateApiKey(provider);

      setProviders(prev => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          hasKey: true,
          isValid,
          key: '', // Clear the input after saving
        },
      }));
    } catch (error) {
      console.error(`Failed to validate ${provider} API key:`, error);
      setProviders(prev => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          hasKey: true,
          isValid: false,
        },
      }));
    } finally {
      setIsValidating(prev => ({ ...prev, [provider]: false }));
    }
  };

  const handleRemoveKey = (provider: LLMProvider) => {
    apiKeyManager.removeApiKey(provider);
    setProviders(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        key: '',
        hasKey: false,
        isValid: false,
        usageCount: 0,
      },
    }));
  };

  const getProviderInfo = (provider: LLMProvider) => {
    const info = {
      openai: {
        name: 'OpenAI',
        description: 'GPT-4, GPT-3.5, and other OpenAI models',
        website: 'https://platform.openai.com/api-keys',
        color: 'bg-green-50 border-green-200',
      },
      claude: {
        name: 'Anthropic Claude',
        description: 'Claude 3.5 Sonnet, Haiku, and Opus models',
        website: 'https://console.anthropic.com/',
        color: 'bg-orange-50 border-orange-200',
      },
      gemini: {
        name: 'Google Gemini',
        description: 'Gemini Pro, Flash, and other Google AI models',
        website: 'https://aistudio.google.com/app/apikey',
        color: 'bg-blue-50 border-blue-200',
      },
      perplexity: {
        name: 'Perplexity AI',
        description: 'Llama and Sonar models with web search',
        website: 'https://www.perplexity.ai/settings/api',
        color: 'bg-purple-50 border-purple-200',
      },
    };
    return info[provider];
  };

  const formatLastUsed = (timestamp?: number): string => {
    if (!timestamp) return 'Never';
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto'>
        <div className='p-6'>
          <div className='flex justify-between items-center mb-6'>
            <h2 className='text-2xl font-bold text-gray-900'>
              API Key Management
            </h2>
            <button
              onClick={onClose}
              className='text-gray-400 hover:text-gray-600 text-2xl'
            >
              ×
            </button>
          </div>

          <div className='space-y-6'>
            {(Object.keys(providers) as LLMProvider[]).map(provider => {
              const providerData = providers[provider];
              const info = getProviderInfo(provider);

              return (
                <div
                  key={provider}
                  className={`p-4 rounded-lg border ${info.color}`}
                >
                  <div className='flex items-start justify-between mb-3'>
                    <div>
                      <h3 className='text-lg font-semibold text-gray-900'>
                        {info.name}
                      </h3>
                      <p className='text-sm text-gray-600'>
                        {info.description}
                      </p>
                      <a
                        href={info.website}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-xs text-blue-600 hover:text-blue-800 underline'
                      >
                        Get API Key →
                      </a>
                    </div>
                    <div className='flex items-center gap-2'>
                      {providerData.hasKey && (
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            providerData.isValid
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {providerData.isValid ? '✓ Valid' : '✗ Invalid'}
                        </span>
                      )}
                      {providerData.rateLimitStatus.canMakeRequest ? (
                        <span className='px-2 py-1 rounded-full text-xs bg-green-100 text-green-800'>
                          ✓ Available
                        </span>
                      ) : (
                        <span className='px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800'>
                          ⚠ Rate Limited
                        </span>
                      )}
                    </div>
                  </div>

                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2'>
                        API Key
                      </label>
                      <div className='flex gap-2'>
                        <input
                          type='password'
                          value={providerData.key}
                          onChange={e =>
                            handleKeyChange(provider, e.target.value)
                          }
                          placeholder={
                            providerData.hasKey
                              ? '••••••••••••••••'
                              : 'Enter API key...'
                          }
                          className='flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                        />
                        <button
                          onClick={() => handleSaveKey(provider)}
                          disabled={
                            !providerData.key.trim() || isValidating[provider]
                          }
                          className='px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed'
                        >
                          {isValidating[provider] ? '⏳' : 'Save'}
                        </button>
                        {providerData.hasKey && (
                          <button
                            onClick={() => handleRemoveKey(provider)}
                            className='px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700'
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    <div className='space-y-2'>
                      <div className='text-sm'>
                        <span className='font-medium text-gray-700'>
                          Usage Count:
                        </span>
                        <span className='ml-2 text-gray-600'>
                          {providerData.usageCount}
                        </span>
                      </div>
                      <div className='text-sm'>
                        <span className='font-medium text-gray-700'>
                          Last Used:
                        </span>
                        <span className='ml-2 text-gray-600'>
                          {formatLastUsed(providerData.lastUsed)}
                        </span>
                      </div>
                      <div className='text-sm'>
                        <span className='font-medium text-gray-700'>
                          Rate Limits:
                        </span>
                        <div className='ml-2 text-xs text-gray-600 space-y-1'>
                          <div>
                            Minute: {providerData.rateLimitStatus.minuteUsage}
                            /60
                          </div>
                          <div>
                            Hour: {providerData.rateLimitStatus.hourUsage}/3600
                          </div>
                          <div>
                            Day: {providerData.rateLimitStatus.dayUsage}/10000
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className='mt-6 p-4 bg-gray-50 rounded-lg'>
            <h4 className='text-sm font-semibold text-gray-900 mb-2'>
              Security Notice
            </h4>
            <p className='text-xs text-gray-600'>
              API keys are encrypted and stored locally in your browser. They
              are never sent to our servers. Each provider has different rate
              limits and pricing. Please refer to their documentation for
              details.
            </p>
          </div>

          <div className='mt-6 flex justify-end'>
            <button
              onClick={onClose}
              className='px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700'
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
