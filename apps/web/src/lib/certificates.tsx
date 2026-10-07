import 'server-only';
/**
 * Certificado PDF de la Academia Travesía (A4 horizontal) con @react-pdf/renderer.
 * Fuentes estándar PDF (Times/Helvetica): no requieren descarga y soportan tildes y ñ.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Document, Image, Page, Path, StyleSheet, Svg, Text, View, renderToBuffer } from '@react-pdf/renderer';
import { brand, formatDate } from '@travesia/shared';
import { env } from '@/lib/env';
import type { CertificateView } from '@/lib/academy';

const c = brand.colors;
const W = 842;
const H = 595;

const s = StyleSheet.create({
  page: { backgroundColor: c.crema, position: 'relative', fontFamily: 'Helvetica', color: c.noche },
  frameOuter: { position: 'absolute', top: 18, left: 18, right: 18, bottom: 18, borderWidth: 2, borderColor: c.noche, borderRadius: 6 },
  frameInner: { position: 'absolute', top: 26, left: 26, right: 26, bottom: 26, borderWidth: 0.8, borderColor: c.ambar, borderRadius: 4 },
  body: { position: 'absolute', top: 58, left: 70, right: 70, bottom: 50, alignItems: 'center' },
  eyebrow: { fontSize: 9, letterSpacing: 3.5, color: c.ambarProfundo, fontFamily: 'Helvetica-Bold', marginTop: 6 },
  title: { fontFamily: 'Times-Italic', fontSize: 34, marginTop: 8, color: c.noche },
  small: { fontSize: 10.5, color: '#5b5a60', marginTop: 14 },
  name: { fontFamily: 'Times-Bold', fontSize: 38, marginTop: 6, color: c.noche, textAlign: 'center' },
  rule: { width: 260, height: 1, backgroundColor: c.ambar, marginTop: 8 },
  course: { fontFamily: 'Times-Italic', fontSize: 22, marginTop: 6, color: c.tostado, textAlign: 'center', maxWidth: 560 },
  meta: { fontSize: 10.5, color: '#4a4a52', marginTop: 10, textAlign: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  col: { width: 210, alignItems: 'center' },
  colLabel: { fontSize: 7.5, letterSpacing: 2, color: '#7a7670', marginTop: 4, fontFamily: 'Helvetica-Bold' },
  colValue: { fontSize: 11, color: c.noche },
  signature: { fontFamily: 'Times-BoldItalic', fontSize: 24, color: c.noche },
  sigLine: { width: 160, height: 0.8, backgroundColor: c.noche, marginTop: 2 },
  code: { fontFamily: 'Courier-Bold', fontSize: 12, color: c.noche, letterSpacing: 1 },
  url: { fontSize: 7.5, color: '#6b6560', marginTop: 3 },
  sample: { position: 'absolute', top: 36, right: 40, fontSize: 8, color: c.cereza, letterSpacing: 2, fontFamily: 'Helvetica-Bold' },
});

/** Banda del patrón andino (rombos dobles ámbar), como en las piezas de marca. */
function AndinoBand({ y, width = W - 120, x = 60 }: { y: number; width?: number; x?: number }) {
  const n = Math.floor(width / 24);
  let d = '';
  for (let i = 0; i < n; i++) {
    const cx = i * 24 + 12;
    d += `M${cx - 12} 6 L${cx} 0 L${cx + 12} 6 L${cx} 12 Z `;
    d += `M${cx - 5} 6 L${cx} 1 L${cx + 5} 6 L${cx} 11 Z `;
  }
  return (
    <Svg width={n * 24} height={12} style={{ position: 'absolute', top: y, left: x + (width - n * 24) / 2 }}>
      <Path d={d} stroke={c.ambar} strokeWidth={0.9} fill="none" />
    </Svg>
  );
}

function Corner({ top, left, flipX, flipY }: { top: number; left: number; flipX?: boolean; flipY?: boolean }) {
  const t = `scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})`;
  return (
    <Svg width={34} height={34} viewBox="-17 -17 34 34" style={{ position: 'absolute', top, left }}>
      <Path transform={t} d="M-14 -14 L0 -14 L-14 0 Z M-8 -14 L-14 -8" stroke={c.ambar} strokeWidth={0.9} fill="none" />
      <Path transform={t} d="M-6 -6 L0 -12 L6 -6 L0 0 Z" fill={c.ambar} />
    </Svg>
  );
}

let logoCache: Buffer | null = null;
async function logo() {
  if (!logoCache) logoCache = await readFile(path.join(process.cwd(), 'public/brand/logo.png'));
  return logoCache;
}

export async function renderCertificatePdf(cert: CertificateView): Promise<Buffer> {
  const verifyUrl = `${env.siteUrl}/certificados/${cert.code}`;
  const logoBuf = await logo().catch(() => null);
  const doc = (
    <Document title={`Certificado ${cert.code} · ${cert.courseTitle}`} author={brand.name} subject="Certificado de finalización" creator="Academia Travesía">
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.frameOuter} fixed />
        <View style={s.frameInner} fixed />
        <AndinoBand y={36} />
        <AndinoBand y={H - 48} />
        <Corner top={30} left={30} />
        <Corner top={30} left={W - 64} flipX />
        <Corner top={H - 64} left={30} flipY />
        <Corner top={H - 64} left={W - 64} flipX flipY />
        {cert.sample ? <Text style={s.sample}>MUESTRA · SIN VALIDEZ</Text> : null}

        <View style={s.body}>
          {logoBuf ? <Image src={{ data: logoBuf, format: 'png' }} style={{ width: 132, height: 88 }} /> : <Text style={s.title}>{brand.name}</Text>}
          <Text style={s.eyebrow}>ACADEMIA TRAVESÍA · {brand.origin.toUpperCase()}</Text>
          <Text style={s.title}>Certificado de finalización</Text>
          <Text style={s.small}>Se otorga con orgullo a</Text>
          <Text style={s.name}>{cert.holderName}</Text>
          <View style={s.rule} />
          <Text style={s.small}>por completar satisfactoriamente el curso</Text>
          <Text style={s.course}>{cert.courseTitle}</Text>
          <Text style={s.meta}>
            Intensidad de {cert.hours} {cert.hours === 1 ? 'hora' : 'horas'}
            {cert.instructorName ? `  ·  Instructor: ${cert.instructorName}` : ''}
          </Text>

          <View style={s.footer}>
            <View style={s.col}>
              <Text style={s.colValue}>{formatDate(cert.issuedAt)}</Text>
              <View style={[s.sigLine, { width: 140, backgroundColor: c.ambar }]} />
              <Text style={s.colLabel}>FECHA DE EMISIÓN</Text>
            </View>
            <View style={s.col}>
              <Text style={s.signature}>Gabriel</Text>
              <View style={s.sigLine} />
              <Text style={s.colLabel}>GABRIEL · FUNDADOR</Text>
            </View>
            <View style={s.col}>
              <Text style={s.code}>{cert.code}</Text>
              <View style={[s.sigLine, { width: 140, backgroundColor: c.ambar }]} />
              <Text style={s.colLabel}>CÓDIGO DE VERIFICACIÓN</Text>
              <Text style={s.url}>{verifyUrl.replace(/^https?:\/\//, '')}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
