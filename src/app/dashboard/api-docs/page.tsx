'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load the OpenAPI spec
    fetch('/api/docs/openapi.json')
      .then(res => res.json())
      .then(data => {
        setSpec(data);
        setLoading(false);
      })
      .catch(() => {
        // Fallback to inline spec if API route doesn't exist
        setSpec(OPENAPI_SPEC);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">API Documentation</h1>
        <p className="text-muted-foreground">{spec?.info?.description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Version</p>
              <p className="text-lg font-mono">{spec?.info?.version}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Base URL</p>
              <p className="text-lg font-mono">{spec?.servers?.[0]?.url}</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Authentication</p>
            <Badge>Bearer Token (JWT)</Badge>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="endpoints" className="space-y-4">
        <TabsList>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="schemas">Schemas</TabsTrigger>
          <TabsTrigger value="interactive">Interactive Docs</TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints" className="space-y-4">
          {spec?.tags?.map((tag: any) => (
            <Card key={tag.name}>
              <CardHeader>
                <CardTitle>{tag.name}</CardTitle>
                <CardDescription>{tag.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(spec.paths || {})
                  .filter(([_, pathItem]: any) => 
                    Object.values(pathItem).some((op: any) => op.tags?.includes(tag.name))
                  )
                  .map(([path, pathItem]: any) => 
                    Object.entries(pathItem).map(([method, operation]: any) => {
                      if (!operation.tags?.includes(tag.name)) return null;
                      
                      const methodColors: Record<string, string> = {
                        get: 'bg-blue-500',
                        post: 'bg-green-500',
                        put: 'bg-yellow-500',
                        delete: 'bg-red-500',
                        patch: 'bg-purple-500'
                      };

                      return (
                        <div key={`${path}-${method}`} className="border rounded-lg p-4 space-y-2">
                          <div className="flex items-center gap-3">
                            <Badge className={methodColors[method] || 'bg-gray-500'}>
                              {method.toUpperCase()}
                            </Badge>
                            <code className="text-sm font-mono">{path}</code>
                          </div>
                          <p className="text-sm text-muted-foreground">{operation.summary}</p>
                          <p className="text-xs">{operation.description}</p>
                          
                          {operation.parameters && (
                            <div className="mt-2">
                              <p className="text-xs font-medium mb-1">Parameters:</p>
                              <div className="space-y-1">
                                {operation.parameters.map((param: any, i: number) => (
                                  <div key={i} className="text-xs ml-4">
                                    <code className="font-mono">{param.name}</code>
                                    <span className="text-muted-foreground"> ({param.in})</span>
                                    {param.required && <span className="text-red-500">*</span>}
                                    {param.description && <span className="text-muted-foreground"> - {param.description}</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {operation.requestBody && (
                            <div className="mt-2">
                              <p className="text-xs font-medium">Request Body:</p>
                              <p className="text-xs text-muted-foreground ml-4">
                                {Object.keys(operation.requestBody.content || {}).join(', ')}
                              </p>
                            </div>
                          )}

                          <div className="mt-2">
                            <p className="text-xs font-medium">Responses:</p>
                            <div className="flex gap-2 ml-4 flex-wrap">
                              {Object.keys(operation.responses || {}).map((code) => (
                                <Badge key={code} variant="outline" className="text-xs">
                                  {code}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="schemas">
          <Card>
            <CardHeader>
              <CardTitle>Data Schemas</CardTitle>
              <CardDescription>Response and request body schemas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(spec?.components?.schemas || {}).map(([name, schema]: any) => (
                <div key={name} className="border rounded-lg p-4">
                  <h3 className="font-mono font-medium mb-2">{name}</h3>
                  <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                    {JSON.stringify(schema, null, 2)}
                  </pre>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interactive">
          <Card>
            <CardHeader>
              <CardTitle>Interactive API Explorer</CardTitle>
              <CardDescription>Try out API endpoints with Swagger UI</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <iframe
                  src={`https://petstore.swagger.io/?url=${encodeURIComponent(window.location.origin)}/api/docs/openapi.json`}
                  className="w-full h-[800px]"
                  title="API Documentation"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Quick Start</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">1. Authentication</p>
            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
{`// Get your JWT token from Supabase Auth
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;`}
            </pre>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">2. Make API Request</p>
            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
{`// Example: Get VM status
const response = await fetch('${spec?.servers?.[0]?.url}/api/vm/status', {
  headers: {
    'Authorization': \`Bearer \${token}\`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data);`}
            </pre>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">3. Stream CLI Response</p>
            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
{`// Example: Stream CLI response
const response = await fetch('${spec?.servers?.[0]?.url}/api/vm/cli/stream', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${token}\`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: 'your prompt here',
    provider: 'claude_code'
  })
});

const reader = response.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  console.log(new TextDecoder().decode(value));
}`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Inline fallback spec
const OPENAPI_SPEC = {
  "openapi": "3.0.0",
  "info": {
    "title": "Polydev Firecracker CLI Service API",
    "version": "1.0.0",
    "description": "API for managing Firecracker VMs, provider authentication, and CLI streaming for AI providers"
  },
  "servers": [
    {
      "url": "http://localhost:3000",
      "description": "Local development server"
    }
  ],
  "tags": [
    {"name": "VM Management", "description": "Operations for managing user virtual machines"},
    {"name": "Authentication", "description": "Provider authentication via browser VMs"},
    {"name": "CLI", "description": "CLI streaming and execution"},
    {"name": "Admin", "description": "Admin operations"}
  ],
  "paths": {},
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT"
      }
    },
    "schemas": {}
  }
};
