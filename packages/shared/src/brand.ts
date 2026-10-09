/**
 * Identidad Café Travesía — fuente única para web, app, correos y PDFs.
 * Derivada del logotipo oficial y las piezas del Drive de marca (azul noche + ámbar,
 * patrón andino de rombos), la propuesta de Punto D' Partida (editorial, cálida)
 * y el sitio actual cafetravesia.co (Caicedo, Antioquia).
 */
export const brand = {
  name: 'Café Travesía',
  /** Razón social del certificado de existencia del 28 de agosto de 2026. */
  legalName: 'Café La Montaña S.A.S.',
  nit: '901049274-1',
  address: 'Carrera 4 # 4-07',
  municipality: 'Caicedo, Antioquia',
  notificationEmail: 'cafedecaicedo@gmail.com',
  tagline: 'la esencia de lo que somos',
  claim: 'Cultivamos, tostamos y servimos café especial. Porque si vas a tomar café… que sea de verdad.',
  origin: 'Caicedo, Antioquia',
  domain: 'cafetravesia.co',
  email: 'info@cafetravesia.co',
  phone: '',
  whatsapp: '573147482358',
  instagram: 'https://instagram.com/cafetravesia',
  facebook: 'https://facebook.com/cafetravesia',
  tiktok: 'https://tiktok.com/@cafetravesia',
  colors: {
    /** Azul noche del logotipo — color principal */
    noche: '#111A31',
    nocheProfundo: '#0A1022',
    nocheSuave: '#1E2A4A',
    /** Ámbar del lema "la esencia de lo que somos" — acento */
    ambar: '#EB9A37',
    ambarClaro: '#F5C27A',
    ambarProfundo: '#C4741A',
    /** Fondos cálidos (papel de empaque / pergamino) */
    crema: '#F8F3EA',
    arena: '#EFE6D6',
    hueso: '#FFFCF7',
    /** Tierra y montaña de Caicedo — secundarios */
    tostado: '#3A2418',
    cafe: '#5B3A26',
    montana: '#4D6630',
    hoja: '#7C9A4E',
    cereza: '#B23A2E',
    tinta: '#1B1C19',
  },
  fonts: {
    display: 'Playfair Display',
    body: 'DM Sans',
    accent: 'Caveat Brush',
  },
} as const;

export type BrandColor = keyof typeof brand.colors;
