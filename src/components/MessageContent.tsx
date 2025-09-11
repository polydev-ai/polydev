'use client'

import { useMemo } from 'react'
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
  
  // Convert inline code (single backticks) to HTML
  formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-sm font-mono text-red-600 dark:text-red-400">$1</code>')
  
  // Convert **bold** to HTML
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
  
  // Convert *italic* to HTML
  formatted = formatted.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
  
  // Convert [link](url) to HTML
  formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
  
  // Convert headers to HTML (in order from largest to smallest to avoid conflicts)
  formatted = formatted.replace(/^#### (.*$)/gim, '<h4 class="text-base font-semibold mt-3 mb-2">$1</h4>')
  formatted = formatted.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
  formatted = formatted.replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
  formatted = formatted.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
  
  // Convert lists (- item) to HTML without adding extra bullets
  formatted = formatted.replace(/^- (.*$)/gim, '<li class="ml-4 list-disc list-inside">$1</li>')
  
  // Clean up extra whitespace and empty lines
  formatted = formatted.replace(/\n\s*\n\s*\n/g, '\n\n') // Reduce multiple empty lines to double
  formatted = formatted.trim()
  
  return formatted
}

export default function MessageContent({ content, className = '' }: MessageContentProps) {
  const parsedContent = useMemo(() => parseMessageContent(content), [content])
  
  return (
    <div className={`space-y-3 ${className}`}>
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
              className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-code:text-red-600 dark:prose-code:text-red-400 prose-code:bg-gray-100 dark:prose-code:bg-gray-700"
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