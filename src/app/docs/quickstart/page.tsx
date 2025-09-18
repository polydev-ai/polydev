'use client'

import { useEffect } from 'react'

export default function DocsQuickstart() {
  useEffect(() => {
    const container = document.getElementById('quickstart')
    if (!container) return
    const groups = container.querySelectorAll<HTMLElement>('.code-tabs')
    groups.forEach(group => {
      const buttons = Array.from(group.querySelectorAll<HTMLButtonElement>('.tab-button'))
      const panes = Array.from(group.querySelectorAll<HTMLElement>('pre[data-lang]'))
      const activate = (lang: string) => {
        panes.forEach(p => {
          p.style.display = p.dataset.lang === lang ? 'block' : 'none'
        })
        buttons.forEach(b => {
          if (b.dataset.lang === lang) b.classList.add('bg-slate-900', 'text-white')
          else b.classList.remove('bg-slate-900', 'text-white')
        })
      }
      const initial = buttons[0]?.dataset.lang || panes[0]?.dataset.lang || 'curl'
      activate(initial)
      buttons.forEach(btn => btn.addEventListener('click', () => activate(btn.dataset.lang || initial)))
    })
  }, [])

  return (
    <main id="quickstart" className="px-8 lg:px-16 py-16">
      <div className="max-w-3xl">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 mb-6">Quickstart</h1>
        <p className="text-lg text-gray-700 leading-8 mb-10">
          Get a key, make your first request, and pick models. Built to mirror the simplicity of OpenRouter’s quickstart.
        </p>

        <ol className="space-y-8 text-gray-800">
          <li>
            <h2 className="text-2xl font-semibold mb-2">1) Get an API key</h2>
            <p className="text-gray-600">Create a free account at <a className="text-blue-600 underline" href="https://polydev.ai">polydev.ai</a>. You start with 100 free requests.</p>
          </li>
          <li>
            <h2 className="text-2xl font-semibold mb-4">2) Make your first request</h2>
            <div className="code-tabs" data-group="first-request">
              <div className="flex gap-2 mb-3">
                <button className="tab-button px-3 py-1.5 rounded-md border text-sm" data-lang="curl">cURL</button>
                <button className="tab-button px-3 py-1.5 rounded-md border text-sm" data-lang="node">Node</button>
                <button className="tab-button px-3 py-1.5 rounded-md border text-sm" data-lang="ts">TypeScript</button>
              </div>
              <pre data-lang="curl"><code className="language-bash">curl -s https://api.polydev.ai/v1/perspectives \
  -H "Authorization: Bearer poly_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What are three safe ways to speed up a Next.js app?",
    "models": ["gpt-5", "claude-opus-4", "gemini-2.5-pro"]
  }'</code></pre>
              <pre data-lang="node"><code className="language-javascript">const res = await fetch('https://api.polydev.ai/v1/perspectives', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${process.env.POLYDEV_API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'What are three safe ways to speed up a Next.js app?', models: ['gpt-5','claude-opus-4','gemini-2.5-pro'] })
})
const data = await res.json()</code></pre>
              <pre data-lang="ts"><code className="language-typescript">type Req = { prompt: string; models: string[] }
const req: Req = { prompt: 'What are three safe ways to speed up a Next.js app?', models: ['gpt-5','claude-opus-4','gemini-2.5-pro'] }
const res = await fetch('https://api.polydev.ai/v1/perspectives', { method: 'POST', headers: { Authorization: `Bearer ${process.env.POLYDEV_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(req) })
const data: any = await res.json()</code></pre>
            </div>
          </li>
          <li>
            <h2 className="text-2xl font-semibold mb-2">3) Choose defaults by task</h2>
            <ul className="list-disc pl-6 text-gray-600">
              <li><span className="font-medium text-gray-800">Code</span>: gpt-5, claude-opus-4, gemini-2.5-pro</li>
              <li><span className="font-medium text-gray-800">Analysis</span>: claude-opus-4, gpt-5, grok-4-high</li>
              <li><span className="font-medium text-gray-800">Creative</span>: gpt-5, claude-opus-4</li>
            </ul>
          </li>
        </ol>

        <div className="mt-12 flex gap-4">
          <a href="/docs" className="px-5 py-2.5 rounded-lg bg-slate-900 text-white">Full docs</a>
          <a href="/docs/intro/quick-start" className="px-5 py-2.5 rounded-lg border">Quick Start (markdown)</a>
        </div>
      </div>
    </main>
  )
}

