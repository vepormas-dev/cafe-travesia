import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { brand } from '@travesia/shared';

export const alt = 'Café Travesía · Café especial de Caicedo, Antioquia';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const DIAMONDS = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='24' viewBox='0 0 48 24'%3E%3Cg fill='none' stroke='%23EB9A37' stroke-width='1.4'%3E%3Cpath d='M0 12 12 0l12 12-12 12z'/%3E%3Cpath d='M24 12 36 0l12 12-12 12z'/%3E%3C/g%3E%3C/svg%3E\")";

export default async function Image() {
  const root = process.cwd();
  const [logo, playfair, playfairItalic, dmSans] = await Promise.all([
    readFile(join(root, 'public/brand/logo-claro.png')),
    readFile(join(root, 'src/components/site/og/playfair-700.ttf')),
    readFile(join(root, 'src/components/site/og/playfair-400-italic.ttf')),
    readFile(join(root, 'src/components/site/og/dmsans-500.ttf')),
  ]);
  const logoSrc = `data:image/png;base64,${logo.toString('base64')}`;
  const c = brand.colors;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: c.noche, color: c.crema, fontFamily: 'DM Sans' }}>
        <div style={{ height: 22, width: '100%', backgroundImage: DIAMONDS, backgroundSize: '44px 22px', opacity: 0.9 }} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 80px', gap: 60 }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ fontSize: 22, letterSpacing: 6, color: c.ambar, textTransform: 'uppercase' }}>Café especial · Caicedo, Antioquia</div>
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 24, fontFamily: 'Playfair', fontSize: 76, lineHeight: 1.04 }}>
              <span>Si vas a tomar café…</span>
              <span style={{ fontFamily: 'Playfair Italic', color: c.ambarClaro }}>que sea de verdad.</span>
            </div>
            <div style={{ marginTop: 30, fontSize: 26, color: 'rgba(248,243,234,0.75)' }}>Tienda · Suscripciones · Academia · Florida, Medellín</div>
          </div>
          <div style={{ display: 'flex', width: 360, height: 420, borderRadius: '180px 180px 28px 28px', background: c.nocheSuave, alignItems: 'center', justifyContent: 'center', border: `2px solid rgba(235,154,55,0.45)` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} width={300} height={201} alt="" />
          </div>
        </div>
        <div style={{ height: 12, width: '100%', background: c.ambar }} />
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Playfair', data: playfair, weight: 700, style: 'normal' },
        { name: 'Playfair Italic', data: playfairItalic, weight: 400, style: 'italic' },
        { name: 'DM Sans', data: dmSans, weight: 500, style: 'normal' },
      ],
    },
  );
}
