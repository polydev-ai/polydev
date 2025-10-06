import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = {
  width: 1024,
  height: 1024,
}

export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
        }}
      >
        <svg
          width="1024"
          height="1024"
          viewBox="0 0 600 600"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g transform="translate(0,600) scale(0.17,-0.17)" fill="#1e293b">
            <path d="M2938 4023 c-31 -54 -97 -169 -148 -257 -50 -87 -96 -168 -102 -180
-8 -20 7 -52 112 -232 67 -115 149 -256 182 -314 34 -58 75 -130 93 -160 18
-30 76 -131 130 -225 134 -235 124 -221 140 -198 45 65 306 547 301 558 -13
34 -642 1105 -649 1105 -2 0 -28 -44 -59 -97z"/>
            <path d="M2305 2933 c-164 -285 -605 -1057 -605 -1059 0 -2 144 -4 320 -4
l320 0 24 38 c13 20 85 143 159 272 74 129 204 357 289 505 85 149 160 280
167 293 l12 22 -324 0 -323 0 -39 -67z"/>
            <path d="M2678 2418 c5 -7 36 -60 67 -118 32 -58 79 -141 105 -185 26 -44 69
-117 95 -162 l48 -83 653 0 c360 0 654 2 654 3 0 2 -71 127 -159 278 l-159
274 -657 3 c-527 2 -656 0 -647 -10z"/>
          </g>
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}
