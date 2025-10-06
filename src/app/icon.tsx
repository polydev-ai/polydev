import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = {
  width: 32,
  height: 32,
}

export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'white',
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 512 512"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Top right parallelogram */}
          <path d="M256 80 L380 180 L320 260 L196 160 Z" fill="#1e293b"/>
          {/* Bottom left parallelogram */}
          <path d="M132 240 L256 340 L196 420 L72 320 Z" fill="#1e293b"/>
          {/* Bottom right parallelogram */}
          <path d="M256 340 L440 420 L380 500 L196 420 Z" fill="#1e293b"/>
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}
