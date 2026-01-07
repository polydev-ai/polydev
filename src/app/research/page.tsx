'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink, Github, FileText, Copy, Check, MessageSquare, Zap, ArrowRight } from 'lucide-react'

export default function ResearchPage() {
  const [copied, setCopied] = useState(false)

  const citationText = `@article{ghanta2026matching,
  title={Matching Frontier Code Agents with Lightweight Models via Multi-Model Consultation},
  author={Ghanta, Venkata Subrhmanyam and Paladugu, Pujitha Sri Lakshmi},
  journal={arXiv preprint arXiv:2501.XXXXX},
  year={2026}
}`

  const copyToClipboard = () => {
    navigator.clipboard.writeText(citationText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Subtle grid background like homepage */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.02)_1px,transparent_1px)] bg-[size:48px_48px] opacity-50 pointer-events-none" />
      
      <article className="relative max-w-3xl mx-auto px-6 py-16">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-12"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Polydev
        </Link>

        {/* Article Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs font-medium tracking-widest text-slate-400 uppercase mb-4">
            Research · January 2026
          </p>

          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight mb-6">
            A Small Model Matches the Best: How Multi-Model Consultation Achieves Frontier Performance
          </h1>

          <p className="text-lg text-slate-600 leading-relaxed mb-8">
            We show that Claude Haiku 4.5—a lightweight, fast model—can match the performance of
            Claude Opus 4.5 on a rigorous coding benchmark, at 62% lower cost. The key?
            Asking multiple AI models for their perspective when stuck.
          </p>

          {/* Authors */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600 mb-8 pb-8 border-b border-slate-200">
            <span>Venkata Subrhmanyam Ghanta <span className="text-slate-400">· ASU & Polydev AI</span></span>
            <span>Pujitha Sri Lakshmi Paladugu <span className="text-slate-400">· Microsoft</span></span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-4 mb-12">
            <a
              href="https://github.com/backspacevenkat/polydev-swe-bench"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              <Github className="w-4 h-4" />
              Code & Data
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
            <a
              href="https://arxiv.org/abs/2501.XXXXX"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              <FileText className="w-4 h-4" />
              Full Paper
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>
        </motion.header>

        {/* The Big Picture */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">The Big Picture</h2>

          <p className="text-slate-600 leading-relaxed mb-4">
            Everyone assumes you need the biggest, most expensive AI model to get the best results.
            We tested this assumption on <strong className="text-slate-900">SWE-bench Verified</strong>—a benchmark of 500
            real GitHub issues that AI systems must solve by writing actual code.
          </p>

          <p className="text-slate-600 leading-relaxed">
            <strong className="text-slate-900">Our finding:</strong> A small model (Haiku) that asks other AI models for help
            performs just as well as a large model (Opus) working alone—and costs 62% less.
          </p>
        </motion.section>

        {/* Leaderboard Table */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">How We Compare</h2>
          <p className="text-slate-500 mb-6 text-sm">
            SWE-bench Verified Leaderboard (December 2025)
          </p>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="py-3 px-4 text-sm font-semibold text-slate-900">Rank</th>
                  <th className="py-3 px-4 text-sm font-semibold text-slate-900">Model</th>
                  <th className="py-3 px-4 text-sm font-semibold text-slate-900 text-right">% Solved</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-slate-100">
                  <td className="py-3 px-4 text-slate-500">1</td>
                  <td className="py-3 px-4 text-slate-700">Claude 4.5 Opus</td>
                  <td className="py-3 px-4 text-slate-900 text-right font-medium">74.4%</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-3 px-4 text-slate-500">2</td>
                  <td className="py-3 px-4 text-slate-700">Gemini 3 Pro Preview</td>
                  <td className="py-3 px-4 text-slate-900 text-right font-medium">74.2%</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-3 px-4 text-slate-500">3</td>
                  <td className="py-3 px-4 text-slate-700">GPT-5.2 (high reasoning)</td>
                  <td className="py-3 px-4 text-slate-900 text-right font-medium">71.8%</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-3 px-4 text-slate-500">4</td>
                  <td className="py-3 px-4 text-slate-700">Claude 4.5 Sonnet</td>
                  <td className="py-3 px-4 text-slate-900 text-right font-medium">70.6%</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-3 px-4 text-slate-500">5</td>
                  <td className="py-3 px-4 text-slate-700">GPT-5.2</td>
                  <td className="py-3 px-4 text-slate-900 text-right font-medium">69.0%</td>
                </tr>
                <tr className="bg-slate-900">
                  <td className="py-4 px-4 text-slate-400">–</td>
                  <td className="py-4 px-4 font-semibold text-white">Ours (Haiku 4.5 + Consultation)</td>
                  <td className="py-4 px-4 text-white text-right font-bold text-lg">74.6%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            Our approach uses Claude Haiku 4.5 as the base model, with GPT 5.2 Codex and
            Gemini 3 Flash Preview as consultants.
          </p>
        </motion.section>

        {/* How It Works - Clean minimal approach */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">How It Works</h2>

          <p className="text-slate-600 leading-relaxed mb-8">
            The principle is simple: when your AI agent faces a difficult decision, let it ask 
            other AI models for their perspective. Different models see different solutions.
          </p>

          {/* Visual flow diagram */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 sm:p-8">
            <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
              {/* Step 1 */}
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center text-white font-semibold mx-auto mb-4">
                  1
                </div>
                <h4 className="font-semibold text-slate-900 mb-2">Your agent works</h4>
                <p className="text-sm text-slate-600">
                  Any AI agent—coding assistant, chatbot, research tool—encounters a complex problem.
                </p>
              </div>

              {/* Arrow for desktop */}
              <div className="hidden sm:flex items-center justify-center">
                <ArrowRight className="w-6 h-6 text-slate-300" />
              </div>

              {/* Step 2 */}
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center text-white font-semibold mx-auto mb-4">
                  2
                </div>
                <h4 className="font-semibold text-slate-900 mb-2">Consults Polydev</h4>
                <p className="text-sm text-slate-600">
                  With one API call, get perspectives from GPT, Claude, Gemini, and Grok simultaneously.
                </p>
              </div>
            </div>

            {/* Center consultation visual */}
            <div className="mt-8 pt-8 border-t border-slate-200">
              <div className="bg-slate-900 rounded-lg p-5 max-w-md mx-auto">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="font-medium">polydev.getPerspectives()</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-slate-800 rounded px-3 py-2">
                    <span className="text-slate-400 text-xs">GPT-5.2</span>
                    <p className="text-white text-xs mt-1 truncate">&quot;Try approach A because...&quot;</p>
                  </div>
                  <div className="bg-slate-800 rounded px-3 py-2">
                    <span className="text-slate-400 text-xs">Claude Sonnet 4.5</span>
                    <p className="text-white text-xs mt-1 truncate">&quot;Consider option B for...&quot;</p>
                  </div>
                  <div className="bg-slate-800 rounded px-3 py-2">
                    <span className="text-slate-400 text-xs">Gemini 3.0 Pro</span>
                    <p className="text-white text-xs mt-1 truncate">&quot;The pattern here is...&quot;</p>
                  </div>
                  <div className="bg-slate-800 rounded px-3 py-2">
                    <span className="text-slate-400 text-xs">Grok 4.1</span>
                    <p className="text-white text-xs mt-1 truncate">&quot;Watch out for edge...&quot;</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="mt-8 pt-8 border-t border-slate-200 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center mx-auto mb-4">
                <Check className="w-5 h-5 text-white" />
              </div>
              <h4 className="font-semibold text-slate-900 mb-2">Better decisions</h4>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Your agent synthesizes the perspectives and makes a more informed choice.
                In our benchmark, this improved success rate from 64.6% to 74.6%.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Why This Works */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Why Different Models Help Each Other</h2>

          <p className="text-slate-600 leading-relaxed mb-6">
            Different AI models are trained on different data and have different strengths.
            When we analyzed which problems each approach solved:
          </p>

          <div className="grid sm:grid-cols-3 gap-px bg-slate-200 rounded-lg overflow-hidden mb-6">
            <div className="bg-white p-6 text-center">
              <div className="text-3xl font-bold text-slate-900 mb-1">283</div>
              <div className="text-sm text-slate-500">Solved by both</div>
            </div>
            <div className="bg-white p-6 text-center">
              <div className="text-3xl font-bold text-slate-900 mb-1">40</div>
              <div className="text-sm text-slate-500">Only Haiku alone</div>
            </div>
            <div className="bg-white p-6 text-center">
              <div className="text-3xl font-bold text-slate-900 mb-1">50</div>
              <div className="text-sm text-slate-500">Only with consultation</div>
            </div>
          </div>

          <p className="text-slate-600 leading-relaxed">
            <strong className="text-slate-900">Key insight:</strong> 24% of our successes came from one approach solving problems
            the other couldn&apos;t. The models have genuinely different blind spots—so combining them
            covers more ground than using either alone.
          </p>
        </motion.section>

        {/* When to Consult */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">When Does Consultation Help Most?</h2>

          <p className="text-slate-600 leading-relaxed mb-6">
            Consultation isn&apos;t always beneficial. Here&apos;s what we found:
          </p>

          <div className="space-y-4 mb-6">
            <div className="p-4 border-l-2 border-slate-900 bg-slate-50">
              <div className="font-semibold text-slate-900 mb-2">Most helpful for:</div>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Ambiguous requirements (85% helpful)</li>
                <li>• Multi-file changes (78% helpful)</li>
                <li>• Complex algorithms (81% helpful)</li>
              </ul>
            </div>
            <div className="p-4 border-l-2 border-slate-300 bg-slate-50">
              <div className="font-semibold text-slate-900 mb-2">Less helpful for:</div>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Simple one-line fixes (42% helpful)</li>
                <li>• Clear, well-specified bugs (65% helpful)</li>
              </ul>
            </div>
          </div>

          <p className="text-slate-600 leading-relaxed">
            <strong className="text-slate-900">Takeaway:</strong> Use multi-model consultation for hard problems.
            For simple fixes, a single model is often faster and just as effective.
          </p>
        </motion.section>

        {/* Cost Comparison */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">The Cost Advantage</h2>

          <p className="text-slate-600 leading-relaxed mb-6">
            Same performance, much lower cost:
          </p>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="py-3 px-4 font-semibold text-slate-900">Approach</th>
                  <th className="py-3 px-4 font-semibold text-slate-900 text-right">% Solved</th>
                  <th className="py-3 px-4 font-semibold text-slate-900 text-right">Cost per Problem</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-3 px-4 text-slate-600">Claude 4.5 Opus (frontier)</td>
                  <td className="py-3 px-4 text-slate-900 text-right">74.4%</td>
                  <td className="py-3 px-4 text-slate-500 text-right">$0.97</td>
                </tr>
                <tr className="bg-slate-900">
                  <td className="py-4 px-4 font-semibold text-white">Ours (Haiku + Consultation)</td>
                  <td className="py-4 px-4 text-white text-right font-semibold">74.6%</td>
                  <td className="py-4 px-4 text-white text-right font-semibold">$0.37</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            62% cost reduction while matching performance. This includes running both the
            baseline and consultation approaches.
          </p>
        </motion.section>

        {/* Try It Yourself with Polydev */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Use This in Your Own Agents</h2>

          <p className="text-slate-600 leading-relaxed mb-6">
            The same multi-model consultation that powers our research is available through
            <strong className="text-slate-900"> Polydev MCP</strong>. If you&apos;re building AI agents with Claude Code, Cursor,
            Windsurf, or any MCP-compatible tool, you can add this capability in minutes.
          </p>

          <div className="bg-slate-900 rounded-lg p-6 mb-6">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
              Quick Setup
            </div>
            <div className="font-mono text-sm space-y-2">
              <div className="text-slate-500"># Install Polydev MCP</div>
              <div className="text-white">npx polydev-ai@latest</div>
              <div className="text-slate-500 mt-4"># In your agent, when stuck:</div>
              <div className="text-slate-300">polydev.getPerspectives(<span className="text-white">&quot;How should I approach this bug?&quot;</span>)</div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-px bg-slate-200 rounded-lg overflow-hidden mb-6">
            <div className="bg-white p-5">
              <div className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-slate-500" />
                Multi-Model Perspectives
              </div>
              <p className="text-sm text-slate-600">
                Get insights from GPT-4o, Claude, Gemini, and Grok—all through one API call.
              </p>
            </div>
            <div className="bg-white p-5">
              <div className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4 text-slate-500" />
                Works with Claude Code
              </div>
              <p className="text-sm text-slate-600">
                Built on Model Context Protocol (MCP). Drop-in compatible with your existing setup.
              </p>
            </div>
          </div>

          <p className="text-slate-600 leading-relaxed">
            <strong className="text-slate-900">Why this matters:</strong> Our research shows that model diversity—not just model
            size—can unlock frontier performance. Polydev makes it easy to add this pattern to your
            own AI workflows.
          </p>
        </motion.section>

        {/* What This Means */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">What This Means</h2>

          <p className="text-slate-600 leading-relaxed mb-4">
            <strong className="text-slate-900">You don&apos;t always need the biggest model.</strong> With the right approach—giving
            smaller models more time to think and access to other perspectives—you can match
            frontier performance at a fraction of the cost.
          </p>

          <p className="text-slate-600 leading-relaxed">
            This has practical implications: developers can get top-tier AI coding assistance
            without paying top-tier prices. The trick is knowing when to ask for help.
          </p>
        </motion.section>

        {/* Reproducibility */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Reproducibility</h2>

          <p className="text-slate-600 leading-relaxed mb-4">
            All our code, predictions, and reasoning traces for 500 problems are available:
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Benchmark:</span>
              <span className="text-slate-900">SWE-bench Verified (500 instances)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Base model:</span>
              <span className="text-slate-900">Claude Haiku 4.5</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Consultation:</span>
              <span className="text-slate-900">GPT 5.2 Codex, Gemini 3 Flash</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total cost:</span>
              <span className="text-slate-900">$136.34 (both approaches)</span>
            </div>
          </div>
        </motion.section>

        {/* Citation - Styled with syntax highlighting */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Citation</h2>

          <p className="text-slate-600 leading-relaxed mb-4">
            If you use our work or build on these findings, please cite:
          </p>

          <div className="relative rounded-lg overflow-hidden border border-slate-200">
            {/* Header bar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <span className="text-xs font-medium text-slate-600">citation.bib</span>
              </div>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-md text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-green-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            {/* Code content with syntax highlighting */}
            <div className="bg-slate-900 p-5 overflow-x-auto">
              <pre className="text-sm font-mono leading-relaxed">
                <code>
                  <span className="text-purple-400">@article</span>
                  <span className="text-slate-400">{'{'}</span>
                  <span className="text-green-400">ghanta2026matching</span>
                  <span className="text-slate-400">,</span>
                  {'\n'}
                  {'  '}<span className="text-blue-400">title</span>
                  <span className="text-slate-400">=</span>
                  <span className="text-amber-300">{'{'}Matching Frontier Code Agents with Lightweight Models via Multi-Model Consultation{'}'}</span>
                  <span className="text-slate-400">,</span>
                  {'\n'}
                  {'  '}<span className="text-blue-400">author</span>
                  <span className="text-slate-400">=</span>
                  <span className="text-amber-300">{'{'}Ghanta, Venkata Subrhmanyam and Paladugu, Pujitha Sri Lakshmi{'}'}</span>
                  <span className="text-slate-400">,</span>
                  {'\n'}
                  {'  '}<span className="text-blue-400">journal</span>
                  <span className="text-slate-400">=</span>
                  <span className="text-amber-300">{'{'}arXiv preprint arXiv:2501.XXXXX{'}'}</span>
                  <span className="text-slate-400">,</span>
                  {'\n'}
                  {'  '}<span className="text-blue-400">year</span>
                  <span className="text-slate-400">=</span>
                  <span className="text-amber-300">{'{'}2026{'}'}</span>
                  {'\n'}
                  <span className="text-slate-400">{'}'}</span>
                </code>
              </pre>
            </div>
          </div>
        </motion.section>

        {/* CTA */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="pt-8 border-t border-slate-200"
        >
          <div className="bg-slate-900 rounded-xl p-8 text-center">
            <h3 className="text-xl font-bold text-white mb-2">
              Try multi-model consultation today
            </h3>
            <p className="text-slate-400 mb-6 text-sm max-w-md mx-auto">
              Add the same technique that achieves 74.6% on SWE-bench to your own AI agents and workflows.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/auth"
                className="group inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-lg font-medium hover:bg-slate-100 transition-colors text-sm"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="https://github.com/backspacevenkat/polydev-swe-bench"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-transparent text-white border border-slate-700 rounded-lg font-medium hover:bg-slate-800 transition-colors text-sm"
              >
                <Github className="w-4 h-4" />
                View Research Code
              </a>
            </div>
          </div>
        </motion.section>
      </article>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8">
        <div className="max-w-3xl mx-auto px-6 text-center text-sm text-slate-500">
          <p>
            <a href="https://github.com/backspacevenkat/polydev-swe-bench" className="hover:text-slate-900 transition-colors">GitHub</a>
            {' · '}
            <a href="https://arxiv.org/abs/2501.XXXXX" className="hover:text-slate-900 transition-colors">arXiv</a>
            {' · '}
            <Link href="/" className="hover:text-slate-900 transition-colors">Polydev</Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
