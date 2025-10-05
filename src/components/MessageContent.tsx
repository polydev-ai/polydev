'use client'

import { useMemo, memo } from 'react'
import CodeBlock from './CodeBlock'

interface MessageContentProps {
  content: string
  className?: string
}

interface ParsedContent {
  type: 'text' | 'code'
  content: string
  language?: string
}

const parseMessageContent = (content: string): ParsedContent[] => {
  const parts: ParsedContent[] = []
  
  // Regex to match code blocks with optional language
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g
  
  let lastIndex = 0
  let match
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      const textContent = content.slice(lastIndex, match.index).trim()
      if (textContent) {
        parts.push({
          type: 'text',
          content: textContent
        })
      }
    }
    
    // Add code block
    const language = match[1] || undefined
    const code = match[2].trim()
    if (code) {
      parts.push({
        type: 'code',
        content: code,
        language
      })
    }
    
    lastIndex = match.index + match[0].length
  }
  
  // Add remaining text
  if (lastIndex < content.length) {
    const textContent = content.slice(lastIndex).trim()
    if (textContent) {
      parts.push({
        type: 'text',
        content: textContent
      })
    }
  }
  
  // If no code blocks found, return the entire content as text
  if (parts.length === 0) {
    parts.push({
      type: 'text',
      content: content
    })
  }
  
  return parts
}

const formatTextContent = (text: string): string => {
  let formatted = text
  
  // Remove or clean up unwanted headers (like "#### Suggested Service Model:")
  formatted = formatted.replace(/^#{4,}\s*Suggested Service Model:\s*$/gim, '')
  formatted = formatted.replace(/^#{4,}\s*[A-Z][^:]*:\s*$/gim, '') // Remove generic pattern headers
  
  // Convert inline code (single backticks) to HTML with enhanced styling
  formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-gradient-to-r from-slate-100 to-slate-50 px-2 py-1 rounded-md text-sm font-mono text-slate-900 border border-slate-200 shadow-sm">$1</code>')
  
  // Convert **bold** to HTML with enhanced styling
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>')
  
  // Convert *italic* to HTML with enhanced styling
  formatted = formatted.replace(/\*(.*?)\*/g, '<em class="italic text-slate-800">$1</em>')
  
  // Convert [link](url) to HTML with enhanced styling
  formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-slate-900 hover:text-slate-700 hover:underline underline-offset-2 font-medium transition-colors duration-200" target="_blank" rel="noopener noreferrer">$1</a>')
  
  // Convert headers to HTML with enhanced styling and better spacing
  formatted = formatted.replace(/^#### (.*$)/gim, '<h4 class="text-base font-semibold text-slate-900 mt-5 mb-3 border-l-2 border-slate-900 pl-3">$1</h4>')
  formatted = formatted.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-slate-900 mt-6 mb-3 border-l-3 border-slate-900 pl-3">$1</h3>')
  formatted = formatted.replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold text-slate-900 mt-6 mb-4 border-l-4 border-slate-900 pl-4">$1</h2>')
  formatted = formatted.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-slate-900 mt-6 mb-4 pb-2 border-b border-slate-200">$1</h1>')
  
  // Convert lists with enhanced styling and better spacing
  formatted = formatted.replace(/^- (.*$)/gim, '<li class="ml-6 mb-2 list-disc list-outside text-slate-800 leading-relaxed">$1</li>')
  
  // Convert numbered lists (capture item text correctly, avoid literal $1)
  formatted = formatted.replace(/^\d+\.\s+(.*$)/gim, (_match, itemText) => {
    return `<li class="ml-6 mb-2 list-decimal list-outside text-slate-800 leading-relaxed">${itemText}</li>`
  })
  
  // Clean up extra whitespace and empty lines with better spacing
  formatted = formatted.replace(/\n\s*\n\s*\n/g, '\n\n') // Reduce multiple empty lines to double
  formatted = formatted.trim()
  
  return formatted
}

function MessageContent({ content, className = '' }: MessageContentProps) {
  const parsedContent = useMemo(() => parseMessageContent(content), [content])
  
  return (
    <div className={`space-y-4 ${className}`}>
      {parsedContent.map((part, index) => {
        if (part.type === 'code') {
          return (
            <CodeBlock
              key={index}
              code={part.content}
              language={part.language}
            />
          )
        } else {
          return (
            <div
              key={index}
              className="prose prose-sm max-w-none  prose-headings:font-semibold prose-a:text-slate-900 prose-code:text-slate-900 prose-p:leading-relaxed prose-p:mb-4 prose-li:leading-relaxed text-slate-800"
              dangerouslySetInnerHTML={{
                __html: formatTextContent(part.content).replace(/\n/g, '<br />')
              }}
            />
          )
        }
      })}
    </div>
  )
}

export default memo(MessageContent)
