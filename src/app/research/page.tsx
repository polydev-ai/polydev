'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, FileText, Zap, Code, MessageSquare, Terminal } from 'lucide-react'

// Article data - add new articles here
const articles = [
  {
    slug: 'swe-bench-paper',
    category: 'Research',
    date: 'January 2026',
    title: 'A Small Model Matches the Best: How Multi-Model Consultation Achieves Frontier Performance',
    description: 'We show that Claude Haiku 4.5 can match Claude Opus 4.5 on SWE-bench Verified (74.6% vs 74.4%) at 62% lower cost through multi-model consultation.',
    icon: FileText,
    featured: true,
    tags: ['SWE-bench', 'Research Paper', 'Benchmarks'],
  },
  {
    slug: 'claude-code-guide',
    category: 'Integration Guide',
    date: 'Coming Soon',
    title: 'Using Polydev with Claude Code',
    description: 'Learn how to supercharge Claude Code with multi-model perspectives. Get unstuck faster and write better code with AI consultation.',
    icon: Terminal,
    featured: false,
    tags: ['Claude Code', 'MCP', 'Tutorial'],
    comingSoon: true,
  },
  {
    slug: 'cursor-guide',
    category: 'Integration Guide',
    date: 'Coming Soon',
    title: 'Using Polydev with Cursor',
    description: 'Integrate Polydev into your Cursor workflow. Access GPT, Claude, Gemini, and Grok perspectives without leaving your editor.',
    icon: Code,
    featured: false,
    tags: ['Cursor', 'IDE', 'Tutorial'],
    comingSoon: true,
  },
  {
    slug: 'codex-guide',
    category: 'Integration Guide',
    date: 'Coming Soon',
    title: 'Using Polydev with OpenAI Codex CLI',
    description: 'Combine OpenAI Codex with multi-model consultation for enhanced code generation and debugging capabilities.',
    icon: Zap,
    featured: false,
    tags: ['Codex', 'OpenAI', 'Tutorial'],
    comingSoon: true,
  },
  {
    slug: 'windsurf-guide',
    category: 'Integration Guide',
    date: 'Coming Soon',
    title: 'Using Polydev with Windsurf',
    description: 'Add multi-model AI consultation to your Windsurf IDE setup for smarter code suggestions and problem-solving.',
    icon: MessageSquare,
    featured: false,
    tags: ['Windsurf', 'IDE', 'Tutorial'],
    comingSoon: true,
  },
]

export default function ResearchPage() {
  const featuredArticle = articles.find(a => a.featured)
  const otherArticles = articles.filter(a => !a.featured)

  return (
    <div className="min-h-screen bg-white">
      {/* Subtle grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.02)_1px,transparent_1px)] bg-[size:48px_48px] opacity-50 pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-6 py-16">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-12"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Polydev
        </Link>

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            Research & Guides
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl">
            Deep dives into multi-model AI consultation, benchmark results, and practical integration guides for your favorite tools.
          </p>
        </motion.header>

        {/* Featured Article */}
        {featuredArticle && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-16"
          >
            <h2 className="text-xs font-medium tracking-widest text-slate-400 uppercase mb-6">
              Featured Research
            </h2>

            <Link href={`/research/${featuredArticle.slug}`}>
              <div className="group relative bg-slate-900 rounded-2xl p-8 sm:p-10 overflow-hidden hover:bg-slate-800 transition-colors">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-slate-800 to-transparent rounded-full -translate-y-32 translate-x-32" />

                <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 text-xs font-medium bg-white/10 text-white rounded-full">
                      {featuredArticle.category}
                    </span>
                    <span className="text-sm text-slate-400">
                      {featuredArticle.date}
                    </span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4 group-hover:text-slate-100 transition-colors">
                    {featuredArticle.title}
                  </h3>

                  <p className="text-slate-400 mb-6 max-w-2xl">
                    {featuredArticle.description}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {featuredArticle.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 text-xs bg-slate-800 text-slate-400 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="inline-flex items-center gap-2 text-white font-medium group-hover:gap-3 transition-all">
                    Read the research
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.section>
        )}

        {/* Other Articles */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="text-xs font-medium tracking-widest text-slate-400 uppercase mb-6">
            Integration Guides
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            {otherArticles.map((article, index) => {
              const Icon = article.icon
              const isComingSoon = article.comingSoon

              const CardContent = (
                <div className={`group relative h-full border rounded-xl p-6 transition-all ${
                  isComingSoon
                    ? 'border-slate-200 bg-slate-50 cursor-default'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                }`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isComingSoon ? 'bg-slate-200' : 'bg-slate-900'
                    }`}>
                      <Icon className={`w-5 h-5 ${isComingSoon ? 'text-slate-400' : 'text-white'}`} />
                    </div>
                    {isComingSoon && (
                      <span className="px-2 py-1 text-xs font-medium bg-slate-200 text-slate-500 rounded">
                        Coming Soon
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-medium ${isComingSoon ? 'text-slate-400' : 'text-slate-500'}`}>
                      {article.category}
                    </span>
                  </div>

                  <h3 className={`text-lg font-semibold mb-2 ${
                    isComingSoon ? 'text-slate-400' : 'text-slate-900 group-hover:text-slate-700'
                  }`}>
                    {article.title}
                  </h3>

                  <p className={`text-sm mb-4 ${isComingSoon ? 'text-slate-400' : 'text-slate-600'}`}>
                    {article.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {article.tags.map(tag => (
                      <span
                        key={tag}
                        className={`px-2 py-0.5 text-xs rounded ${
                          isComingSoon
                            ? 'bg-slate-200 text-slate-400'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {!isComingSoon && (
                    <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-slate-900 group-hover:gap-2 transition-all">
                      Read guide
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              )

              return isComingSoon ? (
                <motion.div
                  key={article.slug}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 * index }}
                >
                  {CardContent}
                </motion.div>
              ) : (
                <motion.div
                  key={article.slug}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 * index }}
                >
                  <Link href={`/research/${article.slug}`} className="block h-full">
                    {CardContent}
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </motion.section>

        {/* CTA */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-16 pt-16 border-t border-slate-200"
        >
          <div className="text-center">
            <h3 className="text-2xl font-bold text-slate-900 mb-3">
              Ready to try multi-model consultation?
            </h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              Add the same technique that achieves 74.6% on SWE-bench to your own AI workflows.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/auth"
                className="group inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors text-sm"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-900 border border-slate-200 rounded-lg font-medium hover:bg-slate-50 transition-colors text-sm"
              >
                View Documentation
              </Link>
            </div>
          </div>
        </motion.section>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8">
        <div className="max-w-4xl mx-auto px-6 text-center text-sm text-slate-500">
          <p>
            <Link href="/" className="hover:text-slate-900 transition-colors">Polydev</Link>
            {' · '}
            <Link href="/docs" className="hover:text-slate-900 transition-colors">Docs</Link>
            {' · '}
            <a href="https://github.com/backspacevenkat/polydev-swe-bench" className="hover:text-slate-900 transition-colors">GitHub</a>
          </p>
        </div>
      </footer>
    </div>
  )
}
