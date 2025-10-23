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
  Activity
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
  lastChecked?: string;
}

interface CLIStatus {
  claude_code: {
    available: boolean;
    status: string;
    enabled: boolean;
    last_checked_at: string | null;
  } | null;
  codex_cli: {
    available: boolean;
    status: string;
    enabled: boolean;
    last_checked_at: string | null;
  } | null;
  gemini_cli: {
    available: boolean;
    status: string;
    enabled: boolean;
    last_checked_at: string | null;
  } | null;
}

const providers: Provider[] = [
  {
    id: 'claude_code',
    name: 'Claude Code',
    description: 'Anthropic\'s Claude AI with code understanding',
    logo: 'https://models.dev/logos/anthropic.svg',
    color: 'from-purple-500 to-pink-500',
    available: true,
  },
  {
    id: 'codex_cli',
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
  const [cliStatus, setCliStatus] = useState<CLIStatus | null>(null);
  const [providersWithStatus, setProvidersWithStatus] = useState<Provider[]>(providers);

  useEffect(() => {
    loadVMStatus();
    loadCLIStatus();
    const interval = setInterval(() => {
      loadVMStatus();
      loadCLIStatus();
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

  const loadCLIStatus = async () => {
    try {
      const res = await fetch('/api/cli-status');
      if (res.ok) {
        const data: CLIStatus = await res.json();
        setCliStatus(data);

        // Merge CLI status with providers
        const updatedProviders = providers.map(provider => {
          const status = data[provider.id as keyof CLIStatus];
          return {
            ...provider,
            connected: status?.enabled && status?.status === 'available',
            lastChecked: status?.last_checked_at || undefined
          };
        });
        setProvidersWithStatus(updatedProviders);
      }
    } catch (error) {
      console.error('Failed to load CLI status:', error);
    }
  };

  const handleConnectProvider = async (providerId: string) => {
    setSelectedProvider(providerId);
    setConnecting(true);

    try {
      // Start auth session
      const res = await fetch('/api/vm/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId }),
      });

      if (!res.ok) {
        throw new Error('Failed to start authentication');
      }

      const { sessionId } = await res.json();

      // Redirect to auth flow page
      router.push(`/dashboard/remote-cli/auth?session=${sessionId}&provider=${providerId}`);
    } catch (error: any) {
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
            {providersWithStatus.map((provider, index) => (
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
                } ${provider.connected ? 'border-green-200 bg-green-50/30' : ''}`}>
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
                    {provider.connected && provider.lastChecked && (
                      <p className="text-xs text-muted-foreground mb-3">
                        Last active: {new Date(provider.lastChecked).toLocaleDateString()}
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
