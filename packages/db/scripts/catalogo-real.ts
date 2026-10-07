/**
 * Carga el catálogo real de Café Travesía (el que se vendía en el WooCommerce anterior) y retira
 * el contenido de ejemplo de la semilla. Idempotente: se puede correr varias veces.
 *
 * - Crea o actualiza 4 cafés (grano y molido) y 9 accesorios con sus precios y fotos reales.
 *   Los slugs son los del WooCommerce, así /producto/<slug> sigue llevando al mismo producto.
 * - Desactiva (no borra) los 12 productos de ejemplo de la semilla.
 * - Pone en 0 las calificaciones que no vienen de reseñas aprobadas (las de la semilla eran de ejemplo).
 * - Completa la dirección real del punto de Caicedo.
 *
 *   DB_DRIVER=gateway DB_GATEWAY_URL=… DB_GATEWAY_SECRET=… npx tsx scripts/catalogo-real.ts
 */
import { createHash } from 'node:crypto';
import { and, eq, inArray, notInArray, sql } from 'drizzle-orm';
import { getDb, isDbConfigured } from '../src/client';
import * as s from '../src/schema';
import { seedProducts } from '../src/seed-data';

const MEDIA = 'https://media.cafetravesia.co/productos/2026/10';
const img = (f: string) => `${MEDIA}/${f}.webp`;

/** UUID estable a partir de un texto (mismo resultado en cada corrida). */
const sid = (key: string) => {
  const h = createHash('sha1').update(`cafe-travesia:${key}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

type Variant = { name: string; weightG?: number; grind?: string; priceCop: number; sku: string };
type RealProduct = Omit<typeof s.products.$inferInsert, 'id'> & { slug: string; variants: Variant[] };

const grinds = (base: string, weightG: number, priceCop: number, label: string): Variant[] => [
  { name: `${label} · Grano`, weightG, grind: 'grano', priceCop, sku: `${base}-G` },
  { name: `${label} · Molido`, weightG, grind: 'media', priceCop, sku: `${base}-M` },
];

const especial = {
  kind: 'coffee' as const,
  category: 'Línea premium',
  originRegion: 'Antioquia, Colombia',
  producer: 'Jhon Edinson Castrillón',
  variety: 'Bourbon amarillo',
  process: 'Natural',
  roastLevel: 'Medio',
  profile: { tueste: 5, acidez: 8, cuerpo: 7, dulzor: 7, amargor: 3, complejidad: 8 },
  tastingNotes: ['Frutos rojos', 'Acidez brillante', 'Cuerpo cremoso'],
  brewMethods: ['V60', 'Chemex', 'AeroPress', 'Espresso'],
  themeColor: '#111A31',
  accentColor: '#EB9A37',
  subscriptionEligible: true,
};

const saborColombia = {
  kind: 'coffee' as const,
  category: 'Sabor Colombia',
  originRegion: 'Caicedo, Antioquia',
  roastLevel: 'Medio',
  profile: { tueste: 6, acidez: 4, cuerpo: 7, dulzor: 8, amargor: 4, complejidad: 5 },
  tastingNotes: ['Chocolate', 'Panela', 'Dulce y balanceado'],
  brewMethods: ['Espresso', 'Capuchino', 'Greca', 'Prensa francesa'],
  themeColor: '#F8F3EA',
  accentColor: '#111A31',
  subscriptionEligible: true,
};

const coffees: RealProduct[] = [
  {
    ...especial,
    slug: 'cafe-travesia-especial-340-gr',
    name: 'Café Travesía Especial',
    subtitle: 'Bourbon amarillo · proceso natural · 340 g',
    description:
      'Nuestra **línea premium**: un café del productor **Jhon Edinson Castrillón**, variedad **bourbon amarillo** en **proceso natural**.\n\nUna taza muy **afrutada**, de **acidez intensa** y **cuerpo cremoso**. Brilla en métodos filtrados como V60, Chemex o AeroPress.',
    story:
      'Cada lote viene de la finca de Jhon Edinson Castrillón. El proceso natural seca la cereza entera al sol, y de ahí salen las notas frutales que distinguen a este café.\n\nLo tostamos en pequeños lotes para cuidar ese perfil.',
    imageUrl: img('34dcea2bb049abefe561'),
    gallery: [img('34dcea2bb049abefe561'), img('2ef834be80abccbd7f11'), img('0afc1e26ae5d8363faf2')],
    badges: ['Premium'],
    isFeatured: true,
    sortOrder: 1,
    seoTitle: 'Café Travesía Especial · Bourbon amarillo natural 340 g',
    seoDescription: 'Café de especialidad bourbon amarillo de proceso natural: afrutado, acidez intensa y cuerpo cremoso. En grano o molido, con envío a toda Colombia.',
    variants: grinds('CT-ESP-340', 340, 50000, '340 g'),
  },
  {
    ...saborColombia,
    slug: 'cafe-travesia-sabor-colombia-250gr',
    name: 'Café Travesía Sabor Colombia · 250 g',
    subtitle: 'Chocolate y panela · ideal para el desayuno',
    description:
      'Un café **dulce y balanceado**, con las notas a **chocolate y panela** que caracterizan el café colombiano y representan nuestra región.\n\nEs el café para el desayuno, para las **bebidas con leche** y para **espressos y capuchinos**.',
    story: 'Sabor Colombia es el café de todos los días: el que se toma en familia, con leche o solo, y que sabe a nuestra tierra.',
    imageUrl: img('382684980577ee4b1b07'),
    gallery: [img('382684980577ee4b1b07'), img('cbd12d7ba0724cfd6f70')],
    badges: ['Más vendido'],
    isFeatured: true,
    sortOrder: 2,
    seoTitle: 'Café Sabor Colombia 250 g · chocolate y panela | Café Travesía',
    seoDescription: 'Café colombiano dulce y balanceado con notas a chocolate y panela, ideal para espresso, capuchino y bebidas con leche. En grano o molido.',
    variants: grinds('CT-SC-250', 250, 35000, '250 g'),
  },
  {
    ...saborColombia,
    slug: 'cafe-travesia-sabor-colombia-500gr',
    name: 'Café Travesía Sabor Colombia · 500 g',
    subtitle: 'Chocolate y panela · presentación familiar',
    description:
      'El mismo **Sabor Colombia**, dulce y balanceado con notas a **chocolate y panela**, en presentación de **500 g** para la casa o la oficina.\n\nPerfecto para espresso, capuchino y bebidas con leche.',
    story: 'Para las casas cafeteras que no quieren quedarse sin su café de todos los días.',
    imageUrl: img('931f2bdfc6fdec053171'),
    gallery: [img('931f2bdfc6fdec053171'), img('bcf1ea04669c4e8218ec')],
    badges: [],
    isFeatured: false,
    sortOrder: 3,
    seoTitle: 'Café Sabor Colombia 500 g · chocolate y panela | Café Travesía',
    seoDescription: 'Café colombiano de especialidad en 500 g, dulce y balanceado con notas a chocolate y panela. En grano o molido, con envío a toda Colombia.',
    variants: grinds('CT-SC-500', 500, 45000, '500 g'),
  },
  {
    ...saborColombia,
    category: 'Para negocios',
    slug: 'cafe-travesia-especial-2500gr',
    name: 'Café Travesía Especial · 2,5 kg',
    subtitle: 'Presentación para cafeterías y oficinas',
    description:
      'Café **dulce y balanceado**, con notas a **chocolate y panela**, en presentación de **2,5 kg** para cafeterías, restaurantes y oficinas.\n\nRinde en espresso, capuchino y bebidas con leche.',
    story: 'La misma calidad de nuestra tienda, en el formato que necesitan los negocios que sirven café todo el día.',
    imageUrl: img('628b831f9c0c3e339203'),
    gallery: [img('628b831f9c0c3e339203')],
    badges: ['Negocios'],
    isFeatured: false,
    subscriptionEligible: false,
    sortOrder: 4,
    seoTitle: 'Café Travesía 2,5 kg para cafeterías y oficinas',
    seoDescription: 'Café de especialidad en bolsa de 2,5 kg para negocios: dulce, balanceado, notas a chocolate y panela. En grano o molido.',
    variants: grinds('CT-ESP-2500', 2500, 155000, '2,5 kg'),
  },
];

const accessory = (
  slug: string,
  name: string,
  category: string,
  priceCop: number,
  image: string,
  description: string,
  sortOrder: number,
  variantName = 'Unidad',
): RealProduct => ({
  slug,
  name,
  kind: 'accessory',
  category,
  description,
  imageUrl: img(image),
  gallery: [img(image)],
  badges: [],
  isFeatured: false,
  subscriptionEligible: false,
  sortOrder,
  seoTitle: `${name} | Café Travesía`,
  seoDescription: description.replace(/\*\*/g, '').slice(0, 155),
  variants: [{ name: variantName, priceCop, sku: `CT-ACC-${sortOrder}` }],
});

const accessories: RealProduct[] = [
  accessory('cafetera-tipo-chemex-6-tazas', 'Cafetera tipo Chemex 6 tazas', 'Métodos de preparación', 160000, '58c02a908a82e1753f81', 'Cafetera tipo **Chemex** con cuello en madera y corbata de cuero, y líneas de medida en mililitros y tazas.', 20),
  accessory('dripper', 'Dripper de cerámica', 'Métodos de preparación', 60000, '3639d031d5b1276270cc', 'Gotero de **cerámica** que retiene el calor durante todo el ciclo de preparación. Su forma de cono y sus crestas en espiral logran una extracción pareja y un sabor profundo.', 21),
  accessory('dripper-acrilico-3-5-tazas', 'Dripper acrílico 3-5 tazas', 'Métodos de preparación', 45000, '4f8ca8b98925a3dcea3b', 'Gotero de **acrílico** para 3 a 5 tazas, con forma de cono y crestas en espiral para una taza uniforme y llena de sabor.', 22),
  accessory('cafetera-aeropress', 'Cafetera AeroPress', 'Métodos de preparación', 48000, 'c68d952163f796f462c7', 'Método tipo **AeroPress**: incluye cuchara, paleta, embudo y filtros. Fácil de usar e ideal para viajes.', 23),
  accessory('cafetera-moka-3-tazas', 'Cafetera moka 3 tazas', 'Métodos de preparación', 50000, '01f68b75148cf03c970f', 'Cafetera **moka** de 3 tazas para disfrutar un café intenso a cualquier hora del día.', 24),
  accessory('gramera-con-temporizador', 'Gramera con temporizador', 'Accesorios', 165000, '2d147ae8e6bc746b6a8d', 'Gramera **digital con temporizador**, capacidad máxima de 3 kg: pesa el café y el agua y controla el tiempo de extracción.', 25),
  accessory('filtro-v60', 'Filtro V60', 'Filtros', 18000, 'a01bba46edec603e0e18', 'Filtros de papel para **V60**, en blanco y café. Paquete de 40 unidades.', 30, 'Paquete x40'),
  accessory('filtro-chemex', 'Filtro Chemex', 'Filtros', 105000, 'f10168c756ca952bb2fd', 'Filtros de papel para cafetera tipo **Chemex**.', 31, 'Paquete'),
  accessory('filtro-aeropress-de-papel', 'Filtro AeroPress de papel', 'Filtros', 12000, '2d983f74b3e0eede01fe', 'Filtros de papel para **AeroPress**. Paquete de 100 unidades.', 32, 'Paquete x100'),
];

export async function cargarCatalogoReal(log = console.log) {
  if (!isDbConfigured()) throw new Error('Configura la base de datos antes de cargar el catálogo.');
  const db = getDb();
  const real = [...coffees, ...accessories];

  for (const { variants, ...p } of real) {
    const id = sid(`product:${p.slug}`);
    const values = { ...p, id, isActive: true, ratingAvg: 0, ratingCount: 0 };
    const { id: _id, slug: _slug, ...update } = values;
    await db.insert(s.products).values(values).onDuplicateKeyUpdate({ set: update });
    const [row] = await db.select({ id: s.products.id }).from(s.products).where(eq(s.products.slug, p.slug)).limit(1);
    const productId = row!.id;
    const variantIds: string[] = [];
    for (const [i, v] of variants.entries()) {
      const vid = sid(`variant:${v.sku}`);
      variantIds.push(vid);
      const vals = { id: vid, productId, name: v.name, weightG: v.weightG ?? null, grind: v.grind ?? null, priceCop: v.priceCop, compareAtCop: null, stock: 100, sku: v.sku, isActive: true, sortOrder: i };
      const { id: _vid, ...vupd } = vals;
      await db.insert(s.productVariants).values(vals).onDuplicateKeyUpdate({ set: vupd });
    }
    // Variantes que ya no existen en el catálogo real: se desactivan, no se borran (pueden tener pedidos).
    await db.update(s.productVariants).set({ isActive: false }).where(and(eq(s.productVariants.productId, productId), notInArray(s.productVariants.id, variantIds)));
    log(`✓ ${p.name} (${variants.length} variante${variants.length > 1 ? 's' : ''})`);
  }

  const exampleSlugs = seedProducts.map((p) => p.slug);
  await db.update(s.products).set({ isActive: false, isFeatured: false }).where(inArray(s.products.slug, exampleSlugs));
  log(`✓ ${exampleSlugs.length} productos de ejemplo desactivados (no borrados)`);

  // Calificaciones: solo cuentan las reseñas aprobadas.
  await db.execute(sql`UPDATE products p SET rating_count = (SELECT COUNT(*) FROM product_reviews r WHERE r.product_id = p.id AND r.status = 'approved'), rating_avg = COALESCE((SELECT AVG(r.rating) FROM product_reviews r WHERE r.product_id = p.id AND r.status = 'approved'), 0)`);
  await db.execute(sql`UPDATE courses c SET rating_count = (SELECT COUNT(*) FROM product_reviews r WHERE r.course_id = c.id AND r.status = 'approved'), rating_avg = COALESCE((SELECT AVG(r.rating) FROM product_reviews r WHERE r.course_id = c.id AND r.status = 'approved'), 0)`);
  log('✓ Calificaciones recalculadas solo con reseñas aprobadas');

  // Suscripciones: 15 % menos que comprar lo mismo en la tienda (lo que prometen sus beneficios).
  // Base: bolsa de 340 g = Café Travesía Especial ($50.000); bolsa de 500 g = Sabor Colombia 500 g ($45.000).
  const planPrices: Record<string, { priceCop: number; compareAtCop: number }> = {
    explorador: { priceCop: 42500, compareAtCop: 50000 },
    'duo-quincenal': { priceCop: 42500, compareAtCop: 50000 },
    'maestro-premium': { priceCop: 85000, compareAtCop: 100000 },
    oficina: { priceCop: 153000, compareAtCop: 180000 },
    'equipo-grande': { priceCop: 191000, compareAtCop: 225000 },
  };
  for (const [slug, v] of Object.entries(planPrices)) {
    await db.update(s.subscriptionPlans).set(v).where(eq(s.subscriptionPlans.slug, slug));
  }
  log('✓ Precios de suscripción alineados con la tienda (15 % de descuento)');

  await db
    .update(s.stores)
    .set({ address: 'Carrera 4 # 4-07, Caicedo, Antioquia', phone: '+57 314 748 2358', mapUrl: 'https://maps.google.com/?q=Carrera+4+%234-07+Caicedo+Antioquia' })
    .where(eq(s.stores.slug, 'caicedo'));
  log('✓ Dirección real del punto de Caicedo');
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  cargarCatalogoReal().then(
    () => process.exit(0),
    (e) => {
      console.error(e);
      process.exit(1);
    },
  );
}
