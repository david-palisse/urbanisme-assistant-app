import { ImageResponse } from 'next/og';

// 1200×630 social sharing image, generated at build time (replaces the
// 1200×240 logo banner that rendered poorly in link previews).
export const runtime = 'edge';
export const alt = 'MonUrba — simplifiez vos démarches d’urbanisme';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 55%, #60a5fa 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 110, fontWeight: 700 }}>
          <span>MON</span>
          <span style={{ color: '#bfdbfe' }}>URBA</span>
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 40,
            maxWidth: 900,
            textAlign: 'center',
            lineHeight: 1.3,
          }}
        >
          Simplifiez vos démarches d’urbanisme
        </div>
        <div
          style={{
            marginTop: 20,
            fontSize: 28,
            color: '#dbeafe',
            textAlign: 'center',
          }}
        >
          Zone PLU, autorisation nécessaire, documents à fournir — en quelques minutes
        </div>
        <div style={{ marginTop: 48, fontSize: 26, color: '#bfdbfe' }}>
          www.mon-urba.fr
        </div>
      </div>
    ),
    size
  );
}
