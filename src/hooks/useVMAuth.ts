import { useState } from 'react';

interface AuthSession {
  session_id: string;
  status: string;
  provider: string;
  created_at: string;
  completed_at?: string;
  error?: string;
}

export function useVMAuth() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startAuth = async (provider: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/vm/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start authentication');
      }

      const data = await response.json();
      setSession(data.session);
      return data.session;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const checkAuthStatus = async (sessionId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/vm/auth?sessionId=${sessionId}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to check auth status');
      }

      const data = await response.json();
      setSession(data.session);
      return data.session;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    session,
    loading,
    error,
    startAuth,
    checkAuthStatus,
  };
}
