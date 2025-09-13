'use client'

export default function ModelAnalyticsSection({
  modelAnalytics,
  requestLogs,
}: {
  modelAnalytics: any[] | null
  requestLogs: any[]
}) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Model Analytics</h2>
          <p className="text-gray-600 mt-1">Performance comparison and analytics by specific AI models</p>
        </div>
        <div className="text-sm text-gray-500">Based on {requestLogs.length} requests</div>
      </div>

      {/* Model Performance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Models</p>
              <p className="text-lg font-semibold text-gray-900">{modelAnalytics ? modelAnalytics.length : 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">Fastest Model</p>
              <p className="text-lg font-semibold text-gray-900">
                {modelAnalytics && modelAnalytics.length > 0 
                  ? Math.max(...modelAnalytics.map(m => m.tokensPerSecond || 0))
                  : 0} t/s
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
              <p className="text-sm text-gray-600">Cheapest per Token</p>
              <p className="text-lg font-semibold text-gray-900">
                ${modelAnalytics && modelAnalytics.length > 0 
                  ? Math.min(...modelAnalytics.filter(m => parseFloat(m.costPerToken) > 0).map(m => parseFloat(m.costPerToken))).toFixed(6)
                  : '0.000000'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">Best Reliability</p>
              <p className="text-lg font-semibold text-gray-900">
                {modelAnalytics && modelAnalytics.length > 0 
                  ? Math.max(...modelAnalytics.map(m => parseFloat(m.successRate))).toFixed(1)
                  : '0'}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Model Comparison Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Model Performance Comparison</h3>
          <p className="text-sm text-gray-600 mt-1">Detailed breakdown of each model's performance metrics</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requests</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Speed (t/s)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Latency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost/Token</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tokens</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {modelAnalytics && modelAnalytics.length > 0 ? modelAnalytics.map((model) => (
                <tr key={`${model.provider}:${model.model}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-white text-xs font-bold">{model.model?.charAt(0).toUpperCase() || 'M'}</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{model.model || 'Unknown Model'}</div>
                        <div className="text-sm text-gray-500">{model.provider}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{model.requests}</div>
                    <div className="text-sm text-gray-500">{model.successCount}✓ {model.errorCount}✗</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{parseFloat(model.successRate).toFixed(1)}%</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{Math.round(model.tokensPerSecond || 0)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{Math.round(model.avgLatency || 0)}ms</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">${parseFloat(model.costPerToken).toFixed(6)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">${(model.avgCost || 0).toFixed(4)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{(model.totalTokens || 0).toLocaleString()}</div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No model analytics available. Make some API requests to see data here.
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

