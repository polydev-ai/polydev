import { NextRequest } from 'next/server';
import { GET } from '@/app/api/vm/status/route';
import { createClient } from '@/lib/supabase/server';

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('VM Status API', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('GET /api/vm/status', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const req = new NextRequest('http://localhost:3000/api/vm/status');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if user not found in VM system', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { email: 'test@example.com' } },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: new Error('Not found'),
            }),
          }),
        }),
      });

      const req = new NextRequest('http://localhost:3000/api/vm/status');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found in VM system');
    });

    it('should return user VM status without VM if no VM created', async () => {
      const mockUser = {
        user_id: 'user-123',
        email: 'test@example.com',
        vm_id: null,
        status: 'active',
        subscription_plan: 'pro',
        decodo_proxy_port: 8080,
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { email: 'test@example.com' } },
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockUser,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'provider_credentials') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
        if (table === 'prompts') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      const req = new NextRequest('http://localhost:3000/api/vm/status');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.email).toBe('test@example.com');
      expect(data.vm).toBeNull();
      expect(data.usage.monthlyPromptLimit).toBe(1000); // Pro plan
    });

    it('should return complete VM status with running VM', async () => {
      const mockUser = {
        user_id: 'user-123',
        email: 'test@example.com',
        vm_id: 'vm-456',
        status: 'active',
        subscription_plan: 'enterprise',
        decodo_proxy_port: 8080,
      };

      const mockVM = {
        vm_id: 'vm-456',
        status: 'running',
        ip_address: '192.168.1.100',
        vps_host: 'vps1.example.com',
        vcpu_count: 4,
        memory_mb: 8192,
        cpu_usage_percent: 25.5,
        memory_usage_mb: 4096,
        started_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        last_heartbeat: new Date().toISOString(),
      };

      const mockCredentials = [
        { provider: 'claude_code', is_valid: true, last_verified: new Date().toISOString() },
        { provider: 'codex_cli', is_valid: false, last_verified: null },
      ];

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { email: 'test@example.com' } },
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockUser,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'vms') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockVM,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'provider_credentials') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockCredentials,
                error: null,
              }),
            }),
          };
        }
        if (table === 'prompts') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockResolvedValue({
                  data: new Array(50).fill({ prompt_id: 'p1' }),
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      const req = new NextRequest('http://localhost:3000/api/vm/status');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.email).toBe('test@example.com');
      expect(data.user.subscriptionPlan).toBe('enterprise');
      expect(data.vm).not.toBeNull();
      expect(data.vm.status).toBe('running');
      expect(data.vm.ipAddress).toBe('192.168.1.100');
      expect(data.vm.uptime).toBeGreaterThan(3500); // ~1 hour
      expect(data.credentials).toHaveLength(2);
      expect(data.credentials[0].provider).toBe('claude_code');
      expect(data.credentials[0].isValid).toBe(true);
      expect(data.usage.monthlyPromptsUsed).toBe(50);
      expect(data.usage.monthlyPromptLimit).toBe(10000); // Enterprise plan
    });

    it('should handle internal server errors gracefully', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Database error'));

      const req = new NextRequest('http://localhost:3000/api/vm/status');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
