'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import PolydevLogo from '../../../components/PolydevLogo';

interface AuthSession {
  session_id: string;
  provider: string;
  status: string;
  vnc_url: string | null;
  created_at: string;
}

export default function BrowserAuthPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<AuthSession | null>(null);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Poll for session status
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/auth/session/${sessionId}`);
        if (!res.ok) {
          throw new Error('Failed to fetch session');
        }
        const data = await res.json();
        setSession(data.session);
        setLoading(false);

        // Stop polling if completed
        if (data.session.status === 'completed') {
          clearInterval(interval);
        }
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchSession();
    const interval = setInterval(fetchSession, 2000);

    return () => clearInterval(interval);
  }, [sessionId]);

  const handleCompleted = async () => {
    setCompleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/auth/session/${sessionId}/complete`, {
        method: 'POST'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to complete authentication');
      }

      const data = await res.json();
      if (data.success) {
        // Redirect to dashboard after brief delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading authentication session...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center">
                <PolydevLogo size={80} className="text-slate-900" />
                <span className="font-semibold text-2xl -ml-3">Polydev</span>
              </Link>
            </div>
          </div>
        </nav>

        <div className="pt-32 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Session Error</h1>
                <p className="text-slate-600 mb-6">{error || 'Session not found or has expired'}</p>
                <Link
                  href="/dashboard"
                  className="inline-block px-6 py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Return to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (session.status === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center">
                <PolydevLogo size={80} className="text-slate-900" />
                <span className="font-semibold text-2xl -ml-3">Polydev</span>
              </Link>
            </div>
          </div>
        </nav>

        <div className="pt-32 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Authentication Complete!</h1>
                <p className="text-slate-600 mb-6">
                  Your <span className="font-semibold">{session.provider}</span> credentials have been configured.
                  You can now use your CLI tool.
                </p>
                <Link
                  href="/dashboard"
                  className="inline-block px-6 py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Return to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (session.status === 'awaiting_user_auth' && session.vnc_url) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center">
                <PolydevLogo size={80} className="text-slate-900" />
                <span className="font-semibold text-2xl -ml-3">Polydev</span>
              </Link>
            </div>
          </div>
        </nav>

        <div className="pt-24 px-4 sm:px-6 lg:px-8 pb-12">
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              {/* Header */}
              <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-8 py-6">
                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                  Authenticate to {session.provider === 'claude_code' ? 'Claude Code' :
                    session.provider === 'codex' ? 'Codex CLI' :
                    session.provider === 'gemini_cli' ? 'Gemini CLI' : session.provider}
                </h1>
                <p className="text-slate-600">
                  Complete authentication in the browser below. After you've logged in successfully,
                  click the <span className="font-semibold">"I've Completed Authentication"</span> button.
                </p>
              </div>

              {/* VNC Viewer */}
              <div className="p-6">
                <div className="bg-slate-900 rounded-xl overflow-hidden shadow-2xl border-4 border-slate-200">
                  <iframe
                    src={session.vnc_url}
                    className="w-full aspect-video"
                    style={{ minHeight: '600px' }}
                    title="Browser Authentication"
                  />
                </div>

                {/* Instructions */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-blue-900">
                      <p className="font-semibold mb-1">Instructions:</p>
                      <ol className="list-decimal list-inside space-y-1 text-blue-800">
                        <li>Click inside the browser window above to interact with it</li>
                        <li>Complete the authentication process (login, authorize, etc.)</li>
                        <li>Once you see the success page, click the button below</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-sm text-red-900">
                        <p className="font-semibold">Error:</p>
                        <p className="text-red-800">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Complete Button */}
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={handleCompleted}
                    disabled={completing}
                    className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                  >
                    {completing ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      "✓ I've Completed Authentication"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Unknown status
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="text-center">
        <p className="text-slate-600">Unknown session status: {session.status}</p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block text-slate-900 hover:underline"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
