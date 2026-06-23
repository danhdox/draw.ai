import { ImageResponse } from 'next/og'

export const alt = 'Draw.ai — AI-Powered Diagram Editor'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: '#fbfaf7',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: '#34D399' }} />
          <div style={{ width: 56, height: 56, borderRadius: 14, background: '#60A5FA' }} />
        </div>
        <div style={{ fontSize: 84, fontWeight: 700, color: '#1d1a16', marginTop: 36 }}>Draw.ai</div>
        <div style={{ fontSize: 36, color: '#5f594f', marginTop: 8 }}>
          AI-powered diagram editor
        </div>
      </div>
    ),
    { ...size }
  )
}
