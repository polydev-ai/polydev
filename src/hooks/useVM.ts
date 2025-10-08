import { useEffect, useState } from 'react';

interface VM {
  vm_id: string;
  user_id: string;
  status: string;
  provider: string;
  ip_address: string;
  created_at: string;
  last_heartbeat: string;
  cpu_usage_percent?: number;
  memory_usage_mb?: number;
}

export function useVM() {
  const [vm, setVM] = useState<VM | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVM = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/vm/status');
      if (!response.ok) {
        throw new Error('Failed to fetch VM status');
      }

      const data = await response.json();
      setVM(data.vm || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVM();
    const interval = setInterval(fetchVM, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const createVM = async (provider: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/vm/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create VM');
      }

      const data = await response.json();
      setVM(data.vm);
      return data.vm;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const hibernateVM = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/vm/hibernate', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to hibernate VM');
      }

      await fetchVM();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resumeVM = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/vm/resume', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to resume VM');
      }

      await fetchVM();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const destroyVM = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/vm/destroy', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to destroy VM');
      }

      setVM(null);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    vm,
    loading,
    error,
    createVM,
    hibernateVM,
    resumeVM,
    destroyVM,
    refresh: fetchVM,
  };
}
