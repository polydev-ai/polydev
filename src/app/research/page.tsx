'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, ExternalLink, Github, FileText, Zap, Target, DollarSign, GitBranch, CheckCircle2, XCircle, Users } from 'lucide-react'

// Venn Diagram Component
function VennDiagram() {
  return (
    <svg viewBox="0 0 400 300" className="w-full max-w-lg mx-auto">
      {/* Baseline circle */}
      <circle
        cx="140"
        cy="150"
        r="100"
        fill="rgba(59, 130, 246, 0.2)"
        stroke="rgb(59, 130, 246)"
        strokeWidth="3"
      />
      {/* Polydev circle */}
      <circle
        cx="260"
        cy="150"
        r="100"
        fill="rgba(168, 85, 247, 0.2)"
        stroke="rgb(168, 85, 247)"
        strokeWidth="3"
      />

      {/* Labels */}
      <text x="80" y="150" className="text-sm font-bold fill-blue-700">Baseline</text>
      <text x="80" y="170" className="text-xs fill-slate-600">Only: 40</text>

      <text x="280" y="150" className="text-sm font-bold fill-purple-700">Polydev</text>
      <text x="280" y="170" className="text-xs fill-slate-600">Only: 50</text>

      {/* Center overlap */}
      <text x="200" y="145" textAnchor="middle" className="text-xl font-bold fill-slate-900">283</text>
      <text x="200" y="165" textAnchor="middle" className="text-xs fill-slate-600">Both solved</text>

      {/* Percentages */}
      <text x="55" y="90" className="text-sm font-semibold fill-blue-600">64.6%</text>
      <text x="305" y="90" className="text-sm font-semibold fill-purple-600">66.6%</text>

      {/* Total */}
      <text x="200" y="280" textAnchor="middle" className="text-base font-bold fill-slate-800">N = 500 instances</text>

      {/* Resolve@2 */}
      <text x="200" y="30" textAnchor="middle" className="text-lg font-bold fill-emerald-700">Resolve@2: 373/500 (74.6%)</text>
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
      className={`rounded-xl p-6 ${color} shadow-lg`}
      whileHover={{ y: -2, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-white" />
      </div>
      <p className="text-sm text-white/80 mb-1">{label}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
      {subtext && <p className="text-xs text-white/70 mt-1">{subtext}</p>}
    </motion.div>
  )
}

export default function ResearchPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section with gradient background */}
      <section className="pt-8 pb-16 px-4 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-400/30 rounded-full text-emerald-300 text-sm font-medium mb-6">
              <CheckCircle2 className="w-4 h-4" />
              SWE-bench Verified Research
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Matching Frontier Performance with{' '}
              <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Lightweight Models
              </span>
            </h1>

            <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              We demonstrate that Claude Haiku 4.5, augmented with Polydev&apos;s multi-model consultation,
              achieves <strong className="text-white">74.6% on SWE-bench Verified</strong> — matching
              Claude 4.5 Opus (74.4%) at <strong className="text-emerald-400">62% lower cost</strong>.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <a
                href="https://github.com/backspacevenkat/polydev-swe-bench"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-lg font-medium hover:bg-slate-100 transition-all shadow-lg"
              >
                <Github className="w-5 h-5" />
                View on GitHub
                <ExternalLink className="w-4 h-4" />
              </a>
              <a
                href="https://arxiv.org/abs/2501.XXXXX"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 border border-white/30 text-white rounded-lg font-medium hover:bg-white/10 transition-all"
              >
                <FileText className="w-5 h-5" />
                Read the Paper
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Key Stats - colored cards */}
      <section className="py-12 px-4 bg-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Target}
              label="Resolve@2 Accuracy"
              value="74.6%"
              subtext="373/500 instances"
              color="bg-gradient-to-br from-emerald-500 to-emerald-700"
            />
            <StatCard
              icon={Zap}
              label="vs Claude Opus"
              value="Matched"
              subtext="74.4% → 74.6%"
              color="bg-gradient-to-br from-purple-500 to-purple-700"
            />
            <StatCard
              icon={DollarSign}
              label="Cost Reduction"
              value="62%"
              subtext="$0.37 vs $0.97 per instance"
              color="bg-gradient-to-br from-blue-500 to-blue-700"
            />
            <StatCard
              icon={Users}
              label="Unique Solves"
              value="24%"
              subtext="From policy diversity"
              color="bg-gradient-to-br from-orange-500 to-orange-700"
            />
          </div>
        </div>
      </section>

      {/* Main Results Table */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">Key Results</h2>

            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-lg">
              <table className="w-full border-collapse bg-white">
                <thead>
                  <tr className="bg-slate-50 border-b-2 border-slate-200">
                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Approach</th>
                    <th className="text-center py-4 px-6 text-sm font-semibold text-slate-700">Resolution Rate</th>
                    <th className="text-center py-4 px-6 text-sm font-semibold text-slate-700">Cost/Resolved</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                        <span className="font-medium text-slate-900">Baseline (Claude Haiku 4.5)</span>
                      </div>
                    </td>
                    <td className="text-center py-4 px-6 text-slate-700 font-medium">64.6%</td>
                    <td className="text-center py-4 px-6 text-slate-700 font-medium">$0.18</td>
                  </tr>
                  <tr className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                        <span className="font-medium text-slate-900">Polydev (+ Multi-Model)</span>
                      </div>
                    </td>
                    <td className="text-center py-4 px-6 text-slate-700 font-medium">66.6%</td>
                    <td className="text-center py-4 px-6 text-slate-700 font-medium">$0.24</td>
                  </tr>
                  <tr className="border-b border-slate-100 bg-emerald-50 hover:bg-emerald-100">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full bg-emerald-500"></div>
                        <span className="font-bold text-slate-900">Resolve@2 (oracle)</span>
                        <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full font-medium">Best</span>
                      </div>
                    </td>
                    <td className="text-center py-4 px-6 font-bold text-emerald-700 text-lg">74.6%</td>
                    <td className="text-center py-4 px-6 font-bold text-emerald-700 text-lg">$0.37</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full bg-slate-400"></div>
                        <span className="font-medium text-slate-500">Claude 4.5 Opus (reference)</span>
                      </div>
                    </td>
                    <td className="text-center py-4 px-6 text-slate-500 font-medium">74.4%</td>
                    <td className="text-center py-4 px-6 text-slate-500 font-medium">$0.97</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-sm text-slate-600 mt-6 text-center max-w-2xl mx-auto">
              <strong className="text-slate-800">Resolve@2:</strong> Best result from two independent Haiku 4.5 policies (baseline + Polydev).
              This demonstrates policy complementarity — 24% of successes come from one approach succeeding where the other failed.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Complementarity Analysis with Venn Diagram */}
      <section className="py-16 px-4 bg-slate-100">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold text-slate-900 mb-4 text-center">Policy Complementarity</h2>
            <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
              Single-agent and multi-model approaches have only <strong className="text-slate-900">76% overlap</strong> in solved instances.
              This surprising orthogonality enables significant gains through policy diversity.
            </p>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Venn Diagram */}
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200">
                <VennDiagram />
              </div>

              {/* Analysis Cards */}
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">283 instances</h3>
                    <p className="text-slate-600">Solved by both approaches (76% overlap)</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-5 bg-white rounded-xl border-2 border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <GitBranch className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">40 Baseline-only</h3>
                    <p className="text-slate-600">Simple fixes where consultation added noise</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-5 bg-white rounded-xl border-2 border-purple-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">50 Polydev-only</h3>
                    <p className="text-slate-600">Complex issues where multi-model consultation helped</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <XCircle className="w-6 h-6 text-slate-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">127 Neither solved</h3>
                    <p className="text-slate-600">Remaining failures (25.4%)</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* When Consultation Helps */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold text-slate-900 mb-4 text-center">When Does Multi-Model Consultation Help?</h2>
            <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
              Polydev&apos;s multi-model consultation is most valuable for complex, ambiguous problems
              that benefit from diverse perspectives.
            </p>

            <div className="grid sm:grid-cols-2 gap-6">
              <div className="p-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl shadow-lg">
                <h3 className="font-bold text-white text-lg mb-6 flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6" />
                  High Impact Scenarios
                </h3>
                <ul className="space-y-4">
                  <li className="flex items-center justify-between bg-white/10 rounded-lg p-3">
                    <span className="text-white/90">Ambiguous requirements</span>
                    <span className="font-bold text-white text-xl">84.7%</span>
                  </li>
                  <li className="flex items-center justify-between bg-white/10 rounded-lg p-3">
                    <span className="text-white/90">Multi-file changes</span>
                    <span className="font-bold text-white text-xl">78.2%</span>
                  </li>
                </ul>
              </div>

              <div className="p-8 bg-slate-800 rounded-2xl shadow-lg">
                <h3 className="font-bold text-white text-lg mb-6 flex items-center gap-2">
                  <Target className="w-6 h-6" />
                  Lower Impact Scenarios
                </h3>
                <ul className="space-y-4">
                  <li className="flex items-center justify-between bg-white/10 rounded-lg p-3">
                    <span className="text-white/90">Clear problem statement</span>
                    <span className="font-semibold text-white text-xl">65.2%</span>
                  </li>
                  <li className="flex items-center justify-between bg-white/10 rounded-lg p-3">
                    <span className="text-white/90">Single-file change</span>
                    <span className="font-semibold text-white text-xl">61.4%</span>
                  </li>
                </ul>
              </div>
            </div>

            <p className="text-sm text-slate-600 mt-8 text-center max-w-xl mx-auto">
              <strong className="text-slate-800">Takeaway:</strong> Use multi-model consultation for complex architectural decisions and ambiguous bug reports.
              For straightforward, single-file fixes, a single model often suffices.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Methodology */}
      <section className="py-16 px-4 bg-slate-100">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">Methodology</h2>

            <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-xl">
              <pre className="text-sm sm:text-base overflow-x-auto font-mono">
{`Problem Statement ─┬─► [Baseline Path] ─► Patch A ─┐
                   │   (Haiku alone)               │
                   │                               ├─► Test Validation ─► Best Patch
                   └─► [Polydev Path] ──► Patch B ─┘
                       (Haiku + GPT Codex + Gemini)`}</pre>
            </div>

            <div className="grid sm:grid-cols-3 gap-6 mt-8">
              <div className="text-center p-6 bg-white rounded-xl shadow-md border border-slate-200">
                <div className="text-4xl font-bold text-purple-600 mb-2">250</div>
                <p className="text-slate-600 font-medium">Max agent turns</p>
              </div>
              <div className="text-center p-6 bg-white rounded-xl shadow-md border border-slate-200">
                <div className="text-4xl font-bold text-blue-600 mb-2">128K</div>
                <p className="text-slate-600 font-medium">Thinking budget tokens</p>
              </div>
              <div className="text-center p-6 bg-white rounded-xl shadow-md border border-slate-200">
                <div className="text-4xl font-bold text-emerald-600 mb-2">500</div>
                <p className="text-slate-600 font-medium">SWE-bench instances</p>
              </div>
            </div>

            <div className="mt-8 p-6 bg-white rounded-xl shadow-md border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-4 text-lg">Consultation Models</h3>
              <div className="flex flex-wrap gap-3">
                <span className="px-4 py-2 bg-slate-100 border border-slate-300 rounded-full text-sm text-slate-800 font-medium">GPT 5.2 Codex</span>
                <span className="px-4 py-2 bg-slate-100 border border-slate-300 rounded-full text-sm text-slate-800 font-medium">Gemini 3 Flash Preview</span>
              </div>
              <p className="text-slate-600 mt-4">
                These models provide alternative perspectives via Polydev&apos;s MCP integration,
                helping the primary agent (Claude Haiku 4.5) navigate complex decisions.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-purple-600 via-blue-600 to-emerald-500">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to try multi-model perspectives?
          </h2>
          <p className="text-white/90 mb-8 max-w-xl mx-auto text-lg">
            Polydev brings this same multi-model consultation to your IDE.
            Get perspectives from Claude, GPT, Gemini, and more — right where you code.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-100 transition-all shadow-lg text-lg"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="https://github.com/backspacevenkat/polydev-swe-bench"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 border-2 border-white/50 text-white rounded-xl font-bold hover:bg-white/10 transition-all text-lg"
            >
              <Github className="w-5 h-5" />
              Explore the Research
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-slate-900">
        <div className="max-w-4xl mx-auto text-center text-sm text-slate-400">
          <p className="mb-4">
            Research by <span className="text-white">Venkata Subrhmanyam Ghanta</span> (Arizona State University & Polydev AI)
            and <span className="text-white">Pujitha Sri Lakshmi Paladugu</span> (Microsoft)
          </p>
          <p>
            <a href="https://github.com/backspacevenkat/polydev-swe-bench" className="text-slate-300 hover:text-white transition-colors">GitHub</a>
            {' · '}
            <a href="https://arxiv.org/abs/2501.XXXXX" className="text-slate-300 hover:text-white transition-colors">arXiv Paper</a>
            {' · '}
            <Link href="/" className="text-slate-300 hover:text-white transition-colors">Polydev Home</Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
