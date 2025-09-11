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
  // Convert inline code (single backticks) to HTML
  return text.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
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
              className="prose prose-sm max-w-none"
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