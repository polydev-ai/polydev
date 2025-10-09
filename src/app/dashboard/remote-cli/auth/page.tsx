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
          {session && (
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
                <CardTitle>Creating Your Secure Environment</CardTitle>
                <CardDescription>
                  We're spinning up a dedicated VM for your {getProviderName(provider!)} CLI tool
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <p className="text-sm">Allocating resources...</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <p className="text-sm">Configuring network...</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <p className="text-sm">Initializing CLI environment...</p>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground text-center">
                      This usually takes 15-30 seconds
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
                        {vmInfo.vm_id.slice(0, 12)}...
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
                        <p className="font-medium mb-1">Authenticate with {getProviderName(provider!)}</p>
                        <p className="text-sm text-muted-foreground mb-3">
                          Complete the OAuth authentication below. The browser will open inside this page.
                        </p>
                        {!showBrowser ? (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => setShowBrowser(true)}
                          >
                            Start Authentication
                            <Terminal className="w-3 h-3 ml-2" />
                          </Button>
                        ) : (
                          <div className="border-2 border-primary rounded-lg overflow-hidden bg-background">
                            <div className="flex items-center justify-between px-3 py-2 bg-muted border-b">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Shield className="w-3 h-3" />
                                <span className="font-mono">{vmInfo.ip_address}:8080</span>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setShowBrowser(false)}
                                className="h-6 px-2"
                              >
                                Close
                              </Button>
                            </div>
                            <iframe
                              src={`http://${vmInfo.ip_address}:8080/auth/${provider}`}
                              className="w-full h-[600px] bg-white"
                              title="Authentication Browser"
                              sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {showBrowser && (
                      <>
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                            2
                          </div>
                          <div>
                            <p className="font-medium mb-1">Complete the OAuth flow in the browser above</p>
                            <p className="text-sm text-muted-foreground">
                              Log in with your {getProviderName(provider!)} account and authorize access
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
                              Once you authorize, credentials will be securely stored and the page will advance
                            </p>
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
                <CardTitle>Authenticating...</CardTitle>
                <CardDescription>
                  Verifying your credentials and setting up secure access
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-sm text-muted-foreground">This should only take a few moments</p>
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
