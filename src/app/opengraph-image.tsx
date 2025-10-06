import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Polydev'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'white',
          fontSize: 60,
          fontWeight: 700,
        }}
      >
        <svg
          width="300"
          height="300"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Top right parallelogram */}
          <path
            d="M 50 10 L 85 25 L 75 50 L 40 35 Z"
            fill="#1e293b"
          />
          {/* Bottom left parallelogram */}
          <path
            d="M 15 45 L 50 60 L 40 85 L 5 70 Z"
            fill="#1e293b"
          />
          {/* Bottom right parallelogram */}
          <path
            d="M 50 60 L 85 75 L 75 100 L 40 85 Z"
            fill="#1e293b"
          />
        </svg>
        <div style={{ marginTop: 40, color: '#1e293b' }}>Polydev</div>
      </div>
    ),
    {
      ...size,
    }
  )
}
