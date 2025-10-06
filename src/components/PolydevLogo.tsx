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
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Top parallelogram */}
      <path
        d="M50 10 L75 30 L55 45 L30 25 Z"
        fill="currentColor"
      />
      {/* Bottom left parallelogram */}
      <path
        d="M20 40 L45 60 L35 75 L10 55 Z"
        fill="currentColor"
      />
      {/* Bottom right parallelogram */}
      <path
        d="M55 45 L80 65 L70 90 L45 70 Z"
        fill="currentColor"
      />
    </svg>
  )
}
