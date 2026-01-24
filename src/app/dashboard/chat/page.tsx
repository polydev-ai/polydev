'use client';

import { useState, useEffect, useRef, Suspense, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Send, Loader2, CheckCircle2, Sparkles, User, Bot, ArrowLeft,
  Copy, Check, ChevronDown, Settings
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Image from 'next/image';
import { conversationCache, type CachedMessage, type ConversationSession } from '@/lib/conversation-cache';
import { useVirtualizedMessages } from '@/hooks/useVirtualizedMessages';
import '@/styles/chat.css';

interface Message extends CachedMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string;
}

interface Model {
  id: string;
  model_name: string;
  display_name: string;
  provider: string;
  tier: 'eco' | 'normal' | 'premium';
  cost_per_1k_input: string;
  active: boolean;
}

const PROVIDER_LOGOS: Record<string, string> = {
  'OpenAI': 'https://raw.githubusercontent.com/openai/gpt-4/main/assets/openai-logo.svg',
  'Anthropic': 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Claude_3_Logo.png',
  'Google': 'https://www.gstatic.com/devrel-devsite/prod/v2210deb8920cd4a55bd580441aa58e7853afc04b39a9d9ac4198e1cd7fbe04ef/google/images/branding/lockup.svg',
  'x-ai': 'https://avatars.githubusercontent.com/u/127140994',
  'Cerebras': 'https://avatars.githubusercontent.com/u/40857028',
  'zai-coding-plan': 'https://z-cdn.chatglm.cn/z-ai/static/logo.svg',
  'ZAI': 'https://z-cdn.chatglm.cn/z-ai/static/logo.svg',
  'zhipuai': 'https://z-cdn.chatglm.cn/z-ai/static/logo.svg',
  'Zhipu AI': 'https://z-cdn.chatglm.cn/z-ai/static/logo.svg',
};

const SAMPLE_QUESTIONS = [
  { question: 'Explain quantum computing', category: 'Education' },
  { question: 'Debug this React hook', category: 'Coding' },
  { question: 'What is REST API?', category: 'Tech' },
  { question: 'Write a Python script', category: 'Coding' },
  { question: 'Best practices for database design', category: 'Architecture' },
  { question: 'Help me optimize this code', category: 'Coding' },
];

function ChatContent() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [selectedTier, setSelectedTier] = useState<'eco' | 'normal' | 'premium'>('normal');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [session, setSession] = useState<ConversationSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Streaming optimization refs
  const bufferRef = useRef('');
  const isScheduledRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamingMessageRef = useRef<Message | null>(null);

  // Virtualization
  const { virtualItems, totalSize } = useVirtualizedMessages({
    items: messages,
    containerRef,
    estimateSize: 120,
    overscan: 5,
  });

  // Initialize
  useEffect(() => {
    const init = async () => {
      try {
        await conversationCache.init();

        // Fetch models
        const res = await fetch('/api/models/tier-selector');
        if (res.ok) {
          const data = await res.json();
          setModels(data.models);
          // Set default model (normal tier)
          const normalModel = data.models.find((m: Model) => m.tier === 'normal' && m.active);
          if (normalModel) setSelectedModel(normalModel);
        }

        // Create or restore session
        const sessions = await conversationCache.getSessions();
        if (sessions.length > 0) {
          const latestSession = sessions[0];
          setSession(latestSession);
          const cachedMessages = await conversationCache.getMessages(latestSession.id);
          setMessages(cachedMessages.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })));
        } else {
          const newSession = await conversationCache.createSession('New Chat');
          setSession(newSession);
        }
      } catch (error) {
        console.error('Failed to initialize chat:', error);
        toast.error('Failed to initialize chat');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Smooth streaming with requestAnimationFrame
  const scheduleRender = useCallback(() => {
    if (!isScheduledRef.current) {
      isScheduledRef.current = true;
      requestAnimationFrame(renderFrame);
    }
  }, []);

  const renderFrame = useCallback(() => {
    if (bufferRef.current.length > 0 && streamingMessageRef.current) {
      streamingMessageRef.current.content += bufferRef.current;
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { ...streamingMessageRef.current! };
        return newMessages;
      });
      bufferRef.current = '';
    }
    isScheduledRef.current = false;
  }, []);

  const addChunk = useCallback((token: string) => {
    bufferRef.current += token;
    scheduleRender();
  }, [scheduleRender]);

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || sending || !selectedModel || !session) {
      if (!selectedModel) toast.error('Please select a model');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
      model: selectedModel.model_name,
    };

    setMessages(prev => [...prev, userMessage]);
    await conversationCache.addMessage(session.id, userMessage);
    setInput('');
    setSending(true);
    setStreaming(true);

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel.model_name,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          temperature: 0.7,
          max_tokens: 2048,
        }),
      });

      if (!res.ok) throw new Error('Failed to send message');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      streamingMessageRef.current = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        model: selectedModel.model_name,
      };

      setMessages(prev => [...prev, streamingMessageRef.current!]);
      bufferRef.current = '';

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
                if (parsed.token) {
                  addChunk(parsed.token);
                }
              } catch (e) {
                // Ignore JSON parse errors
              }
            }
          }
        }
      }

      // Cache final message
      if (streamingMessageRef.current) {
        await conversationCache.addMessage(session.id, streamingMessageRef.current);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setSending(false);
      setStreaming(false);
      streamingMessageRef.current = null;
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

  const tierModels = useMemo(
    () => models.filter(m => m.tier === selectedTier && m.active),
    [models, selectedTier]
  );

  const tierIcons: Record<string, string> = {
    eco: '🌿',
    normal: '⚖️',
    premium: '🏆'
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Initializing chat...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background chat-container">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b bg-card sticky top-0 z-40"
      >
        <div className="container mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Button>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Polydev Chat</h1>
                <p className="text-xs text-muted-foreground">
                  {selectedModel ? selectedModel.display_name : 'Select a model'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-blue-500 hover:bg-blue-600">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Ready
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* Messages Area - Virtualized */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto messages-list"
      >
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
              <h2 className="text-2xl font-bold mb-4">Start a Conversation</h2>

              {/* Model Selector (Empty State) */}
              {!selectedModel ? (
                <div className="bg-muted/50 rounded-lg p-6 mb-6 max-w-2xl mx-auto model-selector">
                  <p className="text-muted-foreground mb-4">Select a model to get started:</p>

                  <div className="space-y-3">
                    <div className="tier-tabs">
                      {(['eco', 'normal', 'premium'] as const).map(tier => (
                        <Button
                          key={tier}
                          variant={selectedTier === tier ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedTier(tier)}
                          className="gap-2"
                        >
                          <span>{tierIcons[tier]}</span>
                          {tier.charAt(0).toUpperCase() + tier.slice(1)}
                        </Button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {tierModels.map(model => (
                        <Button
                          key={model.id}
                          variant="outline"
                          className="justify-start h-auto p-3 text-left hover:bg-primary/5"
                          onClick={() => {
                            setSelectedModel(model);
                            setShowModelSelector(false);
                          }}
                        >
                          <div className="flex items-start gap-3 w-full">
                            <div className="relative w-8 h-8 flex-shrink-0 rounded bg-muted flex items-center justify-center">
                              {PROVIDER_LOGOS[model.provider] ? (
                                <Image
                                  src={PROVIDER_LOGOS[model.provider]}
                                  alt={model.provider}
                                  width={32}
                                  height={32}
                                  className="rounded object-contain"
                                />
                              ) : (
                                <span className="text-xs font-bold">
                                  {model.provider.substring(0, 2).toUpperCase()}
                                </span>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm truncate">
                                {model.display_name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ${model.cost_per_1k_input}/1K tokens
                              </div>
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Sample Questions */}
              {selectedModel && (
                <div className="space-y-4">
                  <p className="text-muted-foreground">Try asking:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto sample-questions">
                    {SAMPLE_QUESTIONS.slice(0, 4).map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(item.question)}
                        disabled={sending}
                        className="group text-left p-4 rounded-lg border border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed sample-card"
                      >
                        <div className="text-sm font-medium group-hover:text-primary">
                          {item.question}
                        </div>
                        <div className="text-xs text-muted-foreground">{item.category}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <div style={{ height: `${totalSize}px`, position: 'relative' }} className="messages-list">
              <AnimatePresence>
                {virtualItems.map((virtualItem) => {
                  const message = messages[virtualItem.index];
                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      style={{
                        position: 'absolute',
                        top: `${virtualItem.start}px`,
                        left: 0,
                        right: 0,
                      }}
                      className="message-item"
                    >
                      <div className="flex gap-4 px-4 py-2">
                        <div
                          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            message.role === 'user'
                              ? 'bg-blue-500/10'
                              : 'bg-purple-500/10'
                          }`}
                        >
                          {message.role === 'user' ? (
                            <User className="w-4 h-4 text-blue-500" />
                          ) : (
                            <Bot className="w-4 h-4 text-purple-500" />
                          )}
                        </div>

                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">
                              {message.role === 'user' ? 'You' : message.model || 'Assistant'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {message.timestamp.toLocaleTimeString()}
                            </span>
                          </div>

                          <div className="bg-muted/50 rounded-lg p-3 message-card">
                            <pre className="whitespace-pre-wrap font-sans text-sm streaming-text">
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
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {streaming && (
                <motion.div
                  style={{
                    position: 'absolute',
                    top: `${totalSize}px`,
                    left: 0,
                    right: 0,
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-2 items-center text-sm text-muted-foreground px-4 py-2"
                >
                  <Loader2 className="w-4 h-4 animate-spin spinner" />
                  {selectedModel?.display_name} is thinking...
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      {selectedModel && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-t bg-card sticky bottom-0 z-40"
        >
          <div className="container mx-auto max-w-4xl px-4 py-4">
            {/* Quick Model Switcher */}
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Model:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowModelSelector(!showModelSelector)}
                className="gap-2"
              >
                {selectedModel.display_name}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </div>

            {showModelSelector && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-4 border rounded-lg bg-muted/50 model-selector"
              >
                <div className="flex gap-2 mb-3 tier-tabs">
                  {(['eco', 'normal', 'premium'] as const).map(tier => (
                    <Button
                      key={tier}
                      variant={selectedTier === tier ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedTier(tier)}
                      className="gap-2"
                    >
                      <span>{tierIcons[tier]}</span>
                      {tier.charAt(0).toUpperCase() + tier.slice(1)}
                    </Button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {tierModels.map(model => (
                    <Button
                      key={model.id}
                      variant={selectedModel.id === model.id ? 'default' : 'outline'}
                      className="justify-start h-auto p-3 text-left"
                      onClick={() => {
                        setSelectedModel(model);
                        setShowModelSelector(false);
                      }}
                    >
                      <div className="flex items-start gap-3 w-full">
                        <div className="relative w-8 h-8 flex-shrink-0 rounded bg-muted flex items-center justify-center">
                          {PROVIDER_LOGOS[model.provider] ? (
                            <Image
                              src={PROVIDER_LOGOS[model.provider]}
                              alt={model.provider}
                              width={32}
                              height={32}
                              className="rounded object-contain"
                            />
                          ) : (
                            <span className="text-xs font-bold">
                              {model.provider.substring(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">
                            {model.display_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ${model.cost_per_1k_input}/1K tokens
                          </div>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </motion.div>
            )}

            <div className="flex gap-2">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything..."
                  disabled={sending}
                  className="w-full min-h-[60px] max-h-[200px] resize-none rounded-lg border bg-background px-4 py-3 pr-12 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 chat-input"
                />
              </div>

              <Button
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || sending}
                className="gap-2"
                size="lg"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin spinner" />
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
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
