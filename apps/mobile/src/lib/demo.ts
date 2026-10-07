/**
 * Datos de ejemplo para el MODO DEMO de la app (sin API disponible).
 * Adaptados de packages/db/src/seed-data.ts (no se importa @travesia/db en la app).
 * Precios y textos son ilustrativos: la fuente real es la API.
 */
import type {
  CourseDTO,
  LessonDTO,
  MeDTO,
  OrderDTO,
  PlanDTO,
  ProductDTO,
  ProductVariantDTO,
  SensoryProfile,
  SubscriptionDTO,
  AiRecommendation,
} from '@travesia/shared';

const img = (n: string) => `/brand/fotos/${n}.webp`;
const cid = (parent: string, kind: number, i: number, j = 0) =>
  `${parent.slice(0, 24)}${kind.toString(16)}${i.toString(16).padStart(3, '0')}${j.toString(16).padStart(4, '0')}${parent.slice(-4)}`;

const P = (n: number) => `0f1a6b52-3c1d-4b8e-9a01-0000000000${n.toString().padStart(2, '0')}`;

const coffeeVariants = (pid: string, p340: number, p500: number, stock = 60): ProductVariantDTO[] =>
  [
    { name: '340 g · En grano', weightG: 340, grind: 'grano', priceCop: p340 },
    { name: '340 g · Molido', weightG: 340, grind: 'media', priceCop: p340 },
    { name: '500 g · En grano', weightG: 500, grind: 'grano', priceCop: p500 },
    { name: '500 g · Molido', weightG: 500, grind: 'media', priceCop: p500 },
  ].map((v, i) => ({ ...v, id: cid(pid, 1, i), compareAtCop: null, inStock: true, stock, eventAt: null }));
const simple = (pid: string, rows: { name: string; priceCop: number; compareAtCop?: number; eventAt?: string }[]): ProductVariantDTO[] =>
  rows.map((r, i) => ({ id: cid(pid, 1, i), name: r.name, weightG: null, grind: null, priceCop: r.priceCop, compareAtCop: r.compareAtCop ?? null, inStock: true, stock: 10, eventAt: r.eventAt ?? null }));

type Base = Partial<ProductDTO> & Pick<ProductDTO, 'id' | 'slug' | 'name' | 'kind' | 'variants'>;
const product = (b: Base): ProductDTO => {
  const prices = b.variants.map((v) => v.priceCop);
  return {
    subtitle: null, category: null, description: null, story: null, originRegion: null, originFarm: null, producer: null,
    altitudeM: null, variety: null, process: null, roastLevel: null, profile: null, tastingNotes: [], brewMethods: [],
    themeColor: '#111A31', accentColor: '#EB9A37', imageUrl: null, gallery: [], badges: [], isFeatured: false, isSeasonal: false,
    subscriptionEligible: false, ratingAvg: 4.8, ratingCount: 10,
    priceFromCop: Math.min(...prices),
    compareAtCop: b.variants[0]?.compareAtCop ?? null,
    ...b,
  };
};
const prof = (tueste: number, acidez: number, cuerpo: number, dulzor: number, amargor: number, complejidad: number): SensoryProfile => ({ tueste, acidez, cuerpo, dulzor, amargor, complejidad });

export const demoProducts: ProductDTO[] = [
  product({
    id: P(1), slug: 'travesia-caicedo', name: 'Travesía Caicedo', subtitle: 'Nuestro origen · Caicedo, Antioquia', kind: 'coffee', category: 'Origen único',
    description: 'El café con el que empezó todo. Lotes de altura de familias caficultoras de **Caicedo, Antioquia**, tostado en pequeños lotes para resaltar su dulzura natural.\n\nUn perfil redondo y dulce, con notas de **chocolate y panela**, ideal para el día a día.',
    story: 'Caicedo es un pueblo de montaña al occidente de Antioquia, donde el café no solo se cultiva: se vive. Allá nació nuestra historia.\n\nSeleccionamos cereza por cereza con las familias de la vereda, secamos al sol y tostamos nosotros mismos.',
    originRegion: 'Caicedo, Antioquia', originFarm: 'Fincas familiares aliadas', producer: 'Familias caficultoras de Caicedo', altitudeM: 1900, variety: 'Castillo y Caturra', process: 'Lavado', roastLevel: 'Medio',
    profile: prof(5, 5, 7, 8, 3, 6), tastingNotes: ['Chocolate', 'Panela', 'Nuez'], brewMethods: ['Espresso', 'Prensa francesa', 'Greca', 'V60'],
    themeColor: '#111A31', accentColor: '#EB9A37', imageUrl: img('manos-cafe-caicedo'), gallery: [img('manos-cafe-caicedo'), img('latte-travesia')], badges: ['Más vendido'],
    isFeatured: true, subscriptionEligible: true, ratingAvg: 4.9, ratingCount: 128, variants: coffeeVariants(P(1), 42900, 58900, 120),
  }),
  product({
    id: P(2), slug: 'cima-del-viento', name: 'Cima del Viento', subtitle: 'Edición de temporada · Microlote', kind: 'coffee', category: 'Edición limitada',
    description: 'Un microlote de lo más alto de la cordillera, donde el viento enfría las noches y la cereza madura despacio.\n\nTaza **brillante y floral**, con acidez cítrica y final largo a caramelo.',
    story: 'Cosechado en la parte alta de la vereda, a más de 2.000 metros. Solo unos cuantos sacos por cosecha: cuando se acaba, se acaba hasta el próximo año.',
    originRegion: 'Caicedo, Antioquia', originFarm: 'Finca La Cima', producer: 'Familia aliada de la vereda', altitudeM: 2050, variety: 'Caturra', process: 'Lavado de fermentación extendida', roastLevel: 'Claro',
    profile: prof(3, 8, 5, 7, 2, 9), tastingNotes: ['Jazmín', 'Mandarina', 'Caramelo'], brewMethods: ['V60', 'Chemex', 'AeroPress'],
    themeColor: '#4D6630', accentColor: '#F5C27A', imageUrl: img('taza-frase'), gallery: [img('taza-frase')], badges: ['Edición limitada', 'Altitud alta'],
    isFeatured: true, isSeasonal: true, subscriptionEligible: true, ratingAvg: 4.8, ratingCount: 42, variants: coffeeVariants(P(2), 54900, 74900, 24),
  }),
  product({
    id: P(3), slug: 'honey-de-la-vereda', name: 'Honey de la Vereda', subtitle: 'Proceso honey · Dulce y frutal', kind: 'coffee', category: 'Procesos especiales',
    description: 'Secado con parte del mucílago de la cereza para una taza **dulce, frutal y sedosa**: frutos rojos, miel y cacao.',
    story: 'Un experimento que salió tan bien que se quedó. El proceso honey requiere paciencia: lo secamos en camas africanas, volteando el grano a mano.',
    originRegion: 'Caicedo, Antioquia', originFarm: 'Fincas aliadas', producer: 'Familias caficultoras de Caicedo', altitudeM: 1850, variety: 'Castillo', process: 'Honey', roastLevel: 'Medio claro',
    profile: prof(4, 6, 6, 9, 2, 8), tastingNotes: ['Frutos rojos', 'Miel', 'Cacao'], brewMethods: ['V60', 'Prensa francesa', 'Cold brew'],
    themeColor: '#B23A2E', accentColor: '#F5C27A', imageUrl: img('latte-travesia'), gallery: [img('latte-travesia')], badges: ['Nuevo'],
    isFeatured: true, subscriptionEligible: true, ratingAvg: 4.9, ratingCount: 57, variants: coffeeVariants(P(3), 49900, 67900, 40),
  }),
  product({
    id: P(4), slug: 'blend-de-la-casa', name: 'Blend de la Casa', subtitle: 'El de la barra en Florida', kind: 'coffee', category: 'Blend',
    description: 'El café que servimos en nuestra barra del **Parque Comercial Florida**. Cuerpo alto, dulce y con buena crema: perfecto para espresso y bebidas con leche.',
    story: 'Lo diseñamos con nuestros baristas para que un capuchino sepa a Travesía. Mezcla de lotes de Caicedo con tueste medio-oscuro.',
    originRegion: 'Antioquia', originFarm: 'Lotes seleccionados', producer: 'Café Travesía', altitudeM: 1800, variety: 'Castillo, Caturra y Colombia', process: 'Lavado', roastLevel: 'Medio oscuro',
    profile: prof(7, 3, 8, 7, 5, 5), tastingNotes: ['Cacao', 'Caramelo', 'Avellana'], brewMethods: ['Espresso', 'Moka', 'Greca'],
    themeColor: '#3A2418', accentColor: '#EB9A37', imageUrl: img('barra-travesia'), gallery: [img('barra-travesia'), img('frappe-caramelo')],
    isFeatured: true, subscriptionEligible: true, ratingAvg: 4.7, ratingCount: 91, variants: coffeeVariants(P(4), 39900, 54900, 90),
  }),
  product({
    id: P(5), slug: 'descafeinado-natural', name: 'Descafeinado Natural', subtitle: 'Todo el sabor, sin desvelo', kind: 'coffee', category: 'Descafeinado',
    description: 'Descafeinado con proceso de **caña de azúcar**. Dulce, suave y con notas de panela para la taza de la noche.',
    story: 'Para quienes aman el café pero no a las 10 de la noche.', originRegion: 'Antioquia', altitudeM: 1750, variety: 'Castillo', process: 'Descafeinado EA (caña)', roastLevel: 'Medio',
    profile: prof(5, 3, 6, 7, 3, 4), tastingNotes: ['Panela', 'Galleta', 'Cacao suave'], brewMethods: ['Prensa francesa', 'Greca', 'Espresso'],
    themeColor: '#5B3A26', accentColor: '#FBE7C9', imageUrl: img('latte-travesia'), subscriptionEligible: true, ratingAvg: 4.6, ratingCount: 23, variants: coffeeVariants(P(5), 44900, 61900, 30),
  }),
  product({ id: P(6), slug: 'kit-v60-travesia', name: 'Kit V60 Travesía', subtitle: 'Gotero, filtros y guía de preparación', kind: 'accessory', category: 'Barismo en casa', description: 'Gotero cerámico V60, 100 filtros y nuestra guía impresa con recetas para cada café.', themeColor: '#EFE6D6', accentColor: '#111A31', imageUrl: img('taza-frase'), brewMethods: ['V60'], variants: simple(P(6), [{ name: 'Kit completo', priceCop: 129900, compareAtCop: 149900 }]) }),
  product({ id: P(7), slug: 'prensa-francesa', name: 'Prensa francesa 600 ml', subtitle: 'Vidrio de borosilicato y acero', kind: 'accessory', category: 'Barismo en casa', description: 'El método más sencillo para una taza con cuerpo. Capacidad para 3-4 tazas.', themeColor: '#EFE6D6', accentColor: '#111A31', imageUrl: img('barra-travesia'), variants: simple(P(7), [{ name: '600 ml', priceCop: 89900 }]) }),
  product({ id: P(8), slug: 'mug-travesia', name: 'Mug Travesía', subtitle: 'Cerámica esmaltada · 350 ml', kind: 'merch', category: 'Mugs y termos', description: 'Nuestro mug de cerámica con el logotipo en azul noche y el lema en ámbar.', themeColor: '#F8F3EA', accentColor: '#111A31', imageUrl: img('latte-travesia'), ratingAvg: 4.9, ratingCount: 31, variants: simple(P(8), [{ name: '350 ml', priceCop: 39900 }]) }),
  product({ id: P(9), slug: 'kit-regalo-travesia', name: 'Kit Regalo Travesía', subtitle: '2 cafés + mug + tarjeta', kind: 'kit', category: 'Kits de regalo', description: 'Travesía Caicedo y Honey de la Vereda (250 g c/u), mug Travesía y tarjeta con mensaje personalizado.', themeColor: '#EB9A37', accentColor: '#111A31', imageUrl: img('manos-cafe-caicedo'), badges: ['Ideal para regalar'], isFeatured: true, ratingAvg: 5, ratingCount: 14, variants: simple(P(9), [{ name: 'Caja regalo', priceCop: 139900, compareAtCop: 159900 }]) }),
  product({ id: P(10), slug: 'cata-sensorial-medellin', name: 'Cata sensorial en Florida', subtitle: 'Experiencia · Medellín · 2 horas', kind: 'experience', category: 'Catas y tours', description: 'Aprende a catar como los profesionales en nuestra barra del Parque Comercial Florida. Incluye bolsa de 250 g.', originRegion: 'Medellín', themeColor: '#1E2A4A', accentColor: '#EB9A37', imageUrl: img('barra-travesia'), badges: ['Cupos limitados'], ratingAvg: 5, ratingCount: 26, variants: simple(P(10), [{ name: 'Sábado 7 nov · 10:00 a. m.', priceCop: 95000, eventAt: '2026-11-07T15:00:00Z' }, { name: 'Sábado 21 nov · 10:00 a. m.', priceCop: 95000, eventAt: '2026-11-21T15:00:00Z' }]) }),
  product({ id: P(11), slug: 'travesia-cafetera-caicedo', name: 'Travesía cafetera en Caicedo', subtitle: 'Tour de un día a la finca', kind: 'experience', category: 'Catas y tours', description: 'Visita fincas en Caicedo, recolecta, conoce el beneficio y tuesta tu propio lote. Incluye almuerzo campesino y transporte desde Medellín.', originRegion: 'Caicedo, Antioquia', themeColor: '#4D6630', accentColor: '#F5C27A', imageUrl: img('manos-cafe-caicedo'), badges: ['Experiencia de origen'], ratingAvg: 5, ratingCount: 11, variants: simple(P(11), [{ name: 'Domingo 15 nov', priceCop: 320000, eventAt: '2026-11-15T11:00:00Z' }]) }),
  product({ id: P(12), slug: 'gorra-travesia', name: 'Gorra Travesía', subtitle: 'Azul noche · bordado ámbar', kind: 'merch', category: 'Ropa', description: 'La gorra de nuestro equipo de barra. Algodón, correa ajustable y logotipo bordado.', themeColor: '#111A31', accentColor: '#EB9A37', imageUrl: img('aromatica-frutos'), variants: simple(P(12), [{ name: 'Talla única', priceCop: 59900 }]) }),
];

const PL = (n: number) => `2a7d3e20-5b6c-4a22-9e00-00000000000${n}`;
export const demoPlans: PlanDTO[] = [
  { id: PL(1), slug: 'explorador', name: 'Explorador', tagline: 'Un origen distinto cada mes', description: 'Una bolsa de 340 g al mes, elegida por nuestros tostadores.', audience: 'personal', frequencyWeeks: 4, bagsPerDelivery: 1, bagWeightG: 340, priceCop: 39900, compareAtCop: 46900, includesAcademy: false, benefits: ['1 bolsa de 340 g al mes', 'Envío gratis', '15 % menos que en tienda', 'Pausa o cancela cuando quieras'], imageUrl: img('manos-cafe-caicedo'), isHighlighted: false },
  { id: PL(2), slug: 'maestro-premium', name: 'Maestro Premium', tagline: 'Café + Academia Travesía', description: 'Dos bolsas al mes y acceso completo a la Academia.', audience: 'personal', frequencyWeeks: 4, bagsPerDelivery: 2, bagWeightG: 340, priceCop: 89900, compareAtCop: 119800, includesAcademy: true, benefits: ['2 bolsas de 340 g al mes', 'Todos los cursos de la Academia', 'Ediciones de temporada primero', 'Envío gratis'], imageUrl: img('latte-travesia'), isHighlighted: true },
  { id: PL(3), slug: 'duo-quincenal', name: 'Dúo Quincenal', tagline: 'Para casas cafeteras', description: 'Una bolsa cada dos semanas para no quedarte nunca sin café.', audience: 'personal', frequencyWeeks: 2, bagsPerDelivery: 1, bagWeightG: 340, priceCop: 37900, compareAtCop: 42900, includesAcademy: false, benefits: ['1 bolsa cada 2 semanas', 'Envío gratis', 'Elige grano o molido'], imageUrl: img('barra-travesia'), isHighlighted: false },
  { id: PL(4), slug: 'oficina', name: 'Oficina', tagline: 'Café de especialidad para tu equipo', description: '2 kg al mes con factura electrónica.', audience: 'empresa', frequencyWeeks: 4, bagsPerDelivery: 4, bagWeightG: 500, priceCop: 219000, compareAtCop: 259600, includesAcademy: false, benefits: ['4 bolsas de 500 g al mes', 'Factura electrónica', 'Capacitación de barismo', 'Asesor dedicado'], imageUrl: img('florida-lugar-diferente'), isHighlighted: true },
];

type L = { title: string; summary: string; durationS: number; isPreview?: boolean; content?: string };
type Q = { title: string; passScore: number; questions: { prompt: string; options: string[]; correctIndex: number; explanation: string }[] };
type M = { title: string; lessons: L[]; quiz?: Q };
type CourseSeed = Omit<CourseDTO, 'id' | 'modules' | 'lessonsCount' | 'studentsCount' | 'trailerUrl' | 'instructorAvatarUrl' | 'compareAtCop' | 'instructorBio'> &
  Partial<Pick<CourseDTO, 'compareAtCop' | 'instructorBio'>>;

const CR = (n: number) => `1c0e5a10-7d2b-4c11-8f00-00000000000${n}`;
const demoLessonMap = new Map<string, LessonDTO>();
export const demoQuizzes = new Map<string, Q & { id: string; courseSlug: string }>();
const SAMPLE_VIDEO = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

function course(id: string, c: CourseSeed, modules: M[]): CourseDTO {
  const flat: { l: L; id: string; moduleId: string }[] = [];
  const mods = modules.map((m, mi) => {
    const moduleId = cid(id, 2, mi);
    const lessons = m.lessons.map((l, li) => {
      const lid = cid(id, 3, mi, li);
      flat.push({ l, id: lid, moduleId });
      return { id: lid, title: l.title, durationS: l.durationS, isPreview: !!l.isPreview, position: li + 1 };
    });
    let quizId: string | null = null;
    if (m.quiz) {
      quizId = cid(id, 4, mi);
      demoQuizzes.set(quizId, { ...m.quiz, id: quizId, courseSlug: c.slug });
    }
    return { id: moduleId, title: m.title, position: mi + 1, lessons, quizId };
  });
  flat.forEach((f, i) =>
    demoLessonMap.set(f.id, {
      id: f.id, courseId: id, courseSlug: c.slug, moduleId: f.moduleId, title: f.l.title, summary: f.l.summary,
      content: f.l.content ?? `${f.l.summary}\n\nEn esta lección trabajamos con **ejemplos de nuestra barra** y de las fincas de Caicedo. Toma nota de los conceptos clave y prueba en casa.`,
      videoUrl: f.l.isPreview ? SAMPLE_VIDEO : null, videoProvider: 'mp4', durationS: f.l.durationS, isPreview: !!f.l.isPreview, resources: [],
      positionS: 0, completed: false, prevLessonId: flat[i - 1]?.id ?? null, nextLessonId: flat[i + 1]?.id ?? null,
    }),
  );
  return {
    ...c, id, trailerUrl: null, instructorAvatarUrl: null, compareAtCop: c.compareAtCop ?? null, instructorBio: c.instructorBio ?? null,
    lessonsCount: flat.length, studentsCount: c.ratingCount * 4, modules: mods,
  };
}

export const demoCourses: CourseDTO[] = [
  course(CR(1), {
    slug: 'fundamentos-del-grano', title: 'Fundamentos del Grano', subtitle: 'Del cafeto a la taza: entiende qué hace especial a un café',
    description: '¿Sabías que no todos los cafés son especiales? Recorremos el viaje del grano desde la finca en Caicedo hasta tu taza: variedades, procesos, puntaje SCA y cómo leer una etiqueta.',
    coverUrl: img('manos-cafe-caicedo'), level: 'principiante', category: 'Origen', instructorName: 'Gabriel Travesía', instructorTitle: 'Fundador y caficultor',
    instructorBio: 'Creció entre cafetales en Caicedo, Antioquia. Hoy lidera el tueste y las alianzas con las familias de la vereda.',
    priceCop: 0, isFree: true, includedInSubscription: true,
    whatYouLearn: ['Qué es un café especial (más de 80 puntos SCA)', 'Variedades y procesos: lavado, honey y natural', 'Cómo leer la etiqueta de una bolsa', 'Por qué el origen lo cambia todo'],
    requirements: ['Ninguno: solo ganas de aprender'], durationMin: 45, ratingAvg: 4.9, ratingCount: 312, isFeatured: true,
  }, [
    { title: 'El origen', lessons: [
      { title: 'Bienvenida a la travesía', summary: 'Quiénes somos y cómo aprovechar el curso.', durationS: 240, isPreview: true, content: 'Venimos desde **Caicedo, Antioquia**, donde el café no solo se cultiva, sino que se vive.\n\nEn este curso vas a entender por qué no todos los cafés son iguales.' },
      { title: 'Del cafeto a la cereza', summary: 'Ciclo del cultivo, sombra y altura.', durationS: 540 },
      { title: '¿Qué es un café especial?', summary: 'La escala SCA y los defectos.', durationS: 600, content: 'Un café especial obtiene **más de 80 puntos** en la escala SCA:\n\n- Mejor aroma\n- Sabor más limpio\n- Cero defectos primarios' },
    ], quiz: { title: 'Evaluación: el origen', passScore: 70, questions: [
      { prompt: '¿Desde qué puntaje SCA se considera especial un café?', options: ['70 puntos', '80 puntos', '90 puntos'], correctIndex: 1, explanation: 'La SCA considera especial un café desde 80 puntos.' },
      { prompt: '¿Qué aporta la altura al grano?', options: ['Maduración más lenta y mayor complejidad', 'Más cafeína', 'Granos más grandes siempre'], correctIndex: 0, explanation: 'El clima frío de altura hace que la cereza madure despacio y concentre azúcares.' },
    ] } },
    { title: 'Procesos y etiqueta', lessons: [
      { title: 'Lavado, honey y natural', summary: 'Cómo el beneficio cambia la taza.', durationS: 660 },
      { title: 'Cómo leer una etiqueta', summary: 'Variedad, proceso, altura, fecha de tueste.', durationS: 420 },
    ] },
  ]),
  course(CR(2), {
    slug: 'maestria-en-extraccion-espresso', title: 'Maestría en Extracción: Espresso', subtitle: 'Domina molienda, dosis, tiempo y textura de leche',
    description: 'El curso insignia de nuestra barra en Florida. Calibra un espresso, diagnostica sub y sobre extracción y texturiza leche para latte art.',
    coverUrl: img('latte-travesia'), level: 'intermedio', category: 'Barismo', instructorName: 'Alex Travesía', instructorTitle: 'Barista líder · Florida',
    instructorBio: 'Barista campeón regional y formador del equipo de barra de Café Travesía en Medellín.',
    priceCop: 149000, compareAtCop: 189000, isFree: false, includedInSubscription: true,
    whatYouLearn: ['Calibrar receta: dosis, rendimiento y tiempo', 'Diagnosticar extracción por sabor', 'Texturizar leche y latte art básico', 'Mantenimiento de máquina y molino'],
    requirements: ['Acceso a una máquina de espresso'], durationMin: 165, ratingAvg: 4.9, ratingCount: 184, isFeatured: true,
  }, [
    { title: 'Calibración', lessons: [
      { title: 'Anatomía del espresso', summary: 'Crema, cuerpo y corazón.', durationS: 480, isPreview: true },
      { title: 'Calibración de molienda fina', summary: 'El ajuste que lo cambia todo.', durationS: 720 },
      { title: 'Receta: dosis, rendimiento y tiempo', summary: 'Ratio 1:2 y cómo moverlo.', durationS: 840 },
    ] },
    { title: 'Leche y latte art', lessons: [
      { title: 'Texturizar leche', summary: 'Aire, rotación y temperatura.', durationS: 780 },
      { title: 'Corazón y tulipán', summary: 'Tus primeros diseños.', durationS: 900 },
    ], quiz: { title: 'Evaluación final', passScore: 70, questions: [
      { prompt: 'Un espresso ácido y aguado en 18 s indica…', options: ['Sobreextracción', 'Subextracción', 'Extracción ideal'], correctIndex: 1, explanation: 'Poco tiempo y sabor ácido = subextracción: muele más fino.' },
      { prompt: 'Ratio clásico de un espresso', options: ['1:1', '1:2', '1:5'], correctIndex: 1, explanation: '1:2 (18 g de café → 36 g de bebida) es el punto de partida clásico.' },
    ] } },
  ]),
  course(CR(3), {
    slug: 'la-ciencia-del-tueste', title: 'La Ciencia detrás del Tueste Perfecto', subtitle: 'Reacciones de Maillard, curvas y perfiles',
    description: 'Descubre la química detrás del aroma y el sabor: cómo el calor transforma azúcares y aminoácidos y cómo diseñar perfiles de tueste.',
    coverUrl: img('barra-travesia'), level: 'avanzado', category: 'Tueste', instructorName: 'Gabriel Travesía', instructorTitle: 'Maestro tostador',
    priceCop: 189000, isFree: false, includedInSubscription: true,
    whatYouLearn: ['Fases del tueste', 'Reacciones de Maillard y caramelización', 'Leer una curva de tueste', 'Perfil para filtrado y para espresso'],
    requirements: ['Haber tomado Fundamentos del Grano (recomendado)'], durationMin: 210, ratingAvg: 4.8, ratingCount: 67, isFeatured: false,
  }, [
    { title: 'Química del tueste', lessons: [
      { title: 'Introducción al tostado', summary: 'Secado, Maillard y desarrollo.', durationS: 520, isPreview: true },
      { title: 'Las reacciones de Maillard', summary: 'Descubre la ciencia detrás del aroma y el sabor: cómo el calor transforma los azúcares y aminoácidos en el alma de tu taza.', durationS: 1440 },
    ] },
    { title: 'Perfiles', lessons: [
      { title: 'Curvas de tueste', summary: 'RoR, primer crack y desarrollo.', durationS: 960 },
      { title: 'Perfil para espresso vs. filtrado', summary: 'Mismo grano, dos destinos.', durationS: 1080 },
    ] },
  ]),
  course(CR(4), {
    slug: 'metodos-de-filtrado', title: 'Métodos de Filtrado en Casa', subtitle: 'V60, Chemex, prensa francesa y AeroPress',
    description: 'Recetas probadas para preparar en casa un café como el de la barra. Molienda, temperatura y vertido para cada método.',
    coverUrl: img('taza-frase'), level: 'principiante', category: 'Preparación', instructorName: 'Alex Travesía', instructorTitle: 'Barista líder · Florida',
    priceCop: 89000, isFree: false, includedInSubscription: true,
    whatYouLearn: ['Receta base para V60 y Chemex', 'Prensa francesa sin sedimento', 'AeroPress invertida', 'Ajustar una receta según el sabor'],
    requirements: ['Un método de filtrado y una balanza (ideal)'], durationMin: 95, ratingAvg: 4.8, ratingCount: 143, isFeatured: true,
  }, [
    { title: 'Métodos', lessons: [
      { title: 'Agua, molienda y temperatura', summary: 'Las tres variables.', durationS: 420, isPreview: true },
      { title: 'V60 paso a paso', summary: 'Bloom y vertidos.', durationS: 720 },
      { title: 'Chemex: receta paso a paso', summary: 'Taza limpia y brillante.', durationS: 660 },
      { title: 'Prensa francesa y AeroPress', summary: 'Inmersión.', durationS: 780 },
    ] },
  ]),
];

export const demoLesson = (id: string) => demoLessonMap.get(id) ?? null;

/* ---------- Datos personales de ejemplo (solo modo demo) ---------- */
const espresso = demoCourses[1]!;
const tueste = demoCourses[2]!;
const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

export const demoMe: MeDTO = {
  id: 'demo-user', email: 'cliente@ejemplo.co', fullName: 'Cliente Travesía', phone: '+57 300 000 0000', avatarUrl: null,
  role: 'customer', loyaltyPoints: 1240, marketingOptIn: true, legalIdType: 'CC', legalId: '1000000000',
};

export const demoAcademyMe = {
  enrollments: [
    { course: espresso, progressPct: 65, lastLessonId: espresso.modules![0]!.lessons[1]!.id, status: 'active', completedAt: null },
    { course: tueste, progressPct: 20, lastLessonId: tueste.modules![0]!.lessons[1]!.id, status: 'active', completedAt: null },
  ],
  certificates: [{ code: 'CT-DEMO-0001', courseTitle: 'Fundamentos del Grano', issuedAt: daysFromNow(-40), url: '/api/certificates/CT-DEMO-0001' }],
};

export const demoSubscriptions: SubscriptionDTO[] = [
  {
    id: 'demo-sub', status: 'active', plan: demoPlans[1]!, product: { id: P(2), name: 'Cima del Viento', slug: 'cima-del-viento', imageUrl: img('taza-frase') },
    grind: 'grano', priceCop: 89900, cardBrand: 'VISA', cardLast4: '4242', nextBillingAt: daysFromNow(6), pausedUntil: null, startedAt: daysFromNow(-90),
    address: { recipient: 'Cliente Travesía', city: 'Medellín', region: 'Antioquia', line1: 'Calle 10 # 40-20', phone: '+57 300 000 0000' },
  },
];

export const demoOrders: OrderDTO[] = [
  {
    id: 'demo-order-1', number: 'CT-261001-K4Q9', status: 'shipped', kind: 'store', subtotalCop: 97800, discountCop: 0, shippingCop: 7000, totalCop: 104800,
    couponCode: null, pointsEarned: 97, carrier: 'Servientrega', trackingNumber: '2150000000', trackingUrl: 'https://www.servientrega.com',
    createdAt: daysFromNow(-3), paidAt: daysFromNow(-3), shippedAt: daysFromNow(-1), deliveredAt: null,
    items: [
      { id: 'i1', itemKind: 'product', name: 'Cima del Viento', variantName: '340 g · En grano', imageUrl: img('taza-frase'), unitPriceCop: 54900, quantity: 1, totalCop: 54900 },
      { id: 'i2', itemKind: 'product', name: 'Travesía Caicedo', variantName: '340 g · Molido', imageUrl: img('manos-cafe-caicedo'), unitPriceCop: 42900, quantity: 1, totalCop: 42900 },
    ],
    shippingAddress: { recipient: 'Cliente Travesía', city: 'Medellín', region: 'Antioquia', line1: 'Calle 10 # 40-20' },
  },
  {
    id: 'demo-order-2', number: 'CT-260912-P7XW', status: 'delivered', kind: 'store', subtotalCop: 39900, discountCop: 0, shippingCop: 7000, totalCop: 46900,
    couponCode: null, pointsEarned: 39, carrier: 'Servientrega', trackingNumber: null, trackingUrl: null,
    createdAt: daysFromNow(-25), paidAt: daysFromNow(-25), shippedAt: daysFromNow(-24), deliveredAt: daysFromNow(-22),
    items: [{ id: 'i3', itemKind: 'product', name: 'Mug Travesía', variantName: '350 ml', imageUrl: img('latte-travesia'), unitPriceCop: 39900, quantity: 1, totalCop: 39900 }],
    shippingAddress: { recipient: 'Cliente Travesía', city: 'Medellín', region: 'Antioquia', line1: 'Calle 10 # 40-20' },
  },
];

export const demoNotifications = {
  notifications: [
    { id: 'n1', title: 'Tu pedido va en camino 🚚', body: 'CT-261001-K4Q9 salió con Servientrega.', deepLink: '/cuenta/pedidos/demo-order-1', kind: 'order', readAt: null, createdAt: daysFromNow(-1) },
    { id: 'n2', title: 'Nueva edición de temporada', body: 'Cima del Viento ya está disponible. ¡Pocos sacos!', deepLink: '/tienda/cima-del-viento', kind: 'campaign', readAt: daysFromNow(-4), createdAt: daysFromNow(-5) },
    { id: 'n3', title: 'Seguí aprendiendo', body: 'Te falta poco para terminar Maestría en Extracción.', deepLink: '/academia/cursos/maestria-en-extraccion-espresso', kind: 'academy', readAt: daysFromNow(-6), createdAt: daysFromNow(-7) },
  ],
  unread: 1,
};

export const demoLoyalty = {
  points: 1240,
  ledger: [
    { points: 97, reason: 'Compra CT-261001-K4Q9', createdAt: daysFromNow(-3) },
    { points: 39, reason: 'Compra CT-260912-P7XW', createdAt: daysFromNow(-25) },
    { points: 1104, reason: 'Compras anteriores', createdAt: daysFromNow(-60) },
  ],
};

export const demoAddresses = [
  { id: 'a1', label: 'Casa', recipient: 'Cliente Travesía', phone: '+57 300 000 0000', region: 'Antioquia', city: 'Medellín', line1: 'Calle 10 # 40-20', line2: 'Apto 501', notes: null, isDefault: true },
];

export const demoShippingZones = [
  { id: 'z1', name: 'Valle de Aburrá', regions: [], cities: ['Medellín', 'Envigado', 'Itagüí', 'Sabaneta', 'Bello', 'La Estrella', 'Caldas', 'Copacabana', 'Girardota', 'Barbosa'], rateCop: 7000, freeFromCop: 99000, etaDays: '1-2 días hábiles', isDefault: false },
  { id: 'z2', name: 'Resto de Antioquia', regions: ['Antioquia'], cities: [], rateCop: 11000, freeFromCop: 140000, etaDays: '2-3 días hábiles', isDefault: false },
  { id: 'z3', name: 'Ciudades principales', regions: ['Bogotá D.C.', 'Valle del Cauca', 'Atlántico', 'Santander', 'Risaralda', 'Caldas', 'Quindío'], cities: [], rateCop: 13000, freeFromCop: 160000, etaDays: '2-4 días hábiles', isDefault: false },
  { id: 'z4', name: 'Nacional', regions: [], cities: [], rateCop: 16000, freeFromCop: 180000, etaDays: '3-6 días hábiles', isDefault: true },
];

export const demoCoupons = [
  { code: 'BIENVENIDA10', description: '10 % en tu primera compra', kind: 'percent' as const, value: 10, scope: 'all' as const, minSubtotalCop: 0 },
  { code: 'ENVIOGRATIS', description: 'Envío gratis desde $80.000', kind: 'free_shipping' as const, value: 0, scope: 'products' as const, minSubtotalCop: 80000 },
  { code: 'ACADEMIA20', description: '20 % en cursos', kind: 'percent' as const, value: 20, scope: 'courses' as const, minSubtotalCop: 0 },
];

/** Recomendaciones por reglas (equivalente local de /api/ai/recommend). */
export function demoRecommend(exclude?: string): AiRecommendation[] {
  const picks = demoProducts.filter((p) => p.kind === 'coffee' && p.slug !== exclude).slice(0, 3);
  const reasons = ['Si te gusta lo dulce y achocolatado, este es tu café de diario.', 'Floral y brillante: ideal para tu V60 del fin de semana.', 'Frutal y sedoso, perfecto para cold brew.'];
  return [
    ...picks.map((p, i) => ({ kind: 'product' as const, id: p.id, slug: p.slug, title: p.name, subtitle: p.subtitle, imageUrl: p.imageUrl, priceCop: p.priceFromCop, reason: reasons[i % 3]!, href: `/tienda/${p.slug}` })),
    { kind: 'course' as const, id: espresso.id, slug: espresso.slug, title: espresso.title, subtitle: espresso.subtitle, imageUrl: espresso.coverUrl, priceCop: espresso.priceCop, reason: 'Lleva tu espresso de casa al nivel de la barra.', href: `/academia/cursos/${espresso.slug}` },
  ];
}

export function demoSearch(query: string): AiRecommendation[] {
  const q = query.toLowerCase();
  const words = q.split(/\s+/).filter((w) => w.length > 2);
  const score = (p: ProductDTO) => {
    const hay = [p.name, p.subtitle, p.description, p.tastingNotes.join(' '), p.brewMethods.join(' '), p.process, p.roastLevel].join(' ').toLowerCase();
    return words.reduce((s, w) => s + (hay.includes(w) ? 1 : 0), 0);
  };
  return demoProducts
    .map((p) => ({ p, s: score(p) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 5)
    .map(({ p }) => ({ kind: 'product' as const, id: p.id, slug: p.slug, title: p.name, subtitle: p.subtitle, imageUrl: p.imageUrl, priceCop: p.priceFromCop, reason: p.tastingNotes.length ? `Notas de ${p.tastingNotes.join(', ').toLowerCase()}.` : (p.subtitle ?? ''), href: `/tienda/${p.slug}` }));
}
