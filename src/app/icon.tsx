import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = {
  width: 64,
  height: 64,
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
          backgroundColor: '#1e293b',
        }}
      >
        <svg
          width="56"
          height="56"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Top right parallelogram */}
          <path
            d="M 50 10 L 85 25 L 75 50 L 40 35 Z"
            fill="white"
          />
          {/* Bottom left parallelogram */}
          <path
            d="M 15 45 L 50 60 L 40 85 L 5 70 Z"
            fill="white"
          />
          {/* Bottom right parallelogram */}
          <path
            d="M 50 60 L 85 75 L 75 100 L 40 85 Z"
            fill="white"
          />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}
