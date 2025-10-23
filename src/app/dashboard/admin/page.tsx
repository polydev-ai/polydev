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
  Terminal,
  Cpu,
  MemoryStick,
  Network,
  Thermometer,
  AlertTriangle
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

interface VPSHealth {
  cpu: {
    usage: number;
    cores: number;
    model: string;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    percent: number;
  };
  disk: Array<{
    filesystem: string;
    size: number;
    used: number;
    available: number;
    percent: number;
    mount: string;
  }>;
  network: {
    status: string;
    interfaces: Array<{
      name: string;
      status: string;
      rx_bytes: number;
      tx_bytes: number;
    }>;
  };
  temperature?: {
    current: number;
    critical: number;
  };
  uptime: number;
  load_average: number[];
}

export default function AdminPortal() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [vms, setVms] = useState<VM[]>([]);
  const [destroying, setDestroying] = useState<string | null>(null);
  const [vpsHealth, setVpsHealth] = useState<VPSHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadVPSHealth();
    const interval = setInterval(loadVPSHealth, 5000); // Poll VPS health every 5 seconds
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

  const loadVPSHealth = async () => {
    try {
      const response = await fetch('/api/admin/health/system');

      if (response.ok) {
        const data = await response.json();
        // Transform the data to match the frontend interface
        const transformed: VPSHealth = {
          cpu: {
            usage: data.cpu.usage_percent || 0,
            cores: data.cpu.cores || 0,
            model: data.cpu.model || 'Unknown'
          },
          memory: {
            total: data.memory.total_gb || 0,
            used: data.memory.used_gb || 0,
            free: data.memory.free_gb || 0,
            percent: data.memory.usage_percent || 0
          },
          disk: (() => {
            const allMounts = data.disk?.all_mounts?.map((mount: any) => ({
              filesystem: mount.mount_point || '',
              size: mount.total_gb || 0,
              used: mount.used_gb || 0,
              available: mount.available_gb || 0,
              percent: mount.usage_percent || 0,
              mount: mount.mount_point || ''
            })) || [];
            // Ensure root filesystem (/) is first for display
            const rootMount = allMounts.find(m => m.mount === '/');
            const otherMounts = allMounts.filter(m => m.mount !== '/');
            return rootMount ? [rootMount, ...otherMounts] : allMounts;
          })(),
          network: {
            status: data.network_health?.status || 'unknown',
            interfaces: data.network?.interfaces?.map((iface: any) => ({
              name: iface.interface || '',
              status: 'active',
              rx_bytes: iface.rx_bytes || 0,
              tx_bytes: iface.tx_bytes || 0
            })) || []
          },
          temperature: data.temperature?.available ? {
            current: data.temperature.current || 0,
            critical: data.temperature.critical || 100
          } : undefined,
          uptime: data.uptime?.uptime_seconds || 0,
          load_average: [
            data.load?.load_1min || 0,
            data.load?.load_5min || 0,
            data.load?.load_15min || 0
          ]
        };
        setVpsHealth(transformed);
      }
    } catch (error) {
      console.error('Failed to load VPS health:', error);
    } finally {
      setHealthLoading(false);
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

      {/* VPS Health Monitoring */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>VPS Health Monitor</CardTitle>
                <CardDescription>
                  Real-time system metrics from Master Controller VPS
                </CardDescription>
              </div>
              {vpsHealth && (
                <Badge
                  variant="outline"
                  className={
                    vpsHealth.cpu.usage > 90 || vpsHealth.memory.percent > 90
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-green-50 text-green-700 border-green-200'
                  }
                >
                  {vpsHealth.cpu.usage > 90 || vpsHealth.memory.percent > 90 ? 'Warning' : 'Healthy'}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {healthLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">Loading health metrics...</p>
              </div>
            ) : vpsHealth ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* CPU Usage */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${
                      vpsHealth.cpu.usage > 90 ? 'bg-red-500/10' :
                      vpsHealth.cpu.usage > 70 ? 'bg-yellow-500/10' :
                      'bg-green-500/10'
                    }`}>
                      <Cpu className={`w-4 h-4 ${
                        vpsHealth.cpu.usage > 90 ? 'text-red-500' :
                        vpsHealth.cpu.usage > 70 ? 'text-yellow-500' :
                        'text-green-500'
                      }`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">CPU Usage</p>
                      <motion.p
                        key={vpsHealth.cpu.usage}
                        initial={{ scale: 1.1, color: 'hsl(var(--primary))' }}
                        animate={{ scale: 1, color: 'hsl(var(--foreground))' }}
                        className="text-lg font-bold"
                      >
                        {vpsHealth.cpu.usage.toFixed(1)}%
                      </motion.p>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${vpsHealth.cpu.usage}%` }}
                      transition={{ duration: 0.5 }}
                      className={`h-full ${
                        vpsHealth.cpu.usage > 90 ? 'bg-red-500' :
                        vpsHealth.cpu.usage > 70 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{vpsHealth.cpu.cores} cores</p>
                </div>

                {/* Memory Usage */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${
                      vpsHealth.memory.percent > 90 ? 'bg-red-500/10' :
                      vpsHealth.memory.percent > 70 ? 'bg-yellow-500/10' :
                      'bg-blue-500/10'
                    }`}>
                      <MemoryStick className={`w-4 h-4 ${
                        vpsHealth.memory.percent > 90 ? 'text-red-500' :
                        vpsHealth.memory.percent > 70 ? 'text-yellow-500' :
                        'text-blue-500'
                      }`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Memory</p>
                      <motion.p
                        key={vpsHealth.memory.percent}
                        initial={{ scale: 1.1, color: 'hsl(var(--primary))' }}
                        animate={{ scale: 1, color: 'hsl(var(--foreground))' }}
                        className="text-lg font-bold"
                      >
                        {vpsHealth.memory.percent.toFixed(1)}%
                      </motion.p>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${vpsHealth.memory.percent}%` }}
                      transition={{ duration: 0.5 }}
                      className={`h-full ${
                        vpsHealth.memory.percent > 90 ? 'bg-red-500' :
                        vpsHealth.memory.percent > 70 ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(vpsHealth.memory.used || 0).toFixed(1)} / {(vpsHealth.memory.total || 0).toFixed(1)} GB
                  </p>
                </div>

                {/* Disk Usage */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${
                      vpsHealth.disk[0]?.percent > 90 ? 'bg-red-500/10' :
                      vpsHealth.disk[0]?.percent > 70 ? 'bg-yellow-500/10' :
                      'bg-orange-500/10'
                    }`}>
                      <HardDrive className={`w-4 h-4 ${
                        vpsHealth.disk[0]?.percent > 90 ? 'text-red-500' :
                        vpsHealth.disk[0]?.percent > 70 ? 'text-yellow-500' :
                        'text-orange-500'
                      }`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Disk Usage</p>
                      <motion.p
                        key={vpsHealth.disk[0]?.percent}
                        initial={{ scale: 1.1, color: 'hsl(var(--primary))' }}
                        animate={{ scale: 1, color: 'hsl(var(--foreground))' }}
                        className="text-lg font-bold"
                      >
                        {vpsHealth.disk[0]?.percent?.toFixed(1) || 0}%
                      </motion.p>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${vpsHealth.disk[0]?.percent || 0}%` }}
                      transition={{ duration: 0.5 }}
                      className={`h-full ${
                        (vpsHealth.disk[0]?.percent || 0) > 90 ? 'bg-red-500' :
                        (vpsHealth.disk[0]?.percent || 0) > 70 ? 'bg-yellow-500' :
                        'bg-orange-500'
                      }`}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(vpsHealth.disk[0]?.used || 0).toFixed(1)} / {(vpsHealth.disk[0]?.size || 0).toFixed(1)} GB
                  </p>
                </div>

                {/* Network & Temperature */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${
                      vpsHealth.network.status === 'healthy' ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`}>
                      <Network className={`w-4 h-4 ${
                        vpsHealth.network.status === 'healthy' ? 'text-green-500' : 'text-red-500'
                      }`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Network</p>
                      <p className="text-lg font-bold capitalize">{vpsHealth.network.status}</p>
                    </div>
                  </div>

                  {vpsHealth.temperature && (
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${
                        vpsHealth.temperature.current > (vpsHealth.temperature.critical * 0.8) ? 'bg-red-500/10' : 'bg-cyan-500/10'
                      }`}>
                        <Thermometer className={`w-4 h-4 ${
                          vpsHealth.temperature.current > (vpsHealth.temperature.critical * 0.8) ? 'text-red-500' : 'text-cyan-500'
                        }`} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">CPU Temp</p>
                        <p className="text-lg font-bold">{vpsHealth.temperature.current.toFixed(1)}°C</p>
                      </div>
                    </div>
                  )}

                  {(vpsHealth.cpu.usage > 90 || vpsHealth.memory.percent > 90 || (vpsHealth.disk[0]?.percent || 0) > 90) && (
                    <div className="flex items-center gap-2 mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      <p className="text-xs text-yellow-800">High resource usage detected</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Unable to load VPS health metrics</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* VM Management */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
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
                          key={vm.vm_id || vm.id || `vm-${index}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-b hover:bg-muted/50 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {vm.id ? vm.id.slice(0, 8) : 'N/A'}
                            </code>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-sm font-medium">{vm.user_email || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{vm.user_id ? vm.user_id.slice(0, 8) : 'N/A'}</p>
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
                              onClick={() => handleDestroyVM(vm.vm_id)}
                              disabled={destroying === vm.vm_id}
                              className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              {destroying === vm.vm_id ? (
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
