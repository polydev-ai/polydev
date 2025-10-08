'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, RefreshCw } from 'lucide-react';

interface VM {
  vm_id: string;
  user_id: string;
  vps_host: string;
  vm_type: string;
  ip_address: string;
  status: string;
  vcpu_count: number;
  memory_mb: number;
  created_at: string;
  uptime_seconds: number;
  cpu_usage_percent: number;
  memory_usage_mb: number;
  users: {
    email: string;
    subscription_plan: string;
    status: string;
  };
}

export default function AdminVMsPage() {
  const [vms, setVMs] = useState<VM[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchVMs();
  }, [page, statusFilter]);

  const fetchVMs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '50',
        ...(statusFilter && { status: statusFilter })
      });

      const response = await fetch(`/api/admin/vms?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch VMs');
      }

      const data = await response.json();
      setVMs(data.vms);
      setTotalPages(data.pagination.totalPages);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'stopped': return 'bg-gray-500';
      case 'starting': return 'bg-yellow-500';
      case 'stopping': return 'bg-orange-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Virtual Machines</h1>
          <p className="text-muted-foreground">Manage all user VMs</p>
        </div>
        <Button onClick={fetchVMs} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by user email or VM ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="stopped">Stopped</SelectItem>
                <SelectItem value="starting">Starting</SelectItem>
                <SelectItem value="stopping">Stopping</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* VMs Table */}
      <Card>
        <CardHeader>
          <CardTitle>VMs ({vms.length})</CardTitle>
          <CardDescription>All virtual machines in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-red-600 py-8 text-center">{error}</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>VM ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Host</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Resources</TableHead>
                    <TableHead>Uptime</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vms.map((vm) => (
                    <TableRow key={vm.vm_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{vm.users.email}</p>
                          <Badge variant="outline" className="text-xs">
                            {vm.users.subscription_plan}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs">{vm.vm_id.slice(0, 8)}...</code>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(vm.status)}>
                          {vm.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{vm.vm_type}</TableCell>
                      <TableCell className="font-mono text-xs">{vm.vps_host}</TableCell>
                      <TableCell className="font-mono text-xs">{vm.ip_address || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <p>CPU: {vm.cpu_usage_percent.toFixed(1)}%</p>
                          <p>RAM: {vm.memory_usage_mb.toFixed(0)}MB</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {vm.status === 'running' ? formatUptime(vm.uptime_seconds) : 'N/A'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(vm.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    variant="outline"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    variant="outline"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
