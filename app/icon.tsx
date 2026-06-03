import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 40% 35%, #0d3515, #041208)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.5)',
        }}
      >
        ⚽
      </div>
    ),
    { ...size }
  )
}
