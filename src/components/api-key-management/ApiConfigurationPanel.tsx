'use client'

import { useState } from 'react'
import { Settings, Shield, AlertCircle, CheckCircle, Terminal } from 'lucide-react'
import { useApiConfiguration } from '@/hooks/useApiConfiguration'
import { PROVIDERS, ApiProvider } from '@/types/api-configuration'
import { ProviderSelector } from './ProviderSelector'
import { ApiKeyField } from './ApiKeyField'

interface ApiConfigurationPanelProps {
  className?: string
}

export function ApiConfigurationPanel({ className = '' }: ApiConfigurationPanelProps) {
  const {
    config,
    loading,
    error,
    updateProvider,
    updateApiKey,
    updateModel,
    getApiKey,
    getModel,
    hasValidConfig,
    updateConfig
  } = useApiConfiguration()

  const [expandedProvider, setExpandedProvider] = useState<ApiProvider | null>(
    config.selectedProvider || null
  )
  const [activeTab, setActiveTab] = useState<'api-keys' | 'cli-providers'>('api-keys')

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-slate-200 p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          <span className="ml-3 text-slate-600">Loading configuration...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border border-slate-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-slate-100 rounded-lg">
            <Settings className="h-5 w-5 text-slate-900" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              LLM Provider Configuration
            </h2>
            <p className="text-sm text-slate-600">
              Configure AI providers using API keys or subscription-based CLI tools
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Error Display */}
        {error && (
          <div className="bg-slate-100 border border-slate-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-slate-900" />
              <span className="text-sm text-slate-900">{error}</span>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('api-keys')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'api-keys'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>API Keys</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('cli-providers')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'cli-providers'
                  ? 'border-slate-900 text-slate-900
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300
              }`}
            >
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4" />
                <span>CLI Subscriptions</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'api-keys' && (
          <>
            {/* Security Notice */}
            <div className="bg-slate-50 border border-slate-900 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <Shield className="h-5 w-5 text-slate-900 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-slate-900 mb-1">
                    Your API keys are encrypted
                  </div>
                  <div className="text-slate-900">
                    All API keys are encrypted using browser-based cryptography before being stored locally. 
                    Your keys never leave your device.
                  </div>
                </div>
              </div>
            </div>

        {/* Provider Selection */}
        <ProviderSelector
          selectedProvider={config.selectedProvider}
          onProviderChange={(provider) => {
            updateProvider(provider)
            setExpandedProvider(provider)
          }}
        />

        {/* Provider Configuration */}
        {config.selectedProvider && (
          <div className="space-y-4">
            <div className="border border-slate-200 rounded-lg p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-slate-900">
                    {PROVIDERS[config.selectedProvider].displayName} Configuration
                  </h3>
                  {hasValidConfig(config.selectedProvider) ? (
                    <div className="flex items-center space-x-1 text-slate-900">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-xs">Configured</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 text-slate-900">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-xs">API Key Required</span>
                    </div>
                  )}
                </div>

                <ApiKeyField
                  provider={config.selectedProvider}
                  providerName={PROVIDERS[config.selectedProvider].displayName}
                  value={getApiKey(config.selectedProvider)}
                  onChange={(apiKey) => updateApiKey(config.selectedProvider!, apiKey)}
                  signupUrl={PROVIDERS[config.selectedProvider].signupUrl}
                  helpText={`Your ${PROVIDERS[config.selectedProvider].displayName} API key is encrypted and stored securely in your browser.`}
                />

                {/* Model Selection */}
                {PROVIDERS[config.selectedProvider].models && PROVIDERS[config.selectedProvider].models!.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Model Selection
                    </label>
                    <select
                      value={getModel(config.selectedProvider) || ''}
                      onChange={(e) => updateModel(config.selectedProvider!, e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-colors"
                    >
                      <option value="">Select a model...</option>
                      {PROVIDERS[config.selectedProvider].models!.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                          {model.contextWindow && ` (${model.contextWindow.toLocaleString()} tokens)`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Documentation Link */}
                <div className="text-sm">
                  <a
                    href={PROVIDERS[config.selectedProvider].docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-900 hover:text-slate-900 flex items-center space-x-1"
                  >
                    <span>View {PROVIDERS[config.selectedProvider].displayName} Documentation</span>
                    <Settings className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

            {/* Configuration Summary */}
            {hasValidConfig() && (
              <div className="bg-slate-100 border border-slate-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-slate-900" />
                  <div>
                    <div className="font-medium text-slate-900">
                      Configuration Complete
                    </div>
                    <div className="text-sm text-slate-900">
                      Your Polydev MCP server is ready to use {PROVIDERS[config.selectedProvider!].displayName} 
                      {getModel(config.selectedProvider!) && ` with ${getModel(config.selectedProvider!)}`}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* CLI Providers Tab */}
        {activeTab === 'cli-providers' && (
          <div className="text-center py-8 text-slate-500">
            CLI providers configuration coming soon
          </div>
        )}
      </div>
    </div>
  )
}