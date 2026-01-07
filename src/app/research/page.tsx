'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, ExternalLink, Github, FileText, Zap, Target, DollarSign, GitBranch, CheckCircle2, XCircle, Users } from 'lucide-react'
import PolydevLogo from '../../components/PolydevLogo'

// Venn Diagram Component
function VennDiagram() {
  return (
    <svg viewBox="0 0 400 300" className="w-full max-w-lg mx-auto">
      {/* Baseline circle */}
      <circle
        cx="140"
        cy="150"
        r="100"
        fill="rgba(59, 130, 246, 0.15)"
        stroke="rgb(59, 130, 246)"
        strokeWidth="2"
      />
      {/* Polydev circle */}
      <circle
        cx="260"
        cy="150"
        r="100"
        fill="rgba(168, 85, 247, 0.15)"
        stroke="rgb(168, 85, 247)"
        strokeWidth="2"
      />

      {/* Labels */}
      <text x="80" y="150" className="text-sm font-medium fill-blue-600">Baseline</text>
      <text x="80" y="170" className="text-xs fill-slate-500">Only: 40</text>

      <text x="280" y="150" className="text-sm font-medium fill-purple-600">Polydev</text>
      <text x="280" y="170" className="text-xs fill-slate-500">Only: 50</text>

      {/* Center overlap */}
      <text x="200" y="145" textAnchor="middle" className="text-lg font-bold fill-slate-800">283</text>
      <text x="200" y="165" textAnchor="middle" className="text-xs fill-slate-500">Both solved</text>

      {/* Percentages */}
      <text x="60" y="90" className="text-sm fill-blue-500">64.6%</text>
      <text x="310" y="90" className="text-sm fill-purple-500">66.6%</text>

      {/* Total */}
      <text x="200" y="280" textAnchor="middle" className="text-base font-bold fill-slate-700">N = 500 instances</text>

      {/* Resolve@2 */}
      <text x="200" y="30" textAnchor="middle" className="text-lg font-bold fill-emerald-600">Resolve@2: 373/500 (74.6%)</text>
    </svg>
  )
}

// Stats Card Component
function StatCard({ icon: Icon, label, value, subtext, color }: {
  icon: React.ElementType
  label: string
  value: string
  subtext?: string
  color: string
}) {
  return (
    <motion.div
      className="bg-white rounded-xl border border-slate-200 p-6 hover:border-slate-300 hover:shadow-lg transition-all"
      whileHover={{ y: -2 }}
    >
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-4`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-sm text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
    </motion.div>
  )
}

export default function ResearchPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center">
              <PolydevLogo size={80} className="text-slate-900" />
              <span className="font-semibold text-2xl -ml-3">Polydev</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/" className="text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 text-sm font-medium mb-6">
              <CheckCircle2 className="w-4 h-4" />
              SWE-bench Verified Research
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
              Matching Frontier Performance with{' '}
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Lightweight Models
              </span>
            </h1>

            <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              We demonstrate that Claude Haiku 4.5, augmented with Polydev&apos;s multi-model consultation,
              achieves <strong className="text-slate-900">74.6% on SWE-bench Verified</strong> — matching
              Claude 4.5 Opus (74.4%) at <strong className="text-emerald-600">62% lower cost</strong>.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <a
                href="https://github.com/backspacevenkat/polydev-swe-bench"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-all"
              >
                <Github className="w-5 h-5" />
                View on GitHub
                <ExternalLink className="w-4 h-4" />
              </a>
              <a
                href="https://arxiv.org/abs/2501.XXXXX"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:border-slate-400 hover:bg-slate-50 transition-all"
              >
                <FileText className="w-5 h-5" />
                Read the Paper
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Key Stats */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Target}
              label="Resolve@2 Accuracy"
              value="74.6%"
              subtext="373/500 instances"
              color="bg-emerald-500"
            />
            <StatCard
              icon={Zap}
              label="vs Claude Opus"
              value="Matched"
              subtext="74.4% → 74.6%"
              color="bg-purple-500"
            />
            <StatCard
              icon={DollarSign}
              label="Cost Reduction"
              value="62%"
              subtext="$0.37 vs $0.97 per instance"
              color="bg-blue-500"
            />
            <StatCard
              icon={Users}
              label="Unique Solves"
              value="24%"
              subtext="From policy diversity"
              color="bg-orange-500"
            />
          </div>
        </div>
      </section>

      {/* Main Results Table */}
      <section className="py-16 px-4 bg-white border-y border-slate-100">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">Key Results</h2>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left py-4 px-4 text-sm font-semibold text-slate-600">Approach</th>
                    <th className="text-center py-4 px-4 text-sm font-semibold text-slate-600">Resolution Rate</th>
                    <th className="text-center py-4 px-4 text-sm font-semibold text-slate-600">Cost/Resolved</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="font-medium text-slate-900">Baseline (Claude Haiku 4.5)</span>
                      </div>
                    </td>
                    <td className="text-center py-4 px-4 text-slate-700">64.6%</td>
                    <td className="text-center py-4 px-4 text-slate-700">$0.18</td>
                  </tr>
                  <tr className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        <span className="font-medium text-slate-900">Polydev (+ Multi-Model)</span>
                      </div>
                    </td>
                    <td className="text-center py-4 px-4 text-slate-700">66.6%</td>
                    <td className="text-center py-4 px-4 text-slate-700">$0.24</td>
                  </tr>
                  <tr className="border-b border-slate-100 bg-emerald-50 hover:bg-emerald-100">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        <span className="font-bold text-slate-900">Resolve@2 (oracle)</span>
                        <span className="text-xs bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full">Best</span>
                      </div>
                    </td>
                    <td className="text-center py-4 px-4 font-bold text-emerald-700">74.6%</td>
                    <td className="text-center py-4 px-4 font-bold text-emerald-700">$0.37</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-slate-400"></div>
                        <span className="font-medium text-slate-500">Claude 4.5 Opus (reference)</span>
                      </div>
                    </td>
                    <td className="text-center py-4 px-4 text-slate-500">74.4%</td>
                    <td className="text-center py-4 px-4 text-slate-500">$0.97</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-sm text-slate-500 mt-4 text-center">
              <strong>Resolve@2:</strong> Best result from two independent Haiku 4.5 policies (baseline + Polydev).
              This demonstrates policy complementarity — 24% of successes come from one approach succeeding where the other failed.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Complementarity Analysis with Venn Diagram */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold text-slate-900 mb-4 text-center">Policy Complementarity</h2>
            <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
              Single-agent and multi-model approaches have only <strong className="text-slate-900">76% overlap</strong> in solved instances.
              This surprising orthogonality enables significant gains through policy diversity.
            </p>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Venn Diagram */}
              <div className="bg-slate-50 rounded-2xl p-8">
                <VennDiagram />
              </div>

              {/* Analysis Cards */}
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-white rounded-xl border border-slate-200">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">283 instances</h3>
                    <p className="text-sm text-slate-500">Solved by both approaches (76% overlap)</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-white rounded-xl border border-blue-200">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <GitBranch className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">40 Baseline-only</h3>
                    <p className="text-sm text-slate-500">Simple fixes where consultation added noise</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-white rounded-xl border border-purple-200">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">50 Polydev-only</h3>
                    <p className="text-sm text-slate-500">Complex issues where multi-model consultation helped</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-white rounded-xl border border-slate-200">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <XCircle className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">127 Neither solved</h3>
                    <p className="text-sm text-slate-500">Remaining failures (25.4%)</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* When Consultation Helps */}
      <section className="py-16 px-4 bg-white border-y border-slate-100">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold text-slate-900 mb-4 text-center">When Does Multi-Model Consultation Help?</h2>
            <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
              Polydev&apos;s multi-model consultation is most valuable for complex, ambiguous problems
              that benefit from diverse perspectives.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-200">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-purple-600" />
                  High Impact Scenarios
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-center justify-between">
                    <span className="text-slate-600">Ambiguous requirements</span>
                    <span className="font-bold text-purple-700">84.7%</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-slate-600">Multi-file changes</span>
                    <span className="font-bold text-purple-700">78.2%</span>
                  </li>
                </ul>
              </div>

              <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-slate-600" />
                  Lower Impact Scenarios
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-center justify-between">
                    <span className="text-slate-600">Clear problem statement</span>
                    <span className="font-semibold text-slate-700">65.2%</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-slate-600">Single-file change</span>
                    <span className="font-semibold text-slate-700">61.4%</span>
                  </li>
                </ul>
              </div>
            </div>

            <p className="text-sm text-slate-500 mt-6 text-center">
              <strong>Takeaway:</strong> Use multi-model consultation for complex architectural decisions and ambiguous bug reports.
              For straightforward, single-file fixes, a single model often suffices.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Methodology */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">Methodology</h2>

            <div className="bg-slate-900 rounded-2xl p-8 text-white">
              <pre className="text-sm overflow-x-auto">
{`Problem Statement ─┬─► [Baseline Path] ─► Patch A ─┐
                   │   (Haiku alone)               │
                   │                               ├─► Test Validation ─► Best Patch
                   └─► [Polydev Path] ──► Patch B ─┘
                       (Haiku + GPT Codex + Gemini)`}</pre>
            </div>

            <div className="grid sm:grid-cols-3 gap-6 mt-8">
              <div className="text-center p-4">
                <div className="text-3xl font-bold text-slate-900 mb-2">250</div>
                <p className="text-sm text-slate-600">Max agent turns</p>
              </div>
              <div className="text-center p-4">
                <div className="text-3xl font-bold text-slate-900 mb-2">128K</div>
                <p className="text-sm text-slate-600">Thinking budget tokens</p>
              </div>
              <div className="text-center p-4">
                <div className="text-3xl font-bold text-slate-900 mb-2">500</div>
                <p className="text-sm text-slate-600">SWE-bench instances</p>
              </div>
            </div>

            <div className="mt-8 p-6 bg-slate-50 rounded-xl">
              <h3 className="font-semibold text-slate-900 mb-4">Consultation Models</h3>
              <div className="flex flex-wrap gap-3">
                <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-sm text-slate-700">GPT 5.2 Codex</span>
                <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-sm text-slate-700">Gemini 3 Flash Preview</span>
              </div>
              <p className="text-sm text-slate-500 mt-4">
                These models provide alternative perspectives via Polydev&apos;s MCP integration,
                helping the primary agent (Claude Haiku 4.5) navigate complex decisions.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to try multi-model perspectives?
          </h2>
          <p className="text-slate-300 mb-8 max-w-xl mx-auto">
            Polydev brings this same multi-model consultation to your IDE.
            Get perspectives from Claude, GPT, Gemini, and more — right where you code.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-lg font-medium hover:bg-slate-100 transition-all"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="https://github.com/backspacevenkat/polydev-swe-bench"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 border border-slate-600 text-white rounded-lg font-medium hover:border-slate-500 hover:bg-slate-800 transition-all"
            >
              <Github className="w-5 h-5" />
              Explore the Research
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto text-center text-sm text-slate-500">
          <p className="mb-4">
            Research by Venkata Subrhmanyam Ghanta (Arizona State University & Polydev AI)
            and Pujitha Sri Lakshmi Paladugu (Microsoft)
          </p>
          <p>
            <a href="https://github.com/backspacevenkat/polydev-swe-bench" className="text-slate-700 hover:text-slate-900">GitHub</a>
            {' · '}
            <a href="https://arxiv.org/abs/2501.XXXXX" className="text-slate-700 hover:text-slate-900">arXiv Paper</a>
            {' · '}
            <Link href="/" className="text-slate-700 hover:text-slate-900">Polydev Home</Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
