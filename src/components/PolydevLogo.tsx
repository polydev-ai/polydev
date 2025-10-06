import React from 'react'

interface PolydevLogoProps {
  className?: string
  size?: number
}

export default function PolydevLogo({ className = '', size = 40 }: PolydevLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'block' }}
    >
      {/* Top right parallelogram */}
      <path
        d="M 50 10 L 85 25 L 75 50 L 40 35 Z"
        fill="currentColor"
      />
      {/* Bottom left parallelogram */}
      <path
        d="M 15 45 L 50 60 L 40 85 L 5 70 Z"
        fill="currentColor"
      />
      {/* Bottom right parallelogram */}
      <path
        d="M 50 60 L 85 75 L 75 100 L 40 85 Z"
        fill="currentColor"
      />
    </svg>
  )
}
