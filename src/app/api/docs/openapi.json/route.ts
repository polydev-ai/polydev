import { NextResponse } from 'next/server';

export async function GET() {
  const spec = {
    "openapi": "3.0.0",
    "info": {
      "title": "Polydev Firecracker CLI Service API",
      "version": "1.0.0",
      "description": "API for managing Firecracker VMs, provider authentication, and CLI streaming for AI providers",
      "contact": {
        "name": "Polydev Support",
        "url": "https://polydev.ai"
      }
    },
    "servers": [
      {
        "url": "http://localhost:3000",
        "description": "Local development server"
      },
      {
        "url": "https://polydev.ai",
        "description": "Production server"
      }
    ],
    "tags": [
      {
        "name": "VM Management",
        "description": "Operations for managing user virtual machines"
      },
      {
        "name": "Authentication",
        "description": "Provider authentication via browser VMs"
      },
      {
        "name": "CLI",
        "description": "CLI streaming and execution"
      },
      {
        "name": "Admin",
        "description": "Admin operations"
      }
    ],
    "paths": {
      "/api/vm/status": {
        "get": {
          "tags": ["VM Management"],
          "summary": "Get VM status",
          "description": "Returns the current VM status, credentials, and usage for the authenticated user",
          "security": [{"bearerAuth": []}],
          "responses": {
            "200": {
              "description": "VM status retrieved successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/VMStatus"
                  }
                }
              }
            },
            "401": {"description": "Unauthorized"},
            "404": {"description": "User not found in VM system"}
          }
        }
      },
      "/api/vm/create": {
        "post": {
          "tags": ["VM Management"],
          "summary": "Create a VM",
          "description": "Creates a new VM for the authenticated user",
          "security": [{"bearerAuth": []}],
          "responses": {
            "200": {
              "description": "VM created successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/VMCreateResponse"
                  }
                }
              }
            },
            "401": {"description": "Unauthorized"},
            "500": {"description": "Failed to create VM"}
          }
        }
      },
      "/api/vm/start": {
        "post": {
          "tags": ["VM Management"],
          "summary": "Start VM",
          "description": "Starts the user's VM",
          "security": [{"bearerAuth": []}],
          "responses": {
            "200": {"description": "VM started successfully"},
            "401": {"description": "Unauthorized"},
            "404": {"description": "VM not found"},
            "500": {"description": "Failed to start VM"}
          }
        }
      },
      "/api/vm/stop": {
        "post": {
          "tags": ["VM Management"],
          "summary": "Stop VM",
          "description": "Stops the user's VM",
          "security": [{"bearerAuth": []}],
          "responses": {
            "200": {"description": "VM stopped successfully"},
            "401": {"description": "Unauthorized"},
            "404": {"description": "VM not found"},
            "500": {"description": "Failed to stop VM"}
          }
        }
      },
      "/api/vm/auth": {
        "post": {
          "tags": ["Authentication"],
          "summary": "Start authentication session",
          "description": "Starts a browser VM authentication session for a provider",
          "security": [{"bearerAuth": []}],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": ["provider"],
                  "properties": {
                    "provider": {
                      "type": "string",
                      "enum": ["codex", "claude_code", "gemini_cli"],
                      "description": "AI provider to authenticate with"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Auth session started",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/AuthSession"
                  }
                }
              }
            },
            "400": {"description": "Invalid provider"},
            "401": {"description": "Unauthorized"}
          }
        },
        "get": {
          "tags": ["Authentication"],
          "summary": "Check auth session status",
          "description": "Returns the current status of an authentication session",
          "security": [{"bearerAuth": []}],
          "parameters": [
            {
              "name": "sessionId",
              "in": "query",
              "required": true,
              "schema": {"type": "string"},
              "description": "Authentication session ID"
            }
          ],
          "responses": {
            "200": {
              "description": "Session status retrieved",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/AuthSession"
                  }
                }
              }
            },
            "401": {"description": "Unauthorized"},
            "404": {"description": "Session not found"}
          }
        }
      },
      "/api/vm/auth/status/{sessionId}": {
        "get": {
          "tags": ["Authentication"],
          "summary": "Check auth session status",
          "description": "Returns the current status of an authentication session",
          "security": [{"bearerAuth": []}],
          "parameters": [
            {
              "name": "sessionId",
              "in": "path",
              "required": true,
              "schema": {"type": "string"},
              "description": "Authentication session ID"
            }
          ],
          "responses": {
            "200": {
              "description": "Session status retrieved",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/AuthSession"
                  }
                }
              }
            },
            "401": {"description": "Unauthorized"},
            "404": {"description": "Session not found"}
          }
        }
      },
      "/api/vm/cli/stream": {
        "post": {
          "tags": ["CLI"],
          "summary": "Stream CLI response",
          "description": "Sends a prompt to a CLI provider and streams the response via Server-Sent Events",
          "security": [{"bearerAuth": []}],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": ["prompt", "provider"],
                  "properties": {
                    "prompt": {"type": "string", "description": "The prompt to send"},
                    "provider": {
                      "type": "string",
                      "enum": ["codex_cli", "claude_code", "gemini_cli"]
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "SSE stream of CLI response",
              "content": {
                "text/event-stream": {
                  "schema": {
                    "type": "string",
                    "description": "Server-Sent Events stream"
                  }
                }
              }
            },
            "400": {"description": "Invalid request"},
            "401": {"description": "Unauthorized"},
            "429": {"description": "Monthly prompt limit exceeded"}
          }
        }
      },
      "/api/vm/usage": {
        "get": {
          "tags": ["VM Management"],
          "summary": "Get usage statistics",
          "description": "Returns usage stats for the current month",
          "security": [{"bearerAuth": []}],
          "responses": {
            "200": {
              "description": "Usage stats retrieved",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/UsageStats"
                  }
                }
              }
            },
            "401": {"description": "Unauthorized"}
          }
        }
      },
      "/api/admin/users": {
        "get": {
          "tags": ["Admin"],
          "summary": "List all users",
          "description": "Returns paginated list of all users (admin only)",
          "security": [{"bearerAuth": []}],
          "parameters": [
            {
              "name": "page",
              "in": "query",
              "schema": {"type": "integer", "default": 1}
            },
            {
              "name": "per_page",
              "in": "query",
              "schema": {"type": "integer", "default": 50}
            },
            {
              "name": "search",
              "in": "query",
              "schema": {"type": "string"}
            },
            {
              "name": "status",
              "in": "query",
              "schema": {"type": "string", "enum": ["pending", "active", "suspended", "deleted"]}
            }
          ],
          "responses": {
            "200": {"description": "Users list retrieved"},
            "401": {"description": "Unauthorized"},
            "403": {"description": "Forbidden - Admin access required"}
          }
        }
      },
      "/api/admin/vms": {
        "get": {
          "tags": ["Admin"],
          "summary": "List all VMs",
          "description": "Returns paginated list of all VMs (admin only)",
          "security": [{"bearerAuth": []}],
          "parameters": [
            {
              "name": "page",
              "in": "query",
              "schema": {"type": "integer", "default": 1}
            },
            {
              "name": "per_page",
              "in": "query",
              "schema": {"type": "integer", "default": 50}
            },
            {
              "name": "status",
              "in": "query",
              "schema": {"type": "string"}
            },
            {
              "name": "vps_host",
              "in": "query",
              "schema": {"type": "string"}
            }
          ],
          "responses": {
            "200": {"description": "VMs list retrieved"},
            "401": {"description": "Unauthorized"},
            "403": {"description": "Forbidden"}
          }
        }
      },
      "/api/admin/stats": {
        "get": {
          "tags": ["Admin"],
          "summary": "Get system statistics",
          "description": "Returns system-wide statistics (admin only)",
          "security": [{"bearerAuth": []}],
          "responses": {
            "200": {
              "description": "Stats retrieved",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/SystemStats"
                  }
                }
              }
            },
            "401": {"description": "Unauthorized"},
            "403": {"description": "Forbidden"}
          }
        }
      }
    },
    "components": {
      "securitySchemes": {
        "bearerAuth": {
          "type": "http",
          "scheme": "bearer",
          "bearerFormat": "JWT"
        }
      },
      "schemas": {
        "VMStatus": {
          "type": "object",
          "properties": {
            "user": {
              "type": "object",
              "properties": {
                "userId": {"type": "string"},
                "email": {"type": "string"},
                "status": {"type": "string"},
                "subscriptionPlan": {"type": "string"},
                "decodoPort": {"type": "integer"}
              }
            },
            "vm": {
              "type": "object",
              "properties": {
                "vmId": {"type": "string"},
                "status": {"type": "string"},
                "ipAddress": {"type": "string"},
                "vpsHost": {"type": "string"},
                "vcpuCount": {"type": "integer"},
                "memoryMB": {"type": "integer"},
                "uptime": {"type": "integer"},
                "cpuUsage": {"type": "number"},
                "memoryUsage": {"type": "number"}
              }
            },
            "credentials": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "provider": {"type": "string"},
                  "isValid": {"type": "boolean"},
                  "lastVerified": {"type": "string"}
                }
              }
            },
            "usage": {
              "type": "object",
              "properties": {
                "monthlyPromptsUsed": {"type": "integer"},
                "monthlyPromptLimit": {"type": "integer"}
              }
            }
          }
        },
        "VMCreateResponse": {
          "type": "object",
          "properties": {
            "message": {"type": "string"},
            "vm": {"type": "object"},
            "userId": {"type": "string"}
          }
        },
        "AuthSession": {
          "type": "object",
          "properties": {
            "sessionId": {"type": "string"},
            "provider": {"type": "string"},
            "status": {"type": "string"},
            "novncURL": {"type": "string"},
            "browserVMId": {"type": "string"},
            "timeoutAt": {"type": "string"}
          }
        },
        "UsageStats": {
          "type": "object",
          "properties": {
            "subscription": {
              "type": "object",
              "properties": {
                "plan": {"type": "string"},
                "billingCycleStart": {"type": "string"},
                "daysRemaining": {"type": "integer"}
              }
            },
            "usage": {
              "type": "object",
              "properties": {
                "monthlyPrompts": {"type": "integer"},
                "monthlyPromptsLimit": {"type": "integer"},
                "totalPrompts": {"type": "integer"},
                "totalTokens": {"type": "integer"},
                "byProvider": {"type": "object"}
              }
            }
          }
        },
        "SystemStats": {
          "type": "object",
          "properties": {
            "users": {
              "type": "object",
              "properties": {
                "total": {"type": "integer"},
                "active": {"type": "integer"},
                "byPlan": {"type": "object"}
              }
            },
            "vms": {
              "type": "object",
              "properties": {
                "total": {"type": "integer"},
                "running": {"type": "integer"},
                "stopped": {"type": "integer"}
              }
            },
            "authSessions": {
              "type": "object",
              "properties": {
                "active": {"type": "integer"}
              }
            },
            "vpsHosts": {"type": "array"}
          }
        }
      }
    }
  };

  return NextResponse.json(spec);
}
