'use client'

import { useEffect } from 'react'

export default function ProductionSafeRenderer() {
  useEffect(() => {
    if (typeof window !== 'undefined') {

      // Function to sanitize any child that might be a problematic object
      function sanitizeChild(child: any): any {
        if (child == null || typeof child === 'string' || typeof child === 'number' || typeof child === 'boolean') {
          return child
        }

        // Allow functions (for render props patterns like drag-and-drop)
        if (typeof child === 'function') {
          return child
        }

        // Check if it's a valid React element first
        if (child && typeof child === 'object' && child.$$typeof) {
          return child
        }

        if (Array.isArray(child)) {
          return child.map(sanitizeChild)
        }

        // If it's a plain object, this is where React error #31 happens
        if (typeof child === 'object' && child !== null) {
          // Special handling for {test, timestamp} objects
          if ('test' in child && 'timestamp' in child) {
            console.warn('🚫 Blocked {test, timestamp} object from being rendered as React child:', child)
            return null
          }

          // Log and block any other plain objects
          console.warn('🚫 Blocked plain object from being rendered as React child:', child)
          return null
        }

        return String(child)
      }

      // Function to sanitize props.children in JSX calls
      function sanitizeProps(props: any): any {
        if (!props || typeof props !== 'object') return props

        const sanitizedProps = { ...props }

        if ('children' in sanitizedProps) {
          if (Array.isArray(sanitizedProps.children)) {
            sanitizedProps.children = sanitizedProps.children.map(sanitizeChild)
          } else {
            sanitizedProps.children = sanitizeChild(sanitizedProps.children)
          }
        }

        return sanitizedProps
      }

      // 1. Patch React.createElement (for legacy JSX transform)
      const patchCreateElement = (React: any) => {
        if (React && React.createElement && React.createElement.name !== 'safePatchedCreateElement') {
          const origCreateElement = React.createElement

          React.createElement = function safePatchedCreateElement(type: any, props: any, ...children: any[]) {
            const sanitizedChildren = children.map(sanitizeChild)
            const sanitizedProps = sanitizeProps(props)
            return origCreateElement(type, sanitizedProps, ...sanitizedChildren)
          }

          Object.defineProperty(React.createElement, 'name', { value: 'safePatchedCreateElement' })
          console.log('🛡️ Patched React.createElement')
          return true
        }
        return false
      }

      // 2. Patch JSX Runtime (for modern JSX transform) - THIS IS THE KEY FIX
      const patchJSXRuntime = () => {
        try {
          // Patch the actual JSX runtime functions that React 17+ uses
          const originalJsx = require('react/jsx-runtime').jsx
          const originalJsxs = require('react/jsx-runtime').jsxs

          if (originalJsx && originalJsx.name !== 'safePatchedJsx') {
            require('react/jsx-runtime').jsx = function safePatchedJsx(type: any, props: any, key?: any) {
              const sanitizedProps = sanitizeProps(props)
              return originalJsx(type, sanitizedProps, key)
            }
            Object.defineProperty(require('react/jsx-runtime').jsx, 'name', { value: 'safePatchedJsx' })
          }

          if (originalJsxs && originalJsxs.name !== 'safePatchedJsxs') {
            require('react/jsx-runtime').jsxs = function safePatchedJsxs(type: any, props: any, key?: any) {
              const sanitizedProps = sanitizeProps(props)
              return originalJsxs(type, sanitizedProps, key)
            }
            Object.defineProperty(require('react/jsx-runtime').jsxs, 'name', { value: 'safePatchedJsxs' })
          }

          console.log('🛡️ Patched JSX Runtime (jsx/jsxs)')
          return true
        } catch (e) {
          console.warn('Could not patch JSX runtime:', e)
          return false
        }
      }

      // 3. Patch development JSX runtime too
      const patchJSXDevRuntime = () => {
        try {
          const originalJsxDEV = require('react/jsx-dev-runtime').jsxDEV

          if (originalJsxDEV && originalJsxDEV.name !== 'safePatchedJsxDEV') {
            require('react/jsx-dev-runtime').jsxDEV = function safePatchedJsxDEV(type: any, props: any, key?: any, isStaticChildren?: boolean, source?: any, self?: any) {
              const sanitizedProps = sanitizeProps(props)
              return originalJsxDEV(type, sanitizedProps, key, isStaticChildren, source, self)
            }
            Object.defineProperty(require('react/jsx-dev-runtime').jsxDEV, 'name', { value: 'safePatchedJsxDEV' })
          }

          console.log('🛡️ Patched JSX Dev Runtime (jsxDEV)')
          return true
        } catch (e) {
          // Dev runtime might not be available in production
          return false
        }
      }

      // Apply all patches
      let patchedAny = false

      // Patch JSX Runtime (most important for React 17+)
      patchedAny = patchJSXRuntime() || patchedAny
      patchedAny = patchJSXDevRuntime() || patchedAny

      // Patch React.createElement (fallback for legacy JSX)
      try {
        const React = require('react')
        patchedAny = patchCreateElement(React) || patchedAny
      } catch (e) {
        // React might not be available via require
      }

      // Also try window.React
      if ((window as any).React) {
        patchedAny = patchCreateElement((window as any).React) || patchedAny
      }

      if (patchedAny) {
        console.log('🛡️ Production-safe React renderer fully enabled - JSX Runtime + createElement patched')
      } else {
        console.warn('⚠️ Could not patch React - React runtime not found')
      }
    }
  }, [])

  return null
}