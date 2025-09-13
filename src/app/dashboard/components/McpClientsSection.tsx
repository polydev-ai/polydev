'use client'

type MCPClient = {
  id: string
  name: string
  description: string
  status: 'connected' | 'disconnected' | 'idle'
  lastActivity?: string
  connectionTime?: string
  toolCalls: number
}

export default function McpClientsSection({
  mcpClients,
  getStatusColor,
}: {
  mcpClients: MCPClient[]
  getStatusColor: (status: string) => string
}) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Connected MCP Clients</h2>
          <p className="text-gray-600 mt-1">AI agents and tools connected to your Polydev MCP server</p>
        </div>
        <div className="text-sm text-gray-500">
          Total tool calls: {mcpClients.reduce((sum, client) => sum + client.toolCalls, 0)}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {mcpClients.map((client) => (
          <div key={client.id} className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">{client.name}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(client.status)}`}>
                  {client.status}
                </span>
              </div>
              <p className="text-gray-600 mb-4">{client.description}</p>
              <div className="space-y-2 text-sm text-gray-500">
                <div className="flex justify-between">
                  <span>Tool calls:</span>
                  <span className="font-medium">{client.toolCalls}</span>
                </div>
                {client.lastActivity && (
                  <div className="flex justify-between">
                    <span>Last activity:</span>
                    <span>{client.lastActivity}</span>
                  </div>
                )}
                {client.connectionTime && (
                  <div className="flex justify-between">
                    <span>Connected:</span>
                    <span>{client.connectionTime}</span>
                  </div>
                )}
              </div>
              <div className="mt-4 flex space-x-2">
                <button className="flex-1 bg-blue-50 text-blue-600 py-2 px-4 rounded-lg hover:bg-blue-100">
                  View Activity
                </button>
                <button className="flex-1 bg-gray-50 text-gray-600 py-2 px-4 rounded-lg hover:bg-gray-100">
                  Debug Connection
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Connect New MCP Client</h3>
            <p className="text-sm text-blue-700 mt-1">
              Add our MCP server configuration to your agent's config to start using Polydev perspectives. 
              <a href="/docs/mcp-integration" className="underline hover:no-underline ml-1">View integration guide</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

