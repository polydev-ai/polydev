'use client'

import { useEffect } from 'react'

export default function ReactDebugPatch() {
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      // Only patch in development
      const React = (window as any).React
      if (React && React.createElement) {
        const origCreateElement = React.createElement

        React.createElement = function patchedCreateElement(type: any, props: any, ...children: any[]) {
          function flattenDeep(arr: any[]): any[] {
            const result: any[] = []
            for (const item of arr) {
              if (Array.isArray(item)) {
                result.push(...flattenDeep(item))
              } else {
                result.push(item)
              }
            }
            return result
          }

          const flatChildren = flattenDeep(children)

          for (const child of flatChildren) {
            if (child && typeof child === 'object' && !React.isValidElement(child)) {
              // Found an object being passed as a React child
              const keys = Object.keys(child)
              if (keys.includes('test') && keys.includes('timestamp')) {
                console.group('🚨 REACT ERROR #31 SOURCE FOUND')
                console.error('Component trying to render {test, timestamp} object:', {
                  parent: typeof type === 'function' ? (type.displayName || type.name) : String(type),
                  object: child,
                  keys: keys,
                  stack: new Error().stack,
                })
                console.groupEnd()

                // Return null instead of the object to prevent the error
                return origCreateElement(type, props, ...children.map((c: any) =>
                  c && typeof c === 'object' && !React.isValidElement(c) && 'test' in c && 'timestamp' in c
                    ? '[FILTERED OBJECT]'
                    : c
                ))
              }
            }
          }

          return origCreateElement(type, props, ...children)
        }

        console.log('🔧 React.createElement debug patch enabled (development only)')
      }
    }
  }, [])

  return null
}