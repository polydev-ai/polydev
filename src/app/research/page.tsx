'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink, Github, FileText } from 'lucide-react'

export default function ResearchPage() {
  return (
    <div className="min-h-screen bg-white">
      <article className="max-w-3xl mx-auto px-6 py-16">
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
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">The Big Picture</h2>
          
          <p className="text-slate-700 leading-relaxed mb-4">
            Everyone assumes you need the biggest, most expensive AI model to get the best results. 
            We tested this assumption on <strong>SWE-bench Verified</strong>—a benchmark of 500 
            real GitHub issues that AI systems must solve by writing actual code.
          </p>
          
          <p className="text-slate-700 leading-relaxed mb-4">
            <strong>Our finding:</strong> A small model (Haiku) that asks other AI models for help 
            performs just as well as a large model (Opus) working alone—and costs 62% less.
          </p>
        </motion.section>

        {/* Leaderboard Table */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">How We Compare</h2>
          <p className="text-slate-600 mb-6 text-sm">
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
                <tr className="border-b border-slate-200 bg-slate-50">
                  <td className="py-3 px-4 text-slate-500">–</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">Ours (Haiku 4.5 + Consultation)</td>
                  <td className="py-3 px-4 text-slate-900 text-right font-bold text-lg">74.6%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            Our approach uses Claude Haiku 4.5 as the base model, with GPT 5.2 Codex and 
            Gemini 3 Flash Preview as consultants.
          </p>
        </motion.section>

        {/* How It Works */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">How It Works</h2>
          
          <p className="text-slate-700 leading-relaxed mb-6">
            Instead of using one expensive model, we run a smaller model and give it the ability 
            to ask other AI models for their opinion. Think of it like a junior developer who can 
            instantly ask senior colleagues for advice.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 mb-6 font-mono text-sm overflow-x-auto">
            <pre className="text-slate-700">{`Problem (GitHub Issue)
        │
        ▼
┌───────────────────┐
│  Claude Haiku     │──── "I'm stuck on this..."
│  (base model)     │                │
└───────────────────┘                ▼
        │              ┌─────────────────────────┐
        │              │  Ask GPT & Gemini for   │
        │              │  their perspectives     │
        │              └─────────────────────────┘
        │                            │
        ▼                            ▼
   Generate Fix  ◄──── Incorporate insights
        │
        ▼
   Run Tests → Pass? → Submit`}</pre>
          </div>

          <p className="text-slate-700 leading-relaxed">
            The consultation happens through <strong>Polydev MCP</strong>—a standardized way for 
            AI models to talk to each other. When Haiku hits a tricky decision, it can query 
            GPT 5.2 Codex and Gemini 3 Flash Preview for their take.
          </p>
        </motion.section>

        {/* Why This Works */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Why Different Models Help Each Other</h2>
          
          <p className="text-slate-700 leading-relaxed mb-6">
            Different AI models are trained on different data and have different strengths. 
            When we analyzed which problems each approach solved:
          </p>

          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <div className="p-4 border border-slate-200 rounded-lg text-center">
              <div className="text-3xl font-bold text-slate-900 mb-1">283</div>
              <div className="text-sm text-slate-600">Solved by both</div>
            </div>
            <div className="p-4 border border-slate-200 rounded-lg text-center">
              <div className="text-3xl font-bold text-slate-900 mb-1">40</div>
              <div className="text-sm text-slate-600">Only Haiku alone</div>
            </div>
            <div className="p-4 border border-slate-200 rounded-lg text-center">
              <div className="text-3xl font-bold text-slate-900 mb-1">50</div>
              <div className="text-sm text-slate-600">Only with consultation</div>
            </div>
          </div>

          <p className="text-slate-700 leading-relaxed">
            <strong>Key insight:</strong> 24% of our successes came from one approach solving problems 
            the other couldn&apos;t. The models have genuinely different blind spots—so combining them 
            covers more ground than using either alone.
          </p>
        </motion.section>

        {/* When to Consult */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">When Does Consultation Help Most?</h2>
          
          <p className="text-slate-700 leading-relaxed mb-6">
            Consultation isn&apos;t always beneficial. Here&apos;s what we found:
          </p>

          <div className="space-y-4 mb-6">
            <div className="p-4 border-l-4 border-slate-900 bg-slate-50">
              <div className="font-semibold text-slate-900 mb-1">Most helpful for:</div>
              <ul className="text-sm text-slate-700 space-y-1">
                <li>• Ambiguous requirements (85% helpful)</li>
                <li>• Multi-file changes (78% helpful)</li>
                <li>• Complex algorithms (81% helpful)</li>
              </ul>
            </div>
            <div className="p-4 border-l-4 border-slate-300 bg-slate-50">
              <div className="font-semibold text-slate-900 mb-1">Less helpful for:</div>
              <ul className="text-sm text-slate-700 space-y-1">
                <li>• Simple one-line fixes (42% helpful)</li>
                <li>• Clear, well-specified bugs (65% helpful)</li>
              </ul>
            </div>
          </div>

          <p className="text-slate-700 leading-relaxed">
            <strong>Takeaway:</strong> Use multi-model consultation for hard problems. 
            For simple fixes, a single model is often faster and just as effective.
          </p>
        </motion.section>

        {/* Cost Comparison */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">The Cost Advantage</h2>
          
          <p className="text-slate-700 leading-relaxed mb-6">
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
                  <td className="py-3 px-4 text-slate-700">Claude 4.5 Opus (frontier)</td>
                  <td className="py-3 px-4 text-slate-900 text-right">74.4%</td>
                  <td className="py-3 px-4 text-slate-600 text-right">$0.97</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="py-3 px-4 font-semibold text-slate-900">Ours (Haiku + Consultation)</td>
                  <td className="py-3 px-4 text-slate-900 text-right font-semibold">74.6%</td>
                  <td className="py-3 px-4 text-slate-900 text-right font-semibold">$0.37</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            62% cost reduction while matching performance. This includes running both the 
            baseline and consultation approaches.
          </p>
        </motion.section>

        {/* What This Means */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">What This Means</h2>
          
          <p className="text-slate-700 leading-relaxed mb-4">
            <strong>You don&apos;t always need the biggest model.</strong> With the right approach—giving 
            smaller models more time to think and access to other perspectives—you can match 
            frontier performance at a fraction of the cost.
          </p>
          
          <p className="text-slate-700 leading-relaxed mb-4">
            This has practical implications: developers can get top-tier AI coding assistance 
            without paying top-tier prices. The trick is knowing when to ask for help.
          </p>

          <p className="text-slate-700 leading-relaxed">
            <strong>Polydev</strong> brings this same multi-model consultation to your IDE. 
            When you&apos;re stuck, get perspectives from Claude, GPT, Gemini, and more—all in one place.
          </p>
        </motion.section>

        {/* Reproducibility */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Reproducibility</h2>
          
          <p className="text-slate-700 leading-relaxed mb-4">
            All our code, predictions, and reasoning traces for 500 problems are available:
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-600">Benchmark:</span>
              <span className="text-slate-900">SWE-bench Verified (500 instances)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Base model:</span>
              <span className="text-slate-900">Claude Haiku 4.5</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Consultation:</span>
              <span className="text-slate-900">GPT 5.2 Codex, Gemini 3 Flash</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Total cost:</span>
              <span className="text-slate-900">$136.34 (both approaches)</span>
            </div>
          </div>
        </motion.section>

        {/* Citation */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Citation</h2>
          
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 font-mono text-xs overflow-x-auto">
            <pre className="text-slate-700">{`@article{ghanta2026matching,
  title={Matching Frontier Code Agents with Lightweight 
         Models via Multi-Model Consultation},
  author={Ghanta, Venkata Subrhmanyam and 
          Paladugu, Pujitha Sri Lakshmi},
  journal={arXiv preprint arXiv:2501.XXXXX},
  year={2026}
}`}</pre>
          </div>
        </motion.section>

        {/* CTA */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="pt-8 border-t border-slate-200"
        >
          <div className="bg-slate-900 rounded-lg p-8 text-center">
            <h3 className="text-xl font-bold text-white mb-2">
              Try multi-model perspectives in your IDE
            </h3>
            <p className="text-slate-400 mb-6 text-sm">
              Polydev brings the same consultation approach to your daily coding.
            </p>
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-lg font-medium hover:bg-slate-100 transition-colors text-sm"
            >
              Get Started Free
            </Link>
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
