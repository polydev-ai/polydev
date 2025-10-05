'use client'

import { useState, useEffect, useRef, memo } from 'react'
import { Copy, Check } from 'lucide-react'

// Import Prism for syntax highlighting
let Prism: any = null
if (typeof window !== 'undefined') {
  require('prismjs')
  require('prismjs/themes/prism-tomorrow.css')
  require('prismjs/components/prism-typescript')
  require('prismjs/components/prism-javascript')
  require('prismjs/components/prism-python')
  require('prismjs/components/prism-bash')
  require('prismjs/components/prism-json')
  require('prismjs/components/prism-css')
  require('prismjs/components/prism-sql')
  require('prismjs/components/prism-yaml')
  require('prismjs/components/prism-markdown')
  Prism = (window as any).Prism
}

interface CodeBlockProps {
  code: string
  language?: string
}

const detectLanguage = (code: string): string => {
  if (code.includes('import ') && code.includes('from ')) return 'python'
  if (code.includes('function ') || code.includes('const ') || code.includes('let ')) return 'javascript'
  if (code.includes('interface ') || code.includes(': string') || code.includes(': number')) return 'typescript'
  if (code.includes('SELECT ') || code.includes('FROM ') || code.includes('WHERE ')) return 'sql'
  if (code.includes('#!/bin/bash') || code.includes('npm ') || code.includes('git ')) return 'bash'
  if (code.includes('{') && code.includes('"')) return 'json'
  if (code.includes('.class') || code.includes('#id')) return 'css'
  if (code.includes('apiVersion:') || code.includes('kind:')) return 'yaml'
  return 'text'
}

function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const [highlightedCode, setHighlightedCode] = useState(code)
  const codeRef = useRef<HTMLElement>(null)

  const detectedLanguage = language || detectLanguage(code)

  useEffect(() => {
    if (Prism && detectedLanguage && detectedLanguage !== 'text') {
      try {
        const highlighted = Prism.highlight(
          code,
          Prism.languages[detectedLanguage] || Prism.languages.text,
          detectedLanguage
        )
        setHighlightedCode(highlighted)
      } catch (error) {
        console.warn('Prism highlighting failed:', error)
        setHighlightedCode(code)
      }
    } else {
      setHighlightedCode(code)
    }
  }, [code, detectedLanguage])

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy code:', error)
    }
  }

  return (
    <div className="relative group my-4">
      <div className="flex items-center justify-between bg-slate-800 text-slate-300 px-4 py-3 text-sm rounded-t-lg border border-slate-700">
        <span className="font-mono text-xs uppercase tracking-wider font-semibold">
          {detectedLanguage}
        </span>
        <button
          onClick={copyToClipboard}
          className="opacity-70 hover:opacity-100 group-hover:opacity-100 transition-all duration-200 flex items-center gap-2 hover:bg-slate-700 px-3 py-1.5 rounded text-xs font-medium"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check size={16} className="text-slate-100" />
              <span className="text-slate-100">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={16} />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      <pre className="bg-slate-900 text-slate-100 p-4 rounded-b-lg overflow-x-auto border-l border-r border-b border-slate-700 font-mono text-sm leading-relaxed">
        <code
          ref={codeRef}
          className={`language-${detectedLanguage}`}
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
        />
      </pre>
    </div>
  )
}

export default memo(CodeBlock)