'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Terminal,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Clock,
  Code2,
  User,
  Bot,
  ArrowLeft,
  Copy,
  Check
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface VMStatus {
  id: string;
  ip_address: string;
  status: string;
  provider: string;
  last_heartbeat: string;
}

function CLIChatInterfaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const provider = searchParams.get('provider');

  const [loading, setLoading] = useState(true);
  const [vmStatus, setVmStatus] = useState<VMStatus | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!provider) {
      router.push('/dashboard/remote-cli');
      return;
    }

    loadVMStatus();
    const interval = setInterval(loadVMStatus, 10000);
    return () => clearInterval(interval);
  }, [provider, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  const handleSendMessage = async () => {
    if (!input.trim() || sending || !vmStatus) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSending(true);
    setStreaming(true);

    try {
      const res = await fetch('/api/vm/cli/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: vmStatus.provider,
          prompt: userMessage.content,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to send prompt');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                setStreaming(false);
                break;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.chunk) {
                  assistantMessage.content += parsed.chunk;
                  setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = { ...assistantMessage };
                    return newMessages;
                  });
                }
              } catch (e) {
                // Ignore JSON parse errors
              }
            }
          }
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message');
      setMessages(prev => prev.slice(0, -1)); // Remove assistant message on error
    } finally {
      setSending(false);
      setStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopy = async (messageId: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(messageId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getProviderName = (providerId: string) => {
    switch (providerId) {
      case 'claude_code': return 'Claude Code';
      case 'codex': return 'OpenAI Codex';
      case 'gemini_cli': return 'Google Gemini';
      default: return providerId;
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
          <p className="text-muted-foreground">Loading CLI chat interface...</p>
        </motion.div>
      </div>
    );
  }

  if (!vmStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <CardTitle className="text-center">No Active VM</CardTitle>
            <CardDescription className="text-center">
              You need to connect a CLI tool first before you can start chatting
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/dashboard/remote-cli')} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go to Remote CLI Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b bg-card"
      >
        <div className="container mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/remote-cli')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Terminal className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">
                  {getProviderName(vmStatus.provider)}
                </h1>
                <p className="text-xs text-muted-foreground">
                  Connected to {vmStatus.ip_address}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-green-500 hover:bg-green-600">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              {vmStatus.status}
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-4xl px-4 py-8">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Start a Conversation</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Ask {getProviderName(vmStatus.provider)} to help you with coding tasks, debugging, or answering questions
              </p>
            </motion.div>
          ) : (
            <div className="space-y-6">
              <AnimatePresence>
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex gap-4"
                  >
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === 'user'
                        ? 'bg-blue-500/10'
                        : 'bg-purple-500/10'
                    }`}>
                      {message.role === 'user' ? (
                        <User className="w-4 h-4 text-blue-500" />
                      ) : (
                        <Bot className="w-4 h-4 text-purple-500" />
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          {message.role === 'user' ? 'You' : getProviderName(vmStatus.provider)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                      </div>

                      <Card className={message.role === 'assistant' ? 'bg-muted/50' : ''}>
                        <CardContent className="pt-4">
                          <pre className="whitespace-pre-wrap font-sans text-sm">
                            {message.content}
                          </pre>

                          {message.role === 'assistant' && message.content && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopy(message.id, message.content)}
                              className="mt-2 gap-2"
                            >
                              {copiedId === message.id ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  Copy
                                </>
                              )}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {streaming && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-2 items-center text-sm text-muted-foreground"
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {getProviderName(vmStatus.provider)} is thinking...
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-t bg-card"
      >
        <div className="container mx-auto max-w-4xl px-4 py-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask ${getProviderName(vmStatus.provider)} anything...`}
                disabled={sending}
                className="w-full min-h-[60px] max-h-[200px] resize-none rounded-lg border bg-background px-4 py-3 pr-12 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
              <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
                Press Enter to send
              </div>
            </div>

            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || sending}
              className="gap-2"
              size="lg"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            {getProviderName(vmStatus.provider)} can make mistakes. Verify important information.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function CLIChatInterface() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading chat interface...</p>
        </motion.div>
      </div>
    }>
      <CLIChatInterfaceContent />
    </Suspense>
  );
}
