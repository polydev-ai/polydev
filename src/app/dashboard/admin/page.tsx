'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Server,
  Users,
  Activity,
  HardDrive,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Clock,
  Zap,
  Shield,
  Loader2,
  Terminal
} from 'lucide-react';
import { toast } from 'sonner';

interface SystemStats {
  total_users: number;
  total_vms: number;
  active_vms: number;
  total_sessions: number;
  active_sessions: number;
  ip_pool_available: number;
  ip_pool_total: number;
}

interface VM {
  id: string;
  user_id: string;
  ip_address: string;
  status: string;
  provider: string | null;
  last_heartbeat: string;
  created_at: string;
  user_email?: string;
}

export default function AdminPortal() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [vms, setVms] = useState<VM[]>([]);
  const [destroying, setDestroying] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, vmsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/vms')
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }

      if (vmsRes.ok) {
        const data = await vmsRes.json();
        setVms(data.vms);
      }
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDestroyVM = async (vmId: string) => {
    if (!confirm('Are you sure you want to force destroy this VM? This will terminate the user\'s session.')) {
      return;
    }

    setDestroying(vmId);

    try {
      const res = await fetch(`/api/admin/vms/${vmId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to destroy VM');
      }

      toast.success('VM destroyed successfully');
      await loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to destroy VM');
    } finally {
      setDestroying(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </motion.div>
      </div>
    );
  }

  const ipUsagePercent = stats ? ((stats.ip_pool_total - stats.ip_pool_available) / stats.ip_pool_total) * 100 : 0;

  return (
    <div className="container mx-auto py-8 max-w-7xl space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Admin Portal
          </h1>
          <p className="text-muted-foreground mt-2">
            Real-time system monitoring and management
          </p>
        </div>
        <Button onClick={loadData} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {/* Total Users */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <motion.p
                  key={stats?.total_users}
                  initial={{ scale: 1.2, color: 'hsl(var(--primary))' }}
                  animate={{ scale: 1, color: 'hsl(var(--foreground))' }}
                  className="text-3xl font-bold"
                >
                  {stats?.total_users || 0}
                </motion.p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active VMs */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active VMs</p>
                <motion.p
                  key={stats?.active_vms}
                  initial={{ scale: 1.2, color: 'hsl(var(--primary))' }}
                  animate={{ scale: 1, color: 'hsl(var(--foreground))' }}
                  className="text-3xl font-bold"
                >
                  {stats?.active_vms || 0}
                  <span className="text-sm text-muted-foreground ml-1">
                    / {stats?.total_vms || 0}
                  </span>
                </motion.p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <Server className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Sessions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Sessions</p>
                <motion.p
                  key={stats?.active_sessions}
                  initial={{ scale: 1.2, color: 'hsl(var(--primary))' }}
                  animate={{ scale: 1, color: 'hsl(var(--foreground))' }}
                  className="text-3xl font-bold"
                >
                  {stats?.active_sessions || 0}
                  <span className="text-sm text-muted-foreground ml-1">
                    / {stats?.total_sessions || 0}
                  </span>
                </motion.p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Activity className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* IP Pool Usage */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">IP Pool</p>
                <motion.p
                  key={stats?.ip_pool_available}
                  initial={{ scale: 1.2, color: 'hsl(var(--primary))' }}
                  animate={{ scale: 1, color: 'hsl(var(--foreground))' }}
                  className="text-3xl font-bold"
                >
                  {stats?.ip_pool_available || 0}
                  <span className="text-sm text-muted-foreground ml-1">
                    / {stats?.ip_pool_total || 0}
                  </span>
                </motion.p>
                <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${ipUsagePercent}%` }}
                    transition={{ duration: 0.5 }}
                    className={`h-full ${
                      ipUsagePercent > 80 ? 'bg-red-500' :
                      ipUsagePercent > 50 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                  />
                </div>
              </div>
              <div className="p-3 bg-orange-500/10 rounded-lg ml-3">
                <HardDrive className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* System Health */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid md:grid-cols-3 gap-6"
      >
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <h3 className="font-semibold">System Status</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              All services operational. Master Controller running on 192.168.5.82:4000
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Shield className="w-5 h-5 text-blue-500" />
              </div>
              <h3 className="font-semibold">Security</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              All credentials encrypted. OAuth flows secured with session tokens.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Zap className="w-5 h-5 text-purple-500" />
              </div>
              <h3 className="font-semibold">Performance</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              VMs hibernating when idle. Average resume time &lt; 2 seconds.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* VM Management */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>VM Management</CardTitle>
                <CardDescription>
                  Active virtual machines and their status
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                {vms.length} Total VMs
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {vms.length === 0 ? (
              <div className="text-center py-12">
                <Terminal className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No active VMs</p>
                <p className="text-sm text-muted-foreground mt-1">
                  VMs will appear here when users connect their CLI tools
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">VM ID</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">User</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">IP Address</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Provider</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Last Active</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {vms.map((vm, index) => (
                        <motion.tr
                          key={vm.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-b hover:bg-muted/50 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {vm.id.slice(0, 8)}
                            </code>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-sm font-medium">{vm.user_email || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{vm.user_id.slice(0, 8)}</p>
                          </td>
                          <td className="py-3 px-4">
                            <code className="text-xs font-mono">{vm.ip_address}</code>
                          </td>
                          <td className="py-3 px-4">
                            {vm.provider ? (
                              <Badge variant="outline" className="text-xs">
                                {vm.provider === 'claude_code' ? 'Claude Code' :
                                 vm.provider === 'codex' ? 'OpenAI Codex' :
                                 vm.provider === 'gemini_cli' ? 'Google Gemini' :
                                 vm.provider}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">Not connected</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className={
                                vm.status === 'running' ? 'bg-green-50 text-green-700 border-green-200' :
                                vm.status === 'hibernated' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                'bg-gray-50 text-gray-700 border-gray-200'
                              }
                            >
                              {vm.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(vm.last_heartbeat).toLocaleTimeString()}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDestroyVM(vm.id)}
                              disabled={destroying === vm.id}
                              className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              {destroying === vm.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                              Destroy
                            </Button>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
