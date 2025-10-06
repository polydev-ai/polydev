import React from 'react'

interface PolydevLogoProps {
  className?: string
  size?: number
}

export default function PolydevLogo({ className = '', size = 32 }: PolydevLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Top right parallelogram - tilted upward */}
      <path
        d="M256 80 L380 180 L320 260 L196 160 Z"
        fill="currentColor"
      />
      {/* Bottom left parallelogram - tilted downward */}
      <path
        d="M132 240 L256 340 L196 420 L72 320 Z"
        fill="currentColor"
      />
      {/* Bottom right parallelogram - horizontal */}
      <path
        d="M256 340 L440 420 L380 500 L196 420 Z"
        fill="currentColor"
      />
    </svg>
  )
}
