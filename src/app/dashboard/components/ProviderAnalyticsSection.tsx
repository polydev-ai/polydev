'use client'

export default function ProviderAnalyticsSection({
  providerAnalytics,
  requestLogs,
  providersRegistry = [],
}: {
  providerAnalytics: any[] | null
  requestLogs: any[]
  providersRegistry?: any[]
}) {
  // Use providers registry directly instead of fetching separate logo mapping
  const providerLookup = new Map<string, any>()
  providersRegistry.forEach((provider: any) => {
    if (provider.id) {
      providerLookup.set(provider.id, provider)
      providerLookup.set(provider.name, provider)
      // Handle common variations
      if (provider.id === 'xai') {
        providerLookup.set('x-ai', provider)
        providerLookup.set('xAI', provider)
      }
    }
  })
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Provider Analytics</h2>
          <p className="text-gray-600 mt-1">Performance comparison and analytics by AI provider</p>
        </div>
        <div className="text-sm text-gray-500">Based on {requestLogs.length} requests</div>
      </div>

      {/* Comprehensive Provider Performance Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {(() => {
          const validProviders = providerAnalytics?.filter(p => p.requests > 0) || []
          const totalRequests = validProviders.reduce((sum, p) => sum + p.requests, 0)
          const totalCost = validProviders.reduce((sum, p) => sum + (p.totalCost || 0), 0)
          const totalTokens = validProviders.reduce((sum, p) => sum + (p.totalTokens || 0), 0)

          const bestReliabilityProvider = validProviders.length > 0
            ? validProviders.reduce((best, current) =>
                parseFloat(current.successRate) > parseFloat(best.successRate) ? current : best
              )
            : null

          const lowestCostProvider = validProviders.length > 0
            ? validProviders.reduce((cheapest, current) =>
                (current.avgCost || 0) < (cheapest.avgCost || 0) ? current : cheapest
              )
            : null

          const fastestProvider = validProviders.length > 0
            ? validProviders.reduce((fastest, current) =>
                (current.avgLatency || Infinity) < (fastest.avgLatency || Infinity) ? current : fastest
              )
            : null

          const mostUsedProvider = validProviders.length > 0
            ? validProviders.reduce((most, current) =>
                current.requests > most.requests ? current : most
              )
            : null

          return (
            <>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg shadow p-6 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2z" />
                    </svg>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-blue-600 font-medium">Active Providers</p>
                    <p className="text-2xl font-bold text-blue-900">{validProviders.length}</p>
                    <p className="text-xs text-blue-500">{mostUsedProvider?.name || 'No data'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg shadow p-6 border border-green-200">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-green-600 font-medium">Most Reliable</p>
                    <p className="text-2xl font-bold text-green-900">
                      {bestReliabilityProvider ? parseFloat(bestReliabilityProvider.successRate).toFixed(1) : '0'}%
                    </p>
                    <p className="text-xs text-green-500">{bestReliabilityProvider?.name || 'No data'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-violet-100 rounded-lg shadow p-6 border border-purple-200">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-purple-600 font-medium">Most Economical</p>
                    <p className="text-2xl font-bold text-purple-900">
                      ${lowestCostProvider ? (lowestCostProvider.avgCost || 0).toFixed(4) : '0.0000'}
                    </p>
                    <p className="text-xs text-purple-500">{lowestCostProvider?.name || 'No data'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-yellow-50 to-amber-100 rounded-lg shadow p-6 border border-yellow-200">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-yellow-600 font-medium">Fastest Response</p>
                    <p className="text-2xl font-bold text-yellow-900">
                      {fastestProvider ? Math.round(fastestProvider.avgLatency || 0) : '0'}ms
                    </p>
                    <p className="text-xs text-yellow-500">{fastestProvider?.name || 'No data'}</p>
                  </div>
                </div>
              </div>
            </>
          )
        })()}
      </div>

      {/* Provider Market Share and Performance Overview */}
      {providerAnalytics && providerAnalytics.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Market Share Analysis</h3>
            <div className="space-y-3">
              {providerAnalytics.slice(0, 3).map((provider: any, index: number) => {
                const totalRequests = providerAnalytics.reduce((sum: number, p: any) => sum + p.requests, 0)
                const marketShare = ((provider.requests / totalRequests) * 100)
                return (
                  <div key={`market-share-${provider.providerId || provider.name || index}`} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                        index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-green-500' : 'bg-purple-500'
                      }`}></span>
                      <span className="text-sm text-gray-600">{provider.name}</span>
                    </div>
                    <span className="text-sm font-medium">{marketShare.toFixed(1)}%</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Cost Efficiency</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Spent</span>
                <span className="text-sm font-medium">${providerAnalytics.reduce((sum: number, p: any) => sum + (p.totalCost || 0), 0).toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Average per Request</span>
                <span className="text-sm font-medium">${(providerAnalytics.reduce((sum: number, p: any) => sum + (p.totalCost || 0), 0) / Math.max(1, providerAnalytics.reduce((sum: number, p: any) => sum + p.requests, 0))).toFixed(6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Cost Spread</span>
                <span className="text-sm font-medium">
                  ${Math.min(...providerAnalytics.map((p: any) => p.avgCost || 0)).toFixed(4)} -
                  ${Math.max(...providerAnalytics.map((p: any) => p.avgCost || 0)).toFixed(4)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Reliability Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Overall Success Rate</span>
                <span className="text-sm font-medium">{(providerAnalytics.reduce((sum: number, p: any) => sum + parseFloat(p.successRate), 0) / providerAnalytics.length).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Failures</span>
                <span className="text-sm font-medium text-red-600">{providerAnalytics.reduce((sum: number, p: any) => sum + (p.errorCount || 0), 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Avg Latency</span>
                <span className="text-sm font-medium">{Math.round(providerAnalytics.reduce((sum: number, p: any) => sum + (p.avgLatency || 0), 0) / providerAnalytics.length)}ms</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Provider Comparison Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Provider
                  <span className="block text-gray-400 normal-case font-normal">Market Share & Models</span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage
                  <span className="block text-gray-400 normal-case font-normal">Requests & Reliability</span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                  <span className="block text-gray-400 normal-case font-normal">Speed & Latency</span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Economics
                  <span className="block text-gray-400 normal-case font-normal">Cost & Value</span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Portfolio
                  <span className="block text-gray-400 normal-case font-normal">Models & Tokens</span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Overall Score
                  <span className="block text-gray-400 normal-case font-normal">Ranking & Grade</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {providerAnalytics && providerAnalytics.length > 0 ? (() => {
                const totalRequests = providerAnalytics.reduce((sum: number, p: any) => sum + p.requests, 0)

                return providerAnalytics.map((provider: any, index: number) => {
                  const marketShare = ((provider.requests / totalRequests) * 100)

                  // Calculate composite score (0-100)
                  const reliabilityScore = parseFloat(provider.successRate)
                  const speedScore = provider.avgLatency > 0 ? Math.max(0, 100 - (provider.avgLatency / 50)) : 50 // 50ms = 50 points, 0ms = 100 points
                  const costScore = provider.avgCost > 0 ? Math.max(0, 100 - (provider.avgCost * 10000)) : 50 // Lower cost = higher score
                  const usageScore = Math.min(100, (marketShare * 5)) // Scale market share to max 100

                  const overallScore = (reliabilityScore * 0.4 + speedScore * 0.3 + costScore * 0.2 + usageScore * 0.1)

                  const getGrade = (score: number) => {
                    if (score >= 90) return { grade: 'A+', color: 'text-green-700', bg: 'bg-green-100' }
                    if (score >= 80) return { grade: 'A', color: 'text-green-600', bg: 'bg-green-100' }
                    if (score >= 70) return { grade: 'B', color: 'text-blue-600', bg: 'bg-blue-100' }
                    if (score >= 60) return { grade: 'C', color: 'text-yellow-600', bg: 'bg-yellow-100' }
                    return { grade: 'D', color: 'text-red-600', bg: 'bg-red-100' }
                  }

                  const grade = getGrade(overallScore)

                  return (
                    <tr key={`${provider.providerId || provider.name}-${index}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center mr-3 overflow-hidden">
                            {(() => {
                              const registryProvider = providerLookup.get(provider.name) || providerLookup.get(provider.providerId)
                              const logoUrl = provider.logo || registryProvider?.logo
                              return logoUrl ? (
                                <img
                                  src={logoUrl}
                                  alt={`${provider.name} logo`}
                                  className="w-10 h-10 object-contain"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              ) : (
                                <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                                  <span className="text-xs font-medium text-gray-500">
                                    {provider.name?.charAt(0)?.toUpperCase() || '?'}
                                  </span>
                                </div>
                              )
                            })()}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{provider.name}</div>
                            <div className="text-xs text-gray-500">{marketShare.toFixed(1)}% market share</div>
                            <div className="text-xs text-gray-400">
                              {provider.models.slice(0, 2).join(', ')}{provider.models.length > 2 && ` +${provider.models.length - 2}`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{provider.requests.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">
                          <span className="text-green-600">{provider.successCount}✓</span>
                          {provider.errorCount > 0 && <span className="text-red-600 ml-2">{provider.errorCount}✗</span>}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                          <div
                            className={`h-1 rounded-full ${parseFloat(provider.successRate) >= 95 ? 'bg-green-500' : parseFloat(provider.successRate) >= 85 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(100, parseFloat(provider.successRate))}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{parseFloat(provider.successRate).toFixed(1)}% success</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{Math.round(provider.avgLatency)}ms</div>
                        <div className="text-xs text-gray-500">latency</div>
                        <div className="flex items-center mt-1">
                          {Array.from({ length: 5 }, (_, i) => (
                            <div
                              key={`speed-dots-${provider.providerId || provider.name || index}-${i}`}
                              className={`w-2 h-2 rounded-full mr-1 ${
                                i < Math.ceil(speedScore / 20) ? 'bg-green-400' : 'bg-gray-200'
                              }`}
                            ></div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">${provider.avgCost.toFixed(4)}</div>
                        <div className="text-xs text-gray-500">per request</div>
                        <div className="text-xs text-gray-400 mt-1">
                          ${(provider.totalCost || 0).toFixed(2)} total
                        </div>
                        <div className="text-xs">
                          <span className={`inline-block px-1 py-0.5 rounded text-xs ${
                            provider.avgCost <= 0.001 ? 'bg-green-100 text-green-700' :
                            provider.avgCost <= 0.01 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {provider.avgCost <= 0.001 ? 'Cheap' : provider.avgCost <= 0.01 ? 'Fair' : 'Expensive'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{provider.models.length} models</div>
                        <div className="text-xs text-gray-500">{provider.totalTokens.toLocaleString()} tokens</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {provider.models.slice(0, 2).join(', ')}
                          {provider.models.length > 2 && (
                            <span className="text-blue-600 ml-1">+{provider.models.length - 2} more</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`inline-block px-3 py-1 text-sm font-bold rounded-full ${grade.bg} ${grade.color}`}>
                            {grade.grade}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {overallScore.toFixed(0)}/100
                        </div>
                        <div className="text-xs text-gray-400">
                          Rank #{index + 1}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                          <div
                            className="h-1 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                            style={{ width: `${Math.min(100, overallScore)}%` }}
                          ></div>
                        </div>
                      </td>
                    </tr>
                  )
                })
              })() : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
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

