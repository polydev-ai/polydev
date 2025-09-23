'use client'

import { useEffect } from 'react'

export default function ProductionSafeRenderer() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Get React from the global scope
      const React = (window as any).React || require('react')

      if (React && React.createElement) {
        const origCreateElement = React.createElement

        React.createElement = function safePatchedCreateElement(type: any, props: any, ...children: any[]) {
          // Recursively sanitize children to prevent React error #31
          function sanitizeChild(child: any): any {
            if (child == null || typeof child === 'string' || typeof child === 'number' || typeof child === 'boolean') {
              return child
            }

            if (React.isValidElement && React.isValidElement(child)) {
              return child
            }

            if (Array.isArray(child)) {
              return child.map(sanitizeChild)
            }

            // If it's an object that's not a valid React element, convert to string
            if (typeof child === 'object') {
              // Special handling for {test, timestamp} objects
              if (child && 'test' in child && 'timestamp' in child) {
                console.warn('🚫 Blocked {test, timestamp} object from being rendered as React child:', child)
                return '[Analytics ping]' // Replace with safe string
              }

              // Convert other objects to safe string representation
              try {
                return `[Object: ${Object.keys(child).join(', ')}]`
              } catch {
                return '[Object]'
              }
            }

            return String(child)
          }

          const sanitizedChildren = children.map(sanitizeChild)
          return origCreateElement(type, props, ...sanitizedChildren)
        }

        // Preserve original function properties
        Object.setPrototypeOf(React.createElement, origCreateElement)
        Object.defineProperty(React.createElement, 'name', { value: 'safePatchedCreateElement' })

        console.log('🛡️ Production-safe React renderer enabled')
      }
    }
  }, [])

  return null
}