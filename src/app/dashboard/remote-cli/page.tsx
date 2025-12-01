'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Server,
  Zap,
  Shield,
  Code2,
  Terminal,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Clock,
  Activity,
  Monitor,
  XCircle,
  Plus
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Image from 'next/image';

interface Provider {
  id: string;
  name: string;
  description: string;
  logo: string;
  color: string;
  available: boolean;
  connected?: boolean;
  completedAt?: string | null;
}

interface OAuthStatus {
  [key: string]: {
    completed: boolean;
    completedAt: string | null;
  };
}

interface ActiveSession {
  sessionId: string;
  provider: string;
  status: string;
  browserIP: string;
  browserVMId: string;
  novncURL: string;
  createdAt: string;
  isActive: boolean;
}

const baseProviders: Provider[] = [
  {
    id: 'claude_code',
    name: 'Claude Code',
    description: 'Anthropic\'s Claude AI with code understanding',
    logo: 'https://models.dev/logos/anthropic.svg',
    color: 'from-purple-500 to-pink-500',
    available: true,
  },
  {
    id: 'codex',
    name: 'OpenAI Codex',
    description: 'OpenAI\'s powerful code generation model',
    logo: 'https://models.dev/logos/openai.svg',
    color: 'from-green-500 to-emerald-500',
    available: true,
  },
  {
    id: 'gemini_cli',
    name: 'Google Gemini',
    description: 'Google\'s multimodal AI assistant',
    logo: 'https://models.dev/logos/google.svg',
    color: 'from-blue-500 to-cyan-500',
    available: true,
  },
];

export default function RemoteCLIDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [vmStatus, setVmStatus] = useState<any>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [providers, setProviders] = useState<Provider[]>(baseProviders);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [loadingActiveSessions, setLoadingActiveSessions] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadVMStatus();
    loadOAuthStatus();
    loadActiveSessions();
    const interval = setInterval(() => {
      loadVMStatus();
      loadOAuthStatus();
      loadActiveSessions();
    }, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const loadVMStatus = async () => {
    try {
      const res = await fetch('/api/vm/status');
      if (res.ok) {
        const data = await res.json();
        setVmStatus(data.vm);
      }
    } catch (error) {
      console.error('Failed to load VM status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOAuthStatus = async () => {
    try {
      const res = await fetch('/api/vm/oauth-status');
      if (res.ok) {
        const oauthStatus: OAuthStatus = await res.json();

        // Merge OAuth status with providers
        const updatedProviders = baseProviders.map(provider => ({
          ...provider,
          connected: oauthStatus[provider.id]?.completed || false,
          completedAt: oauthStatus[provider.id]?.completedAt || null
        }));

        setProviders(updatedProviders);
      }
    } catch (error) {
      console.error('Failed to load OAuth status:', error);
    }
  };

  const loadActiveSessions = async () => {
    try {
      setLoadingActiveSessions(true);

      // First get the current user
      const userRes = await fetch('/api/auth/user');
      if (!userRes.ok) return;

      const userData = await userRes.json();
      if (!userData.user?.id) return;

      setUserId(userData.user.id);

      // Then get their active sessions
      const sessionsRes = await fetch(`/api/vm/auth/sessions/${userData.user.id}`);
      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        setActiveSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Failed to load active sessions:', error);
    } finally {
      setLoadingActiveSessions(false);
    }
  };

  const cancelSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/vm/auth/session/${sessionId}/cancel`, {
        method: 'POST',
      });

      if (res.ok) {
        toast.success('Session cancelled');
        loadActiveSessions();
      } else {
        toast.error('Failed to cancel session');
      }
    } catch (error) {
      console.error('Failed to cancel session:', error);
      toast.error('Failed to cancel session');
    }
  };

  const resumeSession = (session: ActiveSession) => {
    router.push(`/dashboard/remote-cli/auth?session=${session.sessionId}&provider=${session.provider}`);
  };

  const handleConnectProvider = async (providerId: string) => {
    setSelectedProvider(providerId);
    setConnecting(true);

    try {
      console.log('[RACE-FIX] Creating WebRTC offer BEFORE auth session starts');

      // CRITICAL FIX: Create WebRTC offer BEFORE starting auth session
      // This prevents race condition where VM boots and polls for offer before browser creates it

      // Fetch ICE servers
      const iceServersResponse = await fetch('/api/webrtc/ice-servers');
      if (!iceServersResponse.ok) {
        throw new Error('Failed to fetch ICE servers');
      }
      const { iceServers } = await iceServersResponse.json();
      console.log('[RACE-FIX] ICE servers fetched:', iceServers.length);

      // Create RTCPeerConnection
      const pc = new RTCPeerConnection({ iceServers });

      // Create offer
      const offer = await pc.createOffer({
        offerToReceiveVideo: true,
        offerToReceiveAudio: false
      });

      await pc.setLocalDescription(offer);
      console.log('[RACE-FIX] Offer created successfully, SDP type:', offer.type);

      // Collect ICE candidates (wait up to 2 seconds)
      const candidates: RTCIceCandidate[] = [];
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 2000); // Max 2 seconds for ICE gathering

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            candidates.push(event.candidate);
            console.log('[RACE-FIX] ICE candidate collected:', candidates.length);
          } else {
            clearTimeout(timeout);
            resolve();
          }
        };
      });

      console.log('[RACE-FIX] Total ICE candidates collected:', candidates.length);

      // Start auth session WITH the pre-created offer
      const res = await fetch('/api/vm/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerId,
          // Include offer and candidates in the auth start request
          webrtcOffer: {
            offer: pc.localDescription,
            candidates: candidates.map(c => ({
              candidate: c.candidate,
              sdpMLineIndex: c.sdpMLineIndex
            }))
          }
        }),
      });

      if (!res.ok) {
        // Clean up peer connection
        pc.close();
        throw new Error('Failed to start authentication');
      }

      const { sessionId } = await res.json();
      console.log('[RACE-FIX] Auth session started with sessionId:', sessionId);

      // Store peer connection for later use (will be picked up by WebRTCViewer)
      // We'll pass it via URL state or sessionStorage
      sessionStorage.setItem(`webrtc-pc-${sessionId}`, 'created');

      // Clean up this temporary peer connection
      // The actual connection will be managed by WebRTCViewer component
      pc.close();

      // Redirect to auth flow page
      router.push(`/dashboard/remote-cli/auth?session=${sessionId}&provider=${providerId}`);
    } catch (error: any) {
      console.error('[RACE-FIX] Error during provider connection:', error);
      toast.error(error.message || 'Failed to connect provider');
      setConnecting(false);
      setSelectedProvider(null);
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
          <p className="text-muted-foreground">Loading your remote CLI environment...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-7xl space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">Remote CLI Tools</span>
        </div>

        <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Connect Your AI Development Tools
        </h1>

        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Securely connect Claude Code, OpenAI Codex, or Google Gemini CLI tools through your private remote environment
        </p>
      </motion.div>

      {/* VM Status Card */}
      {vmStatus ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <Server className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>Remote Environment Active</CardTitle>
                    <CardDescription>Your VM is running and ready</CardDescription>
                  </div>
                </div>
                <Badge className="bg-green-500 hover:bg-green-600">
                  <Activity className="w-3 h-3 mr-1" />
                  {vmStatus.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                <div>
                  <p className="text-muted-foreground">IP Address</p>
                  <p className="font-mono font-medium">{vmStatus.ip_address}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Provider</p>
                  <p className="font-medium">{vmStatus.provider || 'Not connected'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Active</p>
                  <p className="font-medium">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {new Date(vmStatus.last_heartbeat).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              {vmStatus.provider && (
                <Button
                  onClick={() => router.push(`/dashboard/remote-cli/chat?provider=${vmStatus.provider}`)}
                  className="w-full gap-2"
                >
                  <Terminal className="w-4 h-4" />
                  Open Chat Interface
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="border-dashed border-2">
            <CardHeader className="text-center">
              <Terminal className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <CardTitle>No Active Environment</CardTitle>
              <CardDescription>
                Your remote CLI environment will be created automatically when you connect your first provider
              </CardDescription>
            </CardHeader>
          </Card>
        </motion.div>
      )}

      {/* Active Sessions Section */}
      {activeSessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Monitor className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>Active Sessions ({activeSessions.length})</CardTitle>
                    <CardDescription>Your currently running authentication sessions</CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  <Activity className="w-3 h-3 mr-1" />
                  Multi-VM
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeSessions.map((session) => (
                  <div
                    key={session.sessionId}
                    className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                        <Terminal className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {session.provider === 'claude_code' ? 'Claude Code' :
                           session.provider === 'codex' ? 'OpenAI Codex' :
                           session.provider === 'gemini_cli' ? 'Google Gemini' :
                           session.provider}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {session.browserIP ? `IP: ${session.browserIP}` : 'Starting...'}
                          {session.createdAt && (
                            <span className="ml-2">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {new Date(session.createdAt).toLocaleTimeString()}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          session.status === 'ready' ? 'bg-green-500 hover:bg-green-600' :
                          session.status === 'authenticating' ? 'bg-yellow-500 hover:bg-yellow-600' :
                          'bg-blue-500 hover:bg-blue-600'
                        }
                      >
                        {session.status}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resumeSession(session)}
                        className="gap-1"
                      >
                        <Monitor className="w-3 h-3" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => cancelSession(session.sessionId)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Benefits Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid md:grid-cols-3 gap-6"
      >
        <Card>
          <CardContent className="pt-6">
            <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Secure & Private</h3>
            <p className="text-sm text-muted-foreground">
              Your credentials are encrypted and stored securely. Only you have access to your AI tools.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Lightning Fast</h3>
            <p className="text-sm text-muted-foreground">
              Your VM hibernates when idle and resumes instantly. No waiting time for subsequent requests.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
              <Code2 className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Full CLI Access</h3>
            <p className="text-sm text-muted-foreground">
              Get complete access to Claude Code, Codex, and Gemini CLI tools through our remote interface.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Provider Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <div>
          <h2 className="text-2xl font-bold mb-2">Choose Your AI Provider</h2>
          <p className="text-muted-foreground">
            Select a provider below to connect your CLI tool. You can connect multiple providers.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <AnimatePresence>
            {providers.map((provider, index) => (
              <motion.div
                key={provider.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card className={`relative overflow-hidden cursor-pointer hover:shadow-lg transition-shadow ${
                  selectedProvider === provider.id ? 'ring-2 ring-primary' : ''
                } ${provider.connected ? 'border-green-200 bg-green-50/30 dark:bg-green-950/20' : ''}`}>
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${provider.color}`} />

                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="mb-4 relative w-12 h-12">
                          <Image
                            src={provider.logo}
                            alt={`${provider.name} logo`}
                            fill
                            className="object-contain"
                          />
                        </div>
                        <CardTitle className="text-xl">{provider.name}</CardTitle>
                        <CardDescription className="mt-2">
                          {provider.description}
                        </CardDescription>
                      </div>
                      {provider.connected ? (
                        <Badge className="bg-green-500 hover:bg-green-600">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Connected
                        </Badge>
                      ) : provider.available ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Available
                        </Badge>
                      ) : null}
                    </div>
                  </CardHeader>

                  <CardContent>
                    {provider.connected && provider.completedAt && (
                      <p className="text-xs text-muted-foreground mb-3">
                        Last connected: {new Date(provider.completedAt).toLocaleDateString()}
                      </p>
                    )}
                    <Button
                      className="w-full"
                      onClick={() => handleConnectProvider(provider.id)}
                      disabled={!provider.available || connecting}
                      variant={provider.connected ? 'outline' : 'default'}
                    >
                      {connecting && selectedProvider === provider.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : provider.connected ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Reconnect {provider.name}
                        </>
                      ) : (
                        <>
                          Connect {provider.name}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* How It Works */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
            <CardDescription>A simple 3-step process to connect your AI tools</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                    1
                  </div>
                  <h3 className="font-semibold">Select Provider</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Choose which AI CLI tool you want to connect (Claude Code, Codex, or Gemini)
                </p>
              </div>

              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                    2
                  </div>
                  <h3 className="font-semibold">Authenticate</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  We'll create a secure VM and guide you through the OAuth authentication process
                </p>
              </div>

              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                    3
                  </div>
                  <h3 className="font-semibold">Start Coding</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your CLI tool is ready! Send prompts and get AI-powered code assistance instantly
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
