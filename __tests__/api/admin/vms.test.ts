import { NextRequest } from 'next/server';
import { GET } from '@/app/api/admin/vms/route';
import { createClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('Admin VMs API', () => {
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

  describe('GET /api/admin/vms', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const req = new NextRequest('http://localhost:3000/api/admin/vms');
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

      const req = new NextRequest('http://localhost:3000/api/admin/vms');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden - Admin access required');
    });

    it('should return paginated list of VMs for admin', async () => {
      const mockVMs = [
        {
          vm_id: 'vm-1',
          user_id: 'user-1',
          vps_host: 'vps1.example.com',
          vm_type: 'firecracker',
          ip_address: '192.168.1.100',
          status: 'running',
          vcpu_count: 4,
          memory_mb: 8192,
          created_at: new Date().toISOString(),
          uptime_seconds: 3600,
          cpu_usage_percent: 25.5,
          memory_usage_mb: 4096,
          users: {
            email: 'user1@example.com',
            subscription_plan: 'pro',
            status: 'active',
          },
        },
        {
          vm_id: 'vm-2',
          user_id: 'user-2',
          vps_host: 'vps2.example.com',
          vm_type: 'firecracker',
          ip_address: '192.168.1.101',
          status: 'stopped',
          vcpu_count: 2,
          memory_mb: 4096,
          created_at: new Date().toISOString(),
          uptime_seconds: 0,
          cpu_usage_percent: 0,
          memory_usage_mb: 0,
          users: {
            email: 'user2@example.com',
            subscription_plan: 'free',
            status: 'active',
          },
        },
      ];

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
        if (table === 'vms') {
          const createChainableMock = () => {
            const chainMock = {
              select: jest.fn(),
              eq: jest.fn(),
              order: jest.fn(),
              range: jest.fn().mockResolvedValue({
                data: mockVMs,
                error: null,
                count: 2,
              }),
            };
            chainMock.select.mockReturnValue(chainMock);
            chainMock.eq.mockReturnValue(chainMock);
            chainMock.order.mockReturnValue(chainMock);
            return chainMock;
          };
          return createChainableMock();
        }
      });

      const req = new NextRequest('http://localhost:3000/api/admin/vms?page=1&per_page=50');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.vms).toHaveLength(2);
      expect(data.vms[0].vm_id).toBe('vm-1');
      expect(data.vms[0].users.email).toBe('user1@example.com');
      expect(data.pagination.total).toBe(2);
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.totalPages).toBe(1);
    });

    it('should filter VMs by status', async () => {
      const runningVMs = [
        {
          vm_id: 'vm-1',
          status: 'running',
          users: { email: 'user1@example.com', subscription_plan: 'pro', status: 'active' },
        },
      ];

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
        if (table === 'vms') {
          // Create a chainable mock that supports any order of method calls
          const createChainableMock = () => {
            const chainMock = {
              select: jest.fn(),
              eq: jest.fn(),
              order: jest.fn(),
              range: jest.fn().mockResolvedValue({
                data: runningVMs,
                error: null,
                count: 1,
              }),
            };
            // Make each method return the chain itself for chaining
            chainMock.select.mockReturnValue(chainMock);
            chainMock.eq.mockReturnValue(chainMock);
            chainMock.order.mockReturnValue(chainMock);
            return chainMock;
          };

          return createChainableMock();
        }
      });

      const req = new NextRequest('http://localhost:3000/api/admin/vms?status=running');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.vms).toHaveLength(1);
      expect(data.vms[0].status).toBe('running');
    });

    it('should handle pagination correctly', async () => {
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
        if (table === 'vms') {
          const createChainableMock = () => {
            const chainMock = {
              select: jest.fn(),
              eq: jest.fn(),
              order: jest.fn(),
              range: jest.fn().mockResolvedValue({
                data: [],
                error: null,
                count: 150, // Total VMs
              }),
            };
            chainMock.select.mockReturnValue(chainMock);
            chainMock.eq.mockReturnValue(chainMock);
            chainMock.order.mockReturnValue(chainMock);
            return chainMock;
          };
          return createChainableMock();
        }
      });

      const req = new NextRequest('http://localhost:3000/api/admin/vms?page=2&per_page=50');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.perPage).toBe(50);
      expect(data.pagination.total).toBe(150);
      expect(data.pagination.totalPages).toBe(3);
    });
  });
});
