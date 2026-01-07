'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink, Github, FileText } from 'lucide-react'

export default function ResearchPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Article Header */}
      <article className="max-w-3xl mx-auto px-6 py-16">
        {/* Back link */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-12"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Polydev
        </Link>

        {/* Article Meta */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs font-medium tracking-widest text-slate-400 uppercase mb-4">
            Research · December 2025
          </p>
          
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight mb-6">
            Matching Frontier Code Agents with Lightweight Models via Multi-Model Consultation
          </h1>

          <p className="text-xl text-slate-600 leading-relaxed mb-8">
            We demonstrate that Claude Haiku 4.5, augmented with multi-model consultation, 
            achieves 74.6% on SWE-bench Verified—matching Claude 4.5 Opus at 62% lower cost.
          </p>

          {/* Authors */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600 mb-8 pb-8 border-b border-slate-200">
            <span>Venkata Subrhmanyam Ghanta <span className="text-slate-400">· ASU & Polydev AI</span></span>
            <span>Pujitha Sri Lakshmi Paladugu <span className="text-slate-400">· Microsoft</span></span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-4 mb-16">
            <a
              href="https://github.com/backspacevenkat/polydev-swe-bench"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              <Github className="w-4 h-4" />
              View Code
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
            <a
              href="https://arxiv.org/abs/2501.XXXXX"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              <FileText className="w-4 h-4" />
              Read Paper
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>
        </motion.header>

        {/* Key Results - Clean Table */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Key Results</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-900">
                  <th className="py-3 pr-4 text-sm font-semibold text-slate-900">Approach</th>
                  <th className="py-3 px-4 text-sm font-semibold text-slate-900 text-right">Resolution</th>
                  <th className="py-3 pl-4 text-sm font-semibold text-slate-900 text-right">Cost/Resolved</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-slate-100">
                  <td className="py-3 pr-4 text-slate-700">Baseline (Claude Haiku 4.5)</td>
                  <td className="py-3 px-4 text-slate-900 text-right font-medium">64.6%</td>
                  <td className="py-3 pl-4 text-slate-600 text-right">$0.18</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-3 pr-4 text-slate-700">Polydev (+ Multi-Model)</td>
                  <td className="py-3 px-4 text-slate-900 text-right font-medium">66.6%</td>
                  <td className="py-3 pl-4 text-slate-600 text-right">$0.24</td>
                </tr>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <td className="py-3 pr-4 font-semibold text-slate-900">Resolve@2 (oracle)</td>
                  <td className="py-3 px-4 text-slate-900 text-right font-bold text-lg">74.6%</td>
                  <td className="py-3 pl-4 text-slate-900 text-right font-semibold">$0.37</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 text-slate-500">Claude 4.5 Opus (reference)</td>
                  <td className="py-3 px-4 text-slate-500 text-right">74.4%</td>
                  <td className="py-3 pl-4 text-slate-500 text-right">$0.97</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            Resolve@2: Best result from two independent Haiku 4.5 policies. 
            24% of successes come from one approach succeeding where the other failed.
          </p>
        </motion.section>

        {/* Abstract / Overview */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Abstract</h2>
          
          <div className="prose prose-slate max-w-none">
            <p className="text-slate-700 leading-relaxed mb-4">
              Can inference-time compute substitute for model scale? We investigate this question 
              through systematic evaluation on SWE-bench Verified, a benchmark of 500 real-world 
              GitHub issues requiring code understanding and modification.
            </p>
            <p className="text-slate-700 leading-relaxed mb-4">
              Our key finding: Claude Haiku 4.5, when augmented with extended agent turns (up to 250), 
              large thinking budgets (128K tokens), and multi-model consultation via Polydev, 
              achieves <strong className="text-slate-900">66.6% single-policy resolution</strong> and 
              <strong className="text-slate-900"> 74.6% Resolve@2</strong>—matching the frontier 
              Claude 4.5 Opus (74.4%) at significantly lower cost.
            </p>
            <p className="text-slate-700 leading-relaxed">
              Critically, the two approaches (baseline vs. multi-model) show only 76% overlap in solved 
              instances, demonstrating surprising orthogonality that enables the combined performance gain.
            </p>
          </div>
        </motion.section>

        {/* Policy Complementarity */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Policy Complementarity</h2>
          
          <p className="text-slate-700 leading-relaxed mb-6">
            Single-agent and multi-model approaches have only 76% overlap in solved instances. 
            This surprising orthogonality is the key insight enabling Resolve@2 to match frontier performance.
          </p>

          {/* Clean breakdown */}
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="p-4 border border-slate-200 rounded-lg">
              <div className="text-3xl font-bold text-slate-900 mb-1">283</div>
              <div className="text-sm text-slate-600">Solved by both approaches</div>
              <div className="text-xs text-slate-400 mt-1">76% overlap</div>
            </div>
            <div className="p-4 border border-slate-200 rounded-lg">
              <div className="text-3xl font-bold text-slate-900 mb-1">90</div>
              <div className="text-sm text-slate-600">Unique solves (either approach)</div>
              <div className="text-xs text-slate-400 mt-1">24% from diversity</div>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-700">Baseline-only solves</span>
              <span className="font-medium text-slate-900">40 instances</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-700">Polydev-only solves</span>
              <span className="font-medium text-slate-900">50 instances</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-700">Neither solved</span>
              <span className="text-slate-500">127 instances</span>
            </div>
          </div>
        </motion.section>

        {/* When Consultation Helps */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">When Does Multi-Model Consultation Help?</h2>
          
          <p className="text-slate-700 leading-relaxed mb-6">
            Consultation is most valuable for complex, ambiguous problems that benefit from diverse perspectives.
          </p>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-700">Ambiguous requirements</span>
                <span className="text-sm font-semibold text-slate-900">84.7%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-900 rounded-full" style={{ width: '84.7%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-700">Multi-file changes</span>
                <span className="text-sm font-semibold text-slate-900">78.2%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-900 rounded-full" style={{ width: '78.2%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-700">Clear problem statement</span>
                <span className="text-sm font-medium text-slate-600">65.2%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-400 rounded-full" style={{ width: '65.2%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-700">Single-file change</span>
                <span className="text-sm font-medium text-slate-600">61.4%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-400 rounded-full" style={{ width: '61.4%' }}></div>
              </div>
            </div>
          </div>

          <p className="mt-6 text-sm text-slate-500">
            Takeaway: Use multi-model consultation for complex architectural decisions and ambiguous bug reports. 
            For straightforward, single-file fixes, a single model often suffices.
          </p>
        </motion.section>

        {/* Methodology */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Methodology</h2>
          
          <p className="text-slate-700 leading-relaxed mb-6">
            We evaluate on SWE-bench Verified using a dual-policy approach. Each problem instance 
            is processed by two independent agents: a baseline (Haiku alone) and Polydev-enhanced 
            (Haiku + multi-model consultation).
          </p>

          {/* Architecture Diagram - Clean ASCII style */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 mb-6 font-mono text-sm overflow-x-auto">
            <pre className="text-slate-700">{`Problem Statement ─┬─► [Baseline Path] ─► Patch A ─┐
                   │   (Haiku alone)               │
                   │                               ├─► Test ─► Best
                   └─► [Polydev Path] ──► Patch B ─┘
                       (Haiku + Codex + Gemini)`}</pre>
          </div>

          {/* Configuration */}
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Configuration</h3>
          
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <div className="p-4 border border-slate-200 rounded-lg text-center">
              <div className="text-2xl font-bold text-slate-900">250</div>
              <div className="text-xs text-slate-500 mt-1">Max agent turns</div>
            </div>
            <div className="p-4 border border-slate-200 rounded-lg text-center">
              <div className="text-2xl font-bold text-slate-900">128K</div>
              <div className="text-xs text-slate-500 mt-1">Thinking budget</div>
            </div>
            <div className="p-4 border border-slate-200 rounded-lg text-center">
              <div className="text-2xl font-bold text-slate-900">500</div>
              <div className="text-xs text-slate-500 mt-1">SWE-bench instances</div>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-slate-900 mb-4">Consultation Models</h3>
          
          <p className="text-slate-700 leading-relaxed mb-4">
            The Polydev-enhanced path queries external models for alternative perspectives 
            on complex decisions:
          </p>

          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex items-center gap-3">
              <span className="w-2 h-2 bg-slate-900 rounded-full"></span>
              <span><strong>GPT 5.2 Codex</strong> — Code-specialized reasoning</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-2 h-2 bg-slate-900 rounded-full"></span>
              <span><strong>Gemini 3 Flash Preview</strong> — Fast multi-modal analysis</span>
            </li>
          </ul>
        </motion.section>

        {/* Cost Analysis */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Cost Analysis</h2>
          
          <p className="text-slate-700 leading-relaxed mb-6">
            Resolve@2 runs two full pipelines but remains cost-effective compared to frontier models.
            Effective input rates are lower than list prices due to ~90% prompt cache hit rate.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-slate-900">
                  <th className="py-3 pr-4 font-semibold text-slate-900">Approach</th>
                  <th className="py-3 px-4 font-semibold text-slate-900 text-right">Total Cost</th>
                  <th className="py-3 px-4 font-semibold text-slate-900 text-right">Per Instance</th>
                  <th className="py-3 pl-4 font-semibold text-slate-900 text-right">Per Resolved</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-3 pr-4 text-slate-700">Baseline only</td>
                  <td className="py-3 px-4 text-slate-600 text-right">$57.76</td>
                  <td className="py-3 px-4 text-slate-600 text-right">$0.12</td>
                  <td className="py-3 pl-4 text-slate-900 text-right font-medium">$0.18</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-3 pr-4 text-slate-700">Polydev only</td>
                  <td className="py-3 px-4 text-slate-600 text-right">$78.58</td>
                  <td className="py-3 px-4 text-slate-600 text-right">$0.16</td>
                  <td className="py-3 pl-4 text-slate-900 text-right font-medium">$0.24</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="py-3 pr-4 font-semibold text-slate-900">Resolve@2 (both)</td>
                  <td className="py-3 px-4 text-slate-900 text-right font-medium">$136.34</td>
                  <td className="py-3 px-4 text-slate-900 text-right font-medium">$0.27</td>
                  <td className="py-3 pl-4 text-slate-900 text-right font-bold">$0.37</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            Compare to Claude 4.5 Opus at $0.97 per resolved instance—62% cost reduction with Resolve@2.
          </p>
        </motion.section>

        {/* Citation */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Citation</h2>
          
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 font-mono text-xs overflow-x-auto">
            <pre className="text-slate-700">{`@article{ghanta2026matching,
  title={Matching Frontier Code Agents with Lightweight Models
         via Multi-Model Consultation},
  author={Ghanta, Venkata Subrhmanyam and Paladugu, Pujitha Sri Lakshmi},
  journal={arXiv preprint arXiv:2501.XXXXX},
  year={2026}
}`}</pre>
          </div>
        </motion.section>

        {/* Footer CTA */}
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
              Polydev brings this same consultation approach to your development workflow.
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

      {/* Minimal Footer */}
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
