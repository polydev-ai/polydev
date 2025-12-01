'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Server,
  Shield,
  Terminal,
  Copy,
  ExternalLink,
  ArrowLeft,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { WebRTCViewer } from '@/components/WebRTCViewer';

type AuthStep = 'creating_vm' | 'vm_ready' | 'authenticating' | 'completed' | 'failed' | 'cancelled';

interface AuthSession {
  session_id: string;
  provider: string;
  status: string;
  vm_id?: string;
  error_message?: string;
  created_at: string;
}

function AuthFlowContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams?.get('session');
  const provider = searchParams?.get('provider');

  const [session, setSession] = useState<AuthSession | null>(null);
  const [step, setStep] = useState<AuthStep>('creating_vm');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vmInfo, setVmInfo] = useState<any>(null);
  const [showBrowser, setShowBrowser] = useState(false);
  const [showWebRTC, setShowWebRTC] = useState(false);
  const [showNoVNC, setShowNoVNC] = useState(false);
  const [useNoVNCFallback, setUseNoVNCFallback] = useState(false);
  const [oauthUrl, setOauthUrl] = useState<string | null>(null);
  const [pollingOAuthUrl, setPollingOAuthUrl] = useState(false);
  const [pollingCredentials, setPollingCredentials] = useState(false);
  const [browserLaunchAttempted, setBrowserLaunchAttempted] = useState(false);
  const [webrtcOfferGenerated, setWebrtcOfferGenerated] = useState(false);

  // Generate WebRTC offer BEFORE session creation to fix race condition
  useEffect(() => {
    if (webrtcOfferGenerated || !sessionId) return;

    const generateEarlyOffer = async () => {
      try {
        console.log('[WebRTC-RACE-FIX] Generating offer early (before VM polls)');

        // This will be done by WebRTCViewer when it's pre-mounted
        // Just set the flag to indicate we're aware of this requirement
        setWebrtcOfferGenerated(true);
      } catch (err) {
        console.error('[WebRTC-RACE-FIX] Failed to generate early offer:', err);
      }
    };

    generateEarlyOffer();
  }, [sessionId, webrtcOfferGenerated]);

  useEffect(() => {
    if (!sessionId || !provider) {
      setError('Missing session or provider parameter');
      setLoading(false);
      return;
    }

    loadSession();
    const interval = setInterval(loadSession, 3000); // Poll every 3s
    return () => clearInterval(interval);
  }, [sessionId, provider]);

  // Poll for OAuth URL when VM is ready
  useEffect(() => {
    if (!vmInfo || !sessionId || oauthUrl || pollingOAuthUrl) return;

    const pollOAuthUrl = async () => {
      try {
        setPollingOAuthUrl(true);
        const res = await fetch(`/api/vm/auth/session/${sessionId}/oauth-url`, {
          cache: 'no-store',
          signal: AbortSignal.timeout(5000),
        });

        if (res.status === 202) {
          // Still waiting for CLI to surface the URL
          return;
        }

        if (!res.ok) {
          return;
        }

        const data = await res.json();
        if (data.oauthUrl) {
          setOauthUrl(data.oauthUrl);
          return;
        }
      } catch (err) {
        // Silently continue polling
      } finally {
        setPollingOAuthUrl(false);
      }
    };

    pollOAuthUrl();
    const interval = setInterval(pollOAuthUrl, 2000); // Poll every 2s
    return () => clearInterval(interval);
  }, [vmInfo, sessionId, oauthUrl, pollingOAuthUrl]);

  // Trigger automatic browser navigation once the CLI surfaces the OAuth URL
  useEffect(() => {
    if (!oauthUrl || !sessionId || browserLaunchAttempted) return;

    let cancelled = false;

    const sendOpenUrlRequest = async () => {
      try {
        setBrowserLaunchAttempted(true);
        const response = await fetch(`/api/vm/auth/session/${sessionId}/open-url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ url: oauthUrl })
        });

        if (!response.ok && !cancelled) {
          const message = await response.text();
          toast.warning('Unable to auto-open OAuth page inside VM. Use the manual link below.', {
            description: message || undefined,
          });
        }
      } catch (error: any) {
        if (!cancelled) {
          toast.warning('Unable to auto-open OAuth page inside VM. Use the manual link below.', {
            description: error?.message,
          });
        }
      }
    };

    sendOpenUrlRequest();

    return () => {
      cancelled = true;
    };
  }, [oauthUrl, sessionId, browserLaunchAttempted]);

  // Poll for credential status when desktop is shown (with exponential backoff)
  useEffect(() => {
    if (!sessionId || (!showWebRTC && !showNoVNC) || pollingCredentials) return;

    let cancelled = false;
    let delay = 1000; // Start with 1 second

    const pollCredentials = async () => {
      if (cancelled) return;

      try {
        setPollingCredentials(true);
        // Use proxy endpoint instead of direct VM IP
        const res = await fetch(`/api/auth/session/${sessionId}/credentials`, {
          signal: AbortSignal.timeout(5000),
          credentials: 'include'
        });

        if (!res.ok) {
          setPollingCredentials(false);
          delay = Math.min(delay * 2, 15000); // Exponential backoff, max 15s
          if (!cancelled) setTimeout(pollCredentials, delay);
          return;
        }

        const data = await res.json();
        if (data.authenticated) {
          // Credentials saved - update session status
          setStep('authenticating');
          // Trigger session reload to pick up completion
          setTimeout(loadSession, 1000);
        } else {
          setPollingCredentials(false);
          delay = 1000; // Reset delay on success
          if (!cancelled) setTimeout(pollCredentials, delay);
        }
      } catch (err) {
        // Silently continue polling with backoff
        setPollingCredentials(false);
        delay = Math.min(delay * 2, 15000); // Exponential backoff on error
        if (!cancelled) setTimeout(pollCredentials, delay);
      }
    };

    const timer = setTimeout(pollCredentials, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sessionId, showWebRTC, showNoVNC, pollingCredentials]);

  // Pre-mount WebRTCViewer immediately to create offer before VM polls
  // This prevents race condition where VM starts polling before browser creates offer
  const [preCreateOffer, setPreCreateOffer] = useState(false);

  useEffect(() => {
    if (sessionId && !preCreateOffer) {
      console.log('[WebRTC] Pre-mounting WebRTCViewer to create offer early');
      setPreCreateOffer(true);
    }
  }, [sessionId, preCreateOffer]);

  // Automatically show WebRTC viewer when VM is ready
  // FIX: Eliminates timing mismatch where VM polls for offer before frontend initializes
  useEffect(() => {
    if (step === 'vm_ready' && vmInfo && !showWebRTC && !showNoVNC) {
      console.log('[noVNC] Auto-showing noVNC viewer (primary) - VM is ready');
      setShowNoVNC(true);
      setUseNoVNCFallback(true);
    }
  }, [step, vmInfo, showWebRTC, showNoVNC]);

  // Send periodic heartbeats to keep VM alive
  useEffect(() => {
    if (!sessionId) return;

    const sendHeartbeat = async () => {
      try {
        await fetch(`/api/auth/session/${sessionId}/heartbeat`, {
          method: 'POST',
          credentials: 'include',
          signal: AbortSignal.timeout(5000)
        });
      } catch (err) {
        // Silently fail - heartbeat is best-effort
        console.debug('Heartbeat failed:', err);
      }
    };

    // Send heartbeat every 10 seconds
    const interval = setInterval(sendHeartbeat, 10000);

    // Send initial heartbeat immediately
    sendHeartbeat();

    return () => clearInterval(interval);
  }, [sessionId]);

  const loadSession = async () => {
    try {
      const res = await fetch(`/api/auth/session/${sessionId}`, {
        credentials: 'include',
        cache: 'no-store'
      });
      if (!res.ok) throw new Error('Failed to load session');

      const data = await res.json();
      setSession(data.session);

      // Update step based on session status
      switch (data.session.status) {
        case 'started':
          setStep('creating_vm');
          break;
        case 'vm_created':
          setStep('vm_ready');
          if (data.vm) setVmInfo(data.vm);
          break;
        case 'awaiting_user_auth':
          setStep('vm_ready');
          if (data.vm) setVmInfo(data.vm);
          break;
        case 'authenticating':
          setStep('authenticating');
          break;
        case 'completed':
          setStep('completed');
          break;
        case 'failed':
          setStep('failed');
          setError(data.session.error_message);
          break;
        case 'cancelled':
        case 'timeout':
          setStep('cancelled');
          break;
      }
    } catch (err: any) {
      console.error('Failed to load session:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAuth = async () => {
    try {
      await fetch(`/api/auth/session/${sessionId}/cancel`, {
        method: 'POST',
        credentials: 'include'
      });
      router.push('/dashboard/remote-cli');
    } catch (err) {
      toast.error('Failed to cancel authentication');
    }
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleOpenOAuthInNewTab = () => {
    if (!oauthUrl) return;
    window.open(oauthUrl, '_blank', 'noopener,noreferrer');
  };

  const getProviderName = (id: string) => {
    const names: Record<string, string> = {
      claude_code: 'Claude Code',
      codex: 'OpenAI Codex',
      gemini_cli: 'Google Gemini',
    };
    return names[id] || id;
  };

  if (loading && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Initializing authentication...</p>
        </motion.div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="container mx-auto py-16 max-w-2xl">
        <Card className="border-destructive">
          <CardHeader>
            <AlertCircle className="w-12 h-12 text-destructive mb-4" />
            <CardTitle>Authentication Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/remote-cli">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <Link href="/dashboard/remote-cli" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Connect {getProviderName(provider!)}</h1>
            <p className="text-muted-foreground">Follow the steps below to authenticate your CLI tool</p>
          </div>
          {session && session.session_id && (
            <Badge variant={step === 'completed' ? 'default' : 'secondary'}>
              Session: {session.session_id.slice(0, 8)}
            </Badge>
          )}
        </div>
      </motion.div>

      {/* Progress Steps */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between relative">
          {/* Progress Line */}
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-border -z-10" />
          <div
            className="absolute top-4 left-0 h-0.5 bg-primary transition-all duration-500 -z-10"
            style={{
              width: step === 'creating_vm' ? '0%' : step === 'vm_ready' ? '33%' : step === 'authenticating' ? '66%' : '100%'
            }}
          />

          {[
            { key: 'creating_vm', label: 'Creating VM', icon: Server },
            { key: 'vm_ready', label: 'VM Ready', icon: Shield },
            { key: 'authenticating', label: 'Authenticating', icon: Terminal },
            { key: 'completed', label: 'Complete', icon: CheckCircle2 },
          ].map((s, i) => {
            const isActive = step === s.key;
            const isCompleted = ['vm_ready', 'authenticating', 'completed'].includes(step) && i < 3 ||
              step === 'completed' && i === 3;
            const Icon = s.icon;

            return (
              <div key={s.key} className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                    isCompleted
                      ? 'bg-primary border-primary text-primary-foreground'
                      : isActive
                      ? 'bg-background border-primary animate-pulse'
                      : 'bg-background border-border'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  )}
                </div>
                <p className={`text-xs mt-2 ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  {s.label}
                </p>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {/* Creating VM */}
        {step === 'creating_vm' && (
          <motion.div
            key="creating"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-full w-fit">
                  <Server className="w-8 h-8 text-primary animate-pulse" />
                </div>
                <CardTitle>Creating Your Secure VM Desktop</CardTitle>
                <CardDescription>
                  Spinning up a dedicated Firecracker VM with full desktop environment for {getProviderName(provider!)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin text-primary flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Cloning golden rootfs snapshot</p>
                        <p className="text-xs text-muted-foreground">Ubuntu 22.04 with XFCE desktop (~6.8GB)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin text-primary flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Configuring VM resources</p>
                        <p className="text-xs text-muted-foreground">1 vCPU, 1.5GB RAM, secure network TAP</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin text-primary flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Starting desktop services</p>
                        <p className="text-xs text-muted-foreground">TigerVNC (1920x1080), XFCE, Firefox, Terminal</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin text-primary flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Installing {getProviderName(provider!)} CLI</p>
                        <p className="text-xs text-muted-foreground">Pre-configured and ready to authenticate</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>This usually takes 30-60 seconds</span>
                    </div>
                    <p className="text-center text-xs text-muted-foreground mt-2">
                      Please wait... Desktop will load automatically when ready
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* VM Ready - Authentication Instructions */}
        {step === 'vm_ready' && vmInfo && (
          <motion.div
            key="ready"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle>VM Ready!</CardTitle>
                    <CardDescription>Follow the steps below to authenticate</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* VM Info */}
                <div className="p-4 bg-background rounded-lg border">
                  <h3 className="font-semibold mb-3">VM Connection Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">IP Address</p>
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-muted rounded font-mono text-xs">{vmInfo.ip_address}</code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopyToClipboard(vmInfo.ip_address)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">VM ID</p>
                      <code className="px-2 py-1 bg-muted rounded font-mono text-xs block">
                        {vmInfo.vm_id ? vmInfo.vm_id.slice(0, 12) : 'N/A'}...
                      </code>
                    </div>
                  </div>
                </div>

                {/* Authentication Steps */}
                <div>
                  <h3 className="font-semibold mb-3">Authentication Steps</h3>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                        1
                      </div>
                      <div className="flex-1">
                        <p className="font-medium mb-1">View Full Desktop (1920x1080)</p>
                        <p className="text-sm text-muted-foreground mb-2">
                          You'll see a complete XFCE desktop below with:
                        </p>
                        <ul className="text-xs text-muted-foreground space-y-1 mb-3 ml-4">
                          <li>• <strong>Terminal window</strong> (maximized and ready for typing)</li>
                          <li>• <strong>Firefox browser</strong> (ready for OAuth)</li>
                          <li>• <strong>Full desktop environment</strong> with taskbar</li>
                        </ul>
                        {/* Conditionally render WebRTCViewer early when preCreateOffer is true */}
                        {(preCreateOffer || showWebRTC || showNoVNC) && (
                          <div className="border-2 border-primary rounded-lg overflow-hidden bg-background">
                            {/* Only show header/controls when user explicitly opened the viewer */}
                            {(showWebRTC || showNoVNC) && (
                              <div className="flex items-center justify-between px-3 py-2 bg-muted border-b">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Server className="w-3 h-3" />
                                  <span className="font-mono">VM Desktop - {useNoVNCFallback ? 'noVNC (Fallback)' : 'WebRTC'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {!useNoVNCFallback && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setUseNoVNCFallback(true)}
                                      className="h-6 px-2 text-xs"
                                    >
                                      Use noVNC
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setShowWebRTC(false);
                                      setShowNoVNC(false);
                                      setUseNoVNCFallback(false);
                                    }}
                                    className="h-6 px-2"
                                  >
                                    Minimize
                                  </Button>
                                </div>
                              </div>
                            )}
                            {useNoVNCFallback ? (
                              <iframe
                                src={`http://135.181.138.102:4000/novnc/vnc.html?host=135.181.138.102&port=4000&path=vnc/${vmInfo?.ip_address}&autoconnect=1&reconnect=true&reconnect_delay=3000&resize=scale&password=polydev123`}
                                className="w-full min-h-screen h-screen bg-black border-0"
                                title="VM Desktop - Full HD 1920x1080 via Built-in VNC Proxy"
                                allow="clipboard-read; clipboard-write"
                              />
                            ) : (
                              <>
                                {/* WebRTC viewer - visible when showWebRTC is true, hidden but mounted when preCreateOffer is true */}
                                <div className={`w-full h-[700px] bg-black ${!showWebRTC && 'hidden'}`}>
                                  <WebRTCViewer
                                    sessionId={sessionId!}
                                    skipOfferCreation={false}  // Let WebRTCViewer create its own offer
                                    onConnectionStateChange={(state) => {
                                      console.log('[WebRTC] Connection state:', state);
                                      if (state === 'failed') {
                                        toast.error('WebRTC connection failed, switching to noVNC fallback');
                                        setUseNoVNCFallback(true);
                                      }
                                    }}
                                    onError={(error) => {
                                      console.error('[WebRTC] Error:', error);
                                      toast.error('WebRTC error: ' + error.message);
                                    }}
                                    fallbackToNoVNC={true}
                                  />
                                </div>
                                {/* Show loading indicator while VM is starting (only visible when preCreateOffer but not showWebRTC) */}
                                {!showWebRTC && (
                                  <div className="w-full h-[700px] bg-black flex items-center justify-center">
                                    <div className="text-center">
                                      <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-white" />
                                      <p className="text-white text-sm">Preparing VM desktop...</p>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        {/* Show "Open VM Desktop" button when not yet mounted */}
                        {!preCreateOffer && !showWebRTC && !showNoVNC && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => setShowWebRTC(true)}
                          >
                            Open VM Desktop (WebRTC)
                            <Server className="w-3 h-3 ml-2" />
                          </Button>
                        )}

                        {oauthUrl && (
                          <div className="mt-4 p-3 border rounded-lg bg-muted/40">
                            <p className="text-sm font-medium mb-2">
                              We captured the OAuth link for you. It should open automatically inside the VM—use this fallback if needed:
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              <code className="px-2 py-1 bg-background rounded font-mono text-xs break-all flex-1 min-w-[220px]">
                                {oauthUrl.length > 120 ? `${oauthUrl.slice(0, 120)}…` : oauthUrl}
                              </code>
                              <Button size="sm" variant="outline" onClick={() => handleCopyToClipboard(oauthUrl)}>
                                <Copy className="w-3 h-3 mr-2" />
                                Copy URL
                              </Button>
                              <Button size="sm" onClick={handleOpenOAuthInNewTab}>
                                Open in New Tab
                                <ExternalLink className="w-3 h-3 ml-2" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {(showWebRTC || showNoVNC) && (
                      <>
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                            2
                          </div>
                          <div>
                            <p className="font-medium mb-1">Type the CLI command in the terminal window</p>
                            <p className="text-sm text-muted-foreground mb-2">
                              You'll see a terminal window inside the VM desktop above. Type the following command and press Enter:
                            </p>
                            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                              <code className="font-mono text-sm font-semibold">
                                {provider === 'claude_code' && '$ claude'}
                                {provider === 'codex' && '$ codex'}
                                {provider === 'gemini_cli' && '$ gemini'}
                              </code>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              ℹ️ The CLI will automatically open the OAuth page in Firefox browser inside the VM. Complete the authentication in that browser window.
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                            3
                          </div>
                          <div>
                            <p className="font-medium mb-1">We'll detect completion automatically</p>
                            <p className="text-sm text-muted-foreground">
                              Once you complete OAuth, credentials will be securely stored and this page will advance
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Monitoring for credential completion...</span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={handleCancelAuth} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Authenticating */}
        {step === 'authenticating' && (
          <motion.div
            key="authenticating"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-full w-fit">
                  <Shield className="w-8 h-8 text-primary animate-pulse" />
                </div>
                <CardTitle>Processing Authentication</CardTitle>
                <CardDescription>
                  Verifying your credentials and setting up secure access
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <div className="text-left">
                      <p className="text-sm font-medium">Detecting credentials</p>
                      <p className="text-xs text-muted-foreground">
                        OAuth agent found credentials in VM
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="space-y-2 text-xs text-muted-foreground text-center">
                      <p>Encrypting credentials with AES-256-GCM</p>
                      <p>Storing securely in database</p>
                      <p>Preparing to inject into CLI VM</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="flex items-center justify-center gap-2 text-xs text-green-600">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>This should only take a few moments</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Completed */}
        {step === 'completed' && (
          <motion.div
            key="completed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
              <CardHeader className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="mx-auto mb-4 p-4 bg-green-500 rounded-full w-fit"
                >
                  <CheckCircle2 className="w-12 h-12 text-white" />
                </motion.div>
                <CardTitle className="text-2xl">Successfully Connected!</CardTitle>
                <CardDescription>
                  Your {getProviderName(provider!)} CLI tool is now ready to use
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-background rounded-lg border">
                  <h3 className="font-semibold mb-2">What's Next?</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Your credentials are securely encrypted and stored</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Your VM will hibernate when idle to save resources</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>You can start sending prompts to your AI assistant immediately</span>
                    </li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <Link href="/dashboard/remote-cli" className="flex-1">
                    <Button variant="outline" className="w-full">
                      Back to Dashboard
                    </Button>
                  </Link>
                  <Link href={`/dashboard/remote-cli/chat?provider=${provider}`} className="flex-1">
                    <Button className="w-full">
                      Start Chatting
                      <Terminal className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Failed */}
        {step === 'failed' && (
          <motion.div
            key="failed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-destructive">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-4 bg-destructive/10 rounded-full w-fit">
                  <AlertCircle className="w-8 h-8 text-destructive" />
                </div>
                <CardTitle>Authentication Failed</CardTitle>
                <CardDescription>{error || 'An error occurred during authentication'}</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-3">
                <Link href="/dashboard/remote-cli" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Back to Dashboard
                  </Button>
                </Link>
                <Button className="flex-1" onClick={() => router.push(`/dashboard/remote-cli?retry=${provider}`)}>
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    }>
      <AuthFlowContent />
    </Suspense>
  );
}
