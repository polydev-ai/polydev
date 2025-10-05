'use client'

export default function ApiExplorer() {
  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            API Explorer
          </h1>
          <p className="text-lg text-slate-600">
            Test and explore the Polydev AI API endpoints
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-center text-slate-500">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              API Explorer Coming Soon
            </h3>
            <p className="text-slate-600">
              Interactive API documentation and testing interface will be available here.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}