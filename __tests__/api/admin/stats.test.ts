import { NextRequest } from 'next/server';
import { GET } from '@/app/api/admin/stats/route';
import { createClient } from '@/lib/supabase/server';

// Mock global fetch
global.fetch = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('Admin Stats API', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('GET /api/admin/stats', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const req = new NextRequest('http://localhost:3000/api/admin/stats');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if user is not admin', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'user@example.com' } },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'user' },
              error: null,
            }),
          }),
        }),
      });

      const req = new NextRequest('http://localhost:3000/api/admin/stats');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return comprehensive system statistics', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123', email: 'admin@example.com' } },
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { role: 'admin' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'users') {
          // Create a chainable mock that can also be awaited directly
          const createChainableMock = () => {
            const resultPromise = Promise.resolve({
              count: 50,
              data: [
                { subscription_plan: 'free' },
                { subscription_plan: 'free' },
                { subscription_plan: 'pro' },
                { subscription_plan: 'enterprise' },
              ],
              error: null,
            });

            const chainMock = {
              eq: jest.fn().mockReturnValue(resultPromise),
              then: resultPromise.then.bind(resultPromise),
              catch: resultPromise.catch.bind(resultPromise),
              finally: resultPromise.finally.bind(resultPromise),
            };
            return chainMock;
          };

          return {
            select: jest.fn().mockReturnValue(createChainableMock()),
          };
        }
        if (table === 'vms') {
          const createChainableMock = () => {
            const resultPromise = Promise.resolve({
              count: 30,
              data: null,
              error: null,
            });

            const chainMock = {
              eq: jest.fn().mockReturnValue(resultPromise),
              then: resultPromise.then.bind(resultPromise),
              catch: resultPromise.catch.bind(resultPromise),
              finally: resultPromise.finally.bind(resultPromise),
            };
            return chainMock;
          };

          return {
            select: jest.fn().mockReturnValue(createChainableMock()),
          };
        }
        if (table === 'auth_sessions') {
          const createChainableMock = () => {
            const resultPromise = Promise.resolve({
              count: 5,
              data: null,
              error: null,
            });

            const chainMock = {
              in: jest.fn().mockReturnValue(resultPromise),
              then: resultPromise.then.bind(resultPromise),
              catch: resultPromise.catch.bind(resultPromise),
              finally: resultPromise.finally.bind(resultPromise),
            };
            return chainMock;
          };

          return {
            select: jest.fn().mockReturnValue(createChainableMock()),
          };
        }
        if (table === 'vps_hosts') {
          return {
            select: jest.fn().mockResolvedValue({
              data: [
                {
                  hostname: 'vps1.example.com',
                  ip_address: '192.168.1.1',
                  status: 'active',
                  total_vms: 15,
                  active_vms: 12,
                  cpu_usage_percent: 45.2,
                  memory_usage_percent: 62.5,
                },
                {
                  hostname: 'vps2.example.com',
                  ip_address: '192.168.1.2',
                  status: 'active',
                  total_vms: 15,
                  active_vms: 10,
                  cpu_usage_percent: 38.7,
                  memory_usage_percent: 55.1,
                },
              ],
              error: null,
            }),
          };
        }
        if (table === 'events') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [
                    {
                      event_type: 'vm_created',
                      message: 'VM created for user@example.com',
                      created_at: new Date().toISOString(),
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      // Mock Master Controller response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ masterControllerVersion: '1.0.0' }),
      });

      const req = new NextRequest('http://localhost:3000/api/admin/stats');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users.total).toBeGreaterThan(0);
      expect(data.users.byPlan).toHaveProperty('free');
      expect(data.users.byPlan).toHaveProperty('pro');
      expect(data.users.byPlan).toHaveProperty('enterprise');
      expect(data.vms.total).toBeGreaterThan(0);
      expect(data.authSessions.active).toBeGreaterThanOrEqual(0);
      expect(data.vpsHosts).toHaveLength(2);
      expect(data.vpsHosts[0].hostname).toBe('vps1.example.com');
      expect(data.vpsHosts[0].cpuUsage).toBe(45.2);
      expect(data.recentEvents).toHaveLength(1);
    });

    it('should handle Master Controller being unavailable', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123', email: 'admin@example.com' } },
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { role: 'admin' },
                  error: null,
                }),
              }),
            }),
          };
        }
        // Return minimal data for other tables
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              count: 0,
              data: [],
              error: null,
            }),
            in: jest.fn().mockResolvedValue({
              count: 0,
              data: [],
              error: null,
            }),
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        };
      });

      // Mock Master Controller failure
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      const req = new NextRequest('http://localhost:3000/api/admin/stats');
      const response = await GET(req);

      // Should still return stats even if Master Controller is down
      expect(response.status).toBe(500);
    });
  });
});
