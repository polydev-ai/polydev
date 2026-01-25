'use client'

import React from 'react'

export default function RequestLogsSection({
  requestLogs,
  requestLogsLoading,
  logsFilter,
  setLogsFilter,
  loadRequestLogs,
  selectedLog,
  setSelectedLog,
  realTimeData,
}: {
  requestLogs: any[]
  requestLogsLoading: boolean
  logsFilter: string
  setLogsFilter: (value: string) => void
  loadRequestLogs: () => void
  selectedLog: any | null
  setSelectedLog: (log: any | null) => void
  realTimeData: { totalApiKeys: number }
}) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Request Logs</h2>
          <p className="text-slate-600 mt-1">Detailed history of all API requests with prompts, responses, and provider breakdowns</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Filter Dropdown */}
          <select
            value={logsFilter}
            onChange={(e) => setLogsFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
          >
            <option value="all">All Requests</option>
            <option value="success">Successful Only</option>
            <option value="error">Errors Only</option>
            <option value="partial_success">Partial Success</option>
            <option value="credits">Credits Only</option>
            <option value="api_key">API Keys Only</option>
            <option value="cli">CLI Responses</option>
          </select>
          
          {/* Refresh Button */}
          <button
            onClick={loadRequestLogs}
            disabled={requestLogsLoading}
            className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center space-x-2"
          >
            <svg className={`w-4 h-4 ${requestLogsLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{requestLogsLoading ? 'Loading...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Request Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {requestLogsLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading request logs...</p>
          </div>
        ) : requestLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Prompt</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Models</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tokens</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cost</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Speed</th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {requestLogs.map((log: any, index: number) => (
                  <tr key={log.id || index} className="hover:bg-slate-50 cursor-pointer transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap max-w-xs">
                      <div className="text-sm text-slate-900 truncate" title={log.fullPrompt}>
                        {log.prompt || 'No prompt available'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      <div className="flex flex-wrap gap-1">
                        {log.providers && log.providers.length > 0 ? (
                          log.providers.slice(0, 2).map((provider: any, idx: number) => (
                            <span key={`${log.id || index}-provider-${idx}`} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                              {provider.model || provider.provider}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                        {log.providers && log.providers.length > 2 && (
                          <span className="text-xs text-slate-500">+{log.providers.length - 2} more</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          log.paymentMethod === 'credits' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {log.paymentMethod === 'credits' ? '💳 Credits' : '🔑 API Key'}
                        </span>
                        {log.hasCliResponse && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800" title="Response from local CLI tool">
                            ⚡ CLI
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        log.status === 'success' ? 'bg-slate-100 text-slate-800' :
                        log.status === 'error' ? 'bg-slate-100 text-slate-800' :
                        log.status === 'partial_success' ? 'bg-slate-100 text-slate-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {log.status || 'unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {log.totalTokens ? log.totalTokens.toLocaleString() : '0'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      ${log.cost ? log.cost.toFixed(4) : '0.0000'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {log.speed || '0'} tok/s
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-slate-600 hover:text-slate-900 px-3 py-1 rounded hover:bg-slate-50 transition-colors"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-slate-600">No request logs available. Make some API requests to see data here.</p>
          </div>
        )}
      </div>

      {/* Logs Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Requests</p>
              <p className="text-lg font-semibold text-slate-900">{requestLogs.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Cost</p>
              <p className="text-lg font-semibold text-slate-900">
                ${requestLogs.reduce((sum: number, log: any) => sum + (log.cost || 0), 0).toFixed(4)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Tokens</p>
              <p className="text-lg font-semibold text-slate-900">
                {requestLogs.reduce((sum: number, log: any) => sum + (log.totalTokens || 0), 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-600">Avg Response</p>
              <p className="text-lg font-semibold text-slate-900">
                {requestLogs.length > 0 
                  ? Math.round(requestLogs.reduce((sum: number, log: any) => sum + (log.responseTime || 0), 0) / requestLogs.length)
                  : 0}ms
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Request Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-slate-900">Request Details</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Request Overview */}
              <div>
                <h4 className="text-sm font-medium text-slate-900 mb-3">Request Overview</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500">Timestamp</p>
                    <p className="text-sm font-medium text-slate-900">
                      {new Date((selectedLog as any).timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500">Status</p>
                    <p className={`text-sm font-medium ${
                      (selectedLog as any).status === 'success' ? 'text-slate-600' :
                      (selectedLog as any).status === 'error' ? 'text-slate-600' :
                      (selectedLog as any).status === 'partial_success' ? 'text-slate-600' :
                      'text-slate-600'
                    }`}>
                      {(selectedLog as any).status || 'unknown'}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500">Total Tokens</p>
                    <p className="text-sm font-medium text-slate-900">
                      {(selectedLog as any).totalTokens ? (selectedLog as any).totalTokens.toLocaleString() : '0'}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500">Total Cost</p>
                    <p className="text-sm font-medium text-slate-900">
                      ${(selectedLog as any).cost ? (selectedLog as any).cost.toFixed(4) : '0.0000'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Full Prompt or Conversation */}
              <div>
                <h4 className="text-sm font-medium text-slate-900 mb-3">
                  {(selectedLog as any).source === 'chat' && (selectedLog as any).fullConversation
                    ? 'Full Conversation'
                    : 'Full Prompt'}
                </h4>

                {/* Chat conversation display */}
                {(selectedLog as any).source === 'chat' && (selectedLog as any).fullConversation ? (
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <p className="text-sm font-medium text-slate-900">
                        Chat Session: "{(selectedLog as any).sessionTitle}"
                      </p>
                      <p className="text-xs text-slate-700 mt-1">
                        {(selectedLog as any).fullConversation.length} messages in conversation
                      </p>
                    </div>

                    <div className="max-h-96 overflow-y-auto space-y-3">
                      {(selectedLog as any).fullConversation.map((message: any, index: number) => (
                        <div key={index} className={`p-4 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-slate-50 border border-slate-200'
                            : 'bg-slate-50 border border-slate-200'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                message.role === 'user'
                                  ? 'bg-slate-100 text-slate-800'
                                  : 'bg-slate-100 text-slate-800'
                              }`}>
                                {message.role === 'user' ? 'User' : 'Assistant'}
                              </span>
                              {message.model_id && (
                                <span className="px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-800">
                                  {message.model_id}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-500">
                              {new Date(message.timestamp).toLocaleString()}
                            </span>
                          </div>

                          <div className="prose prose-sm max-w-none">
                            <pre className="whitespace-pre-wrap text-sm text-slate-800 font-mono bg-white p-3 rounded border">
                              {message.content}
                            </pre>
                          </div>

                          {/* Show usage and cost info for assistant messages */}
                          {message.role === 'assistant' && (message.usage_info || message.cost_info) && (
                            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                              {message.usage_info?.total_tokens && (
                                <div className="bg-white p-2 rounded border">
                                  <p className="text-slate-500">Tokens</p>
                                  <p className="font-medium">{message.usage_info.total_tokens}</p>
                                </div>
                              )}
                              {message.cost_info?.total_cost && (
                                <div className="bg-white p-2 rounded border">
                                  <p className="text-slate-500">Cost</p>
                                  <p className="font-medium">${parseFloat(message.cost_info.total_cost).toFixed(4)}</p>
                                </div>
                              )}
                              {message.usage_info?.prompt_tokens && (
                                <div className="bg-white p-2 rounded border">
                                  <p className="text-slate-500">Input</p>
                                  <p className="font-medium">{message.usage_info.prompt_tokens}</p>
                                </div>
                              )}
                              {message.usage_info?.completion_tokens && (
                                <div className="bg-white p-2 rounded border">
                                  <p className="text-slate-500">Output</p>
                                  <p className="font-medium">{message.usage_info.completion_tokens}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Regular prompt display for MCP requests */
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <pre className="whitespace-pre-wrap text-sm text-slate-800 font-mono">
                      {(selectedLog as any).fullPrompt || (selectedLog as any).fullPromptContent || 'No prompt available'}
                    </pre>
                  </div>
                )}
              </div>

              {/* Provider Breakdown */}
              {(selectedLog as any).providers && (selectedLog as any).providers.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-900 mb-3">Provider Breakdown</h4>
                  <div className="space-y-4">
                    {(selectedLog as any).providers.map((provider: any, index: number) => (
                      <div key={index} className="border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
                              {(() => {
                                // Simple provider logo mapping for the detail modal
                                const getProviderLogoUrl = (providerName: string) => {
                                  if (!providerName) return null;
                                  const normalized = providerName.toLowerCase();

                                  if (normalized.includes('openai') || normalized.includes('gpt')) return 'https://cdn.worldvectorlogo.com/logos/openai-2.svg';
                                  if (normalized.includes('anthropic') || normalized.includes('claude')) return 'https://cdn.worldvectorlogo.com/logos/anthropic.svg';
                                  if (normalized.includes('google') || normalized.includes('gemini')) return 'https://cdn.worldvectorlogo.com/logos/google-g-2015.svg';
                                  if (normalized.includes('mistral')) return 'https://avatars.githubusercontent.com/u/132372032?s=200&v=4';
                                  if (normalized.includes('together')) return 'https://avatars.githubusercontent.com/u/59926009?s=200&v=4';
                                  if (normalized.includes('cerebras')) return 'https://avatars.githubusercontent.com/u/76206399?s=200&v=4';
                                  if (normalized.includes('xai') || normalized.includes('x-ai') || normalized.includes('grok')) return 'https://avatars.githubusercontent.com/u/165790280?s=200&v=4';
                                  if (normalized.includes('perplexity')) return 'https://avatars.githubusercontent.com/u/83043819?s=200&v=4';
                                  if (normalized.includes('cohere')) return 'https://avatars.githubusercontent.com/u/30046380?s=200&v=4';
                                  if (normalized.includes('huggingface') || normalized.includes('hugging-face')) return 'https://huggingface.co/front/assets/huggingface_logo-noborder.svg';
                                  if (normalized.includes('deepseek')) return 'https://avatars.githubusercontent.com/u/159560534?s=200&v=4';
                                  if (normalized.includes('zhipu') || normalized.includes('zai') || normalized.includes('glm')) return 'https://z-cdn.chatglm.cn/z-ai/static/logo.svg';
                                  if (normalized.includes('groq')) return 'https://avatars.githubusercontent.com/u/76236773?s=200&v=4';
                                  if (normalized.includes('llama') || normalized.includes('meta')) return 'https://avatars.githubusercontent.com/u/69631?s=200&v=4';
                                  if (normalized.includes('qwen') || normalized.includes('alibaba')) return 'https://cdn.worldvectorlogo.com/logos/alibaba-group-holding-limited.svg';
                                  return null;
                                };

                                const logoUrl = getProviderLogoUrl(provider.provider);
                                if (logoUrl) {
                                  return (
                                    <img
                                      src={logoUrl}
                                      alt={`${provider.provider} logo`}
                                      className="w-8 h-8 object-contain"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const fallback = target.nextElementSibling as HTMLElement;
                                        if (fallback) fallback.style.display = 'flex';
                                      }}
                                    />
                                  );
                                }
                                return null;
                              })()}
                              <div className="w-8 h-8 bg-gradient-to-r from-slate-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ display: (() => {
                                const getProviderLogoUrl = (providerName: string) => {
                                  if (!providerName) return null;
                                  const normalized = providerName.toLowerCase();
                                  if (normalized.includes('openai') || normalized.includes('gpt')) return 'url';
                                  if (normalized.includes('anthropic') || normalized.includes('claude')) return 'url';
                                  if (normalized.includes('google') || normalized.includes('gemini')) return 'url';
                                  if (normalized.includes('mistral')) return 'url';
                                  if (normalized.includes('together')) return 'url';
                                  if (normalized.includes('cerebras')) return 'url';
                                  if (normalized.includes('xai') || normalized.includes('x-ai') || normalized.includes('grok')) return 'url';
                                  if (normalized.includes('perplexity')) return 'url';
                                  if (normalized.includes('cohere')) return 'url';
                                  if (normalized.includes('huggingface') || normalized.includes('hugging-face')) return 'url';
                                  if (normalized.includes('deepseek')) return 'url';
                                  if (normalized.includes('zhipu') || normalized.includes('zai') || normalized.includes('glm')) return 'url';
                                  if (normalized.includes('groq')) return 'url';
                                  if (normalized.includes('llama') || normalized.includes('meta')) return 'url';
                                  if (normalized.includes('qwen') || normalized.includes('alibaba')) return 'url';
                                  return null;
                                };
                                return getProviderLogoUrl(provider.provider) ? 'none' : 'flex';
                              })()} }>
                                {(provider.provider || 'P').charAt(0).toUpperCase()}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-slate-900">{provider.model || provider.provider}</div>
                              <div className="text-xs text-slate-500">{provider.provider}</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              provider.paymentMethod === 'credits' ? 'bg-slate-100 text-slate-800' : 'bg-slate-100 text-slate-800'
                            }`}>
                              {provider.paymentMethod === 'credits' ? '💳 Credits' : '🔑 API Key'}
                            </span>
                            {provider.source === 'cli' && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800" title={`Via ${provider.cli_tool || 'CLI tool'}`}>
                                ⚡ CLI
                              </span>
                            )}
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              provider.success ? 'bg-slate-100 text-slate-800' : 'bg-slate-100 text-slate-800'
                            }`}>
                              {provider.success ? 'Success' : 'Error'}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-slate-500">Tokens</p>
                            <p className="font-medium">{provider.tokens || 0}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Cost</p>
                            <p className="font-medium">${provider.cost ? provider.cost.toFixed(4) : '0.0000'}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Success</p>
                            <p className="font-medium">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                provider.success ? 'bg-slate-100 text-slate-800' : 'bg-slate-100 text-slate-800'
                              }`}>
                                {provider.success ? 'Yes' : 'No'}
                              </span>
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Latency</p>
                            <p className="font-medium">{provider.latency || 0}ms</p>
                          </div>
                        </div>

                        {/* Provider Response */}
                        {provider.response && (
                          <div className="mt-4">
                            <p className="text-xs text-slate-500 mb-2">Response</p>
                            <div className="bg-slate-50 p-3 rounded-lg max-h-40 overflow-y-auto">
                              <pre className="whitespace-pre-wrap text-xs text-slate-700 font-mono">
                                {typeof provider.response === 'string' 
                                  ? provider.response 
                                  : JSON.stringify(provider.response, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Request Metadata */}
              <div>
                <h4 className="text-sm font-medium text-slate-900 mb-3">Request Metadata</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500">Client</p>
                    <p className="text-sm font-medium text-slate-900">
                      {(selectedLog as any).client || 'Unknown'}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500">Temperature</p>
                    <p className="text-sm font-medium text-slate-900">
                      {(selectedLog as any).temperature || 'Default'}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500">Max Tokens</p>
                    <p className="text-sm font-medium text-slate-900">
                      {(selectedLog as any).maxTokens || 'Default'}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500">Response Time</p>
                    <p className="text-sm font-medium text-slate-900">
                      {(selectedLog as any).responseTime || 0}ms
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500">Successful Providers</p>
                    <p className="text-sm font-medium text-slate-900">
                      {(selectedLog as any).successfulProviders || 0}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500">Failed Providers</p>
                    <p className="text-sm font-medium text-slate-900">
                      {(selectedLog as any).failedProviders || 0}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500">Payment Method</p>
                    <p className="text-sm font-medium text-slate-900">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        (selectedLog as any).paymentMethod === 'credits' ? 'bg-slate-100 text-slate-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {(selectedLog as any).paymentMethod === 'credits' ? '💳 Credits' : '🔑 API Key'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
