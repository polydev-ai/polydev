import React from 'react'

interface PolydevLogoProps {
  className?: string
  size?: number
}

export default function PolydevLogo({ className = '', size = 40 }: PolydevLogoProps) {
  return (
    <img
      src="/logo.svg"
      alt="Polydev"
      width={size}
      height={size}
      className={className}
      style={{ display: 'block' }}
    />
  )
}
