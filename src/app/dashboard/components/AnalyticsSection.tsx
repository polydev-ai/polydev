'use client'

export default function AnalyticsSection({
  realTimeData,
  providerAnalytics,
}: {
  realTimeData: {
    totalRequests: number
    totalCost: number
    responseTime: number
  }
  providerAnalytics: any[] | null
}) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Analytics & Usage</h2>
          <p className="text-gray-600 mt-1">Comprehensive analytics and insights from your API usage</p>
        </div>
        <div className="text-sm text-gray-500">
          {/* Context note intentionally minimal to avoid extra dependencies */}
        </div>
      </div>
      
      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Requests</p>
              <p className="text-2xl font-semibold text-gray-900">{realTimeData.totalRequests}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Cost</p>
              <p className="text-2xl font-semibold text-gray-900">${realTimeData.totalCost.toFixed(2)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Response</p>
              <p className="text-2xl font-semibold text-gray-900">{realTimeData.responseTime}ms</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">Success Rate</p>
              <p className="text-2xl font-semibold text-gray-900">
                {providerAnalytics && providerAnalytics.length > 0 
                  ? Math.round(providerAnalytics.reduce((sum, p) => sum + parseFloat(p.successRate), 0) / providerAnalytics.length)
                  : 98}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Usage Trends Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">API Usage Trends</h3>
          <div className="h-64">
            <div className="flex items-end justify-between h-48 border-b border-l border-gray-200 px-4 py-2">
              {[...Array(7)].map((_, i) => {
                const requests = Math.floor(realTimeData.totalRequests / 7);
                const height = Math.max(20, requests > 0 ? (requests / Math.max(1, realTimeData.totalRequests / 7)) * 180 : 20);
                return (
                  <div key={i} className="flex flex-col items-center">
                    <div 
                      className="bg-blue-500 rounded-t w-8 hover:bg-blue-600 transition-colors cursor-pointer"
                      style={{ height: `${height}px` }}
                      title={`${requests} requests`}
                    ></div>
                    <span className="text-xs text-gray-500 mt-2">
                      {new Date(Date.now() - (6-i) * 24 * 60 * 60 * 1000).toLocaleDateString('en', { weekday: 'short' })}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2 px-4">
              <span>7 days ago</span>
              <span>Today</span>
            </div>
          </div>
        </div>

        {/* Cost Analysis Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Cost Breakdown</h3>
          <div className="h-64 flex items-center justify-center">
            <div className="relative">
              {/* Simple pie chart using CSS */}
              <div className="w-40 h-40 rounded-full relative overflow-hidden" style={{
                background: `conic-gradient(
                  #3B82F6 0deg ${providerAnalytics && providerAnalytics.length > 0 ? (providerAnalytics[0]?.requests / Math.max(realTimeData.totalRequests, 1) * 360) : 120}deg,
                  #10B981 ${providerAnalytics && providerAnalytics.length > 1 ? (providerAnalytics[0]?.requests / Math.max(realTimeData.totalRequests, 1) * 360) : 120}deg ${providerAnalytics && providerAnalytics.length > 1 ? ((providerAnalytics[0]?.requests + (providerAnalytics[1]?.requests || 0)) / Math.max(realTimeData.totalRequests, 1) * 360) : 240}deg,
                  #F59E0B ${providerAnalytics && providerAnalytics.length > 2 ? ((providerAnalytics[0]?.requests + (providerAnalytics[1]?.requests || 0)) / Math.max(realTimeData.totalRequests, 1) * 360) : 240}deg 360deg
                )`
              }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Total Cost</p>
                  <p className="text-2xl font-bold text-gray-900">${realTimeData.totalCost.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
            <div className="flex items-center space-x-2">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: '#3B82F6' }} />
              <span className="text-gray-600">Top Provider</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: '#10B981' }} />
              <span className="text-gray-600">2nd Provider</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: '#F59E0B' }} />
              <span className="text-gray-600">Others</span>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Callout */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-sm text-gray-600">Total Requests</p>
            <p className="text-2xl font-bold text-gray-900">{realTimeData.totalRequests}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Cost</p>
            <p className="text-2xl font-bold text-gray-900">${realTimeData.totalCost.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">API Keys Configured</p>
            <p className="text-2xl font-bold text-gray-900">{/* Optionally surfaced */}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

