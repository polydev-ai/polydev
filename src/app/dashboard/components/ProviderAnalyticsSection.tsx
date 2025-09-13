'use client'

export default function ProviderAnalyticsSection({
  providerAnalytics,
  requestLogs,
}: {
  providerAnalytics: any[] | null
  requestLogs: any[]
}) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Provider Analytics</h2>
          <p className="text-gray-600 mt-1">Performance comparison and analytics by AI provider</p>
        </div>
        <div className="text-sm text-gray-500">Based on {requestLogs.length} requests</div>
      </div>

      {/* Provider Performance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Providers</p>
              <p className="text-lg font-semibold text-gray-900">{providerAnalytics ? providerAnalytics.length : 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">Best Success Rate</p>
              <p className="text-lg font-semibold text-gray-900">
                {providerAnalytics && providerAnalytics.length > 0 
                  ? Math.max(...providerAnalytics.map(p => parseFloat(p.successRate))).toFixed(1) 
                  : '0'}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">Lowest Cost</p>
              <p className="text-lg font-semibold text-gray-900">
                {providerAnalytics && providerAnalytics.length > 0 
                  ? `$${Math.min(...providerAnalytics.map((p: any) => p.avgCost || 0)).toFixed(4)}`
                  : '$0.0000'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">Fastest Avg Latency</p>
              <p className="text-lg font-semibold text-gray-900">
                {providerAnalytics && providerAnalytics.length > 0 
                  ? `${Math.min(...providerAnalytics.map((p: any) => p.avgLatency || 0)).toFixed(0)}ms`
                  : '0ms'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Provider Comparison Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requests</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Latency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Models</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tokens</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {providerAnalytics && providerAnalytics.length > 0 ? providerAnalytics.map((provider: any) => (
                <tr key={provider.name} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-green-600 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-white text-xs font-bold">{provider.name?.charAt(0).toUpperCase() || 'P'}</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{provider.name}</div>
                        <div className="text-sm text-gray-500">{provider.models.slice(0, 2).join(', ')}{provider.models.length > 2 && ` +${provider.models.length - 2}`}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{provider.requests}</div>
                    <div className="text-sm text-gray-500">{provider.successCount}✓ {provider.errorCount}✗</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{parseFloat(provider.successRate).toFixed(1)}%</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{Math.round(provider.avgLatency)}ms</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">${provider.avgCost.toFixed(4)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{provider.models.length}</div>
                    <div className="text-sm text-gray-500">
                      {provider.models.slice(0, 2).join(', ')}
                      {provider.models.length > 2 && ` +${provider.models.length - 2}`}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{provider.totalTokens.toLocaleString()}</div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No provider analytics available. Make some API requests to see data here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

