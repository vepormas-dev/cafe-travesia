/**
 * Tipos de las respuestas JSON de la API pública (/api/v1/*) que consumen la app
 * móvil y los componentes cliente de la web. Fechas en ISO 8601.
 */
export type SensoryProfile = { tueste: number; acidez: number; cuerpo: number; dulzor: number; amargor: number; complejidad: number };

export type ProductVariantDTO = {
  id: string;
  name: string;
  weightG: number | null;
  grind: string | null;
  priceCop: number;
  compareAtCop: number | null;
  inStock: boolean;
  stock: number;
  eventAt: string | null;
};

export type ProductDTO = {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  kind: 'coffee' | 'merch' | 'accessory' | 'kit' | 'experience';
  category: string | null;
  description: string | null;
  story: string | null;
  originRegion: string | null;
  originFarm: string | null;
  producer: string | null;
  altitudeM: number | null;
  variety: string | null;
  process: string | null;
  roastLevel: string | null;
  profile: SensoryProfile | null;
  tastingNotes: string[];
  brewMethods: string[];
  themeColor: string | null;
  accentColor: string | null;
  imageUrl: string | null;
  gallery: string[];
  badges: string[];
  isFeatured: boolean;
  isSeasonal: boolean;
  subscriptionEligible: boolean;
  ratingAvg: number;
  ratingCount: number;
  priceFromCop: number;
  compareAtCop: number | null;
  variants: ProductVariantDTO[];
};

export type PlanDTO = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  audience: 'personal' | 'empresa';
  frequencyWeeks: number;
  bagsPerDelivery: number;
  bagWeightG: number;
  priceCop: number;
  compareAtCop: number | null;
  includesAcademy: boolean;
  benefits: string[];
  imageUrl: string | null;
  isHighlighted: boolean;
};

export type LessonSummaryDTO = { id: string; title: string; durationS: number; isPreview: boolean; position: number; completed?: boolean };
export type ModuleDTO = { id: string; title: string; position: number; lessons: LessonSummaryDTO[]; quizId?: string | null };

export type CourseDTO = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  coverUrl: string | null;
  trailerUrl: string | null;
  level: 'principiante' | 'intermedio' | 'avanzado';
  category: string | null;
  instructorName: string | null;
  instructorTitle: string | null;
  instructorBio: string | null;
  instructorAvatarUrl: string | null;
  priceCop: number;
  compareAtCop: number | null;
  isFree: boolean;
  includedInSubscription: boolean;
  whatYouLearn: string[];
  requirements: string[];
  durationMin: number;
  lessonsCount: number;
  ratingAvg: number;
  ratingCount: number;
  studentsCount: number;
  isFeatured: boolean;
  modules?: ModuleDTO[];
};

export type CourseAccessDTO = {
  enrolled: boolean;
  canEnrollFree: boolean; // gratis o incluido en su suscripción
  reason: 'enrolled' | 'free' | 'subscription' | 'purchase_required' | 'login_required';
  progressPct: number;
  lastLessonId: string | null;
  completed: boolean;
  certificateCode: string | null;
};

export type LessonDTO = {
  id: string;
  courseId: string;
  courseSlug: string;
  moduleId: string;
  title: string;
  summary: string | null;
  content: string | null;
  videoUrl: string | null;
  videoProvider: 'bunny' | 'mp4' | 'hls' | 'youtube' | 'vimeo';
  durationS: number;
  isPreview: boolean;
  resources: { label: string; url: string }[];
  positionS: number;
  completed: boolean;
  prevLessonId: string | null;
  nextLessonId: string | null;
};

export type OrderItemDTO = { id: string; itemKind: 'product' | 'course' | 'plan'; name: string; variantName: string | null; imageUrl: string | null; unitPriceCop: number; quantity: number; totalCop: number };
export type OrderDTO = {
  id: string;
  number: string;
  status: string;
  kind: string;
  subtotalCop: number;
  discountCop: number;
  shippingCop: number;
  totalCop: number;
  couponCode: string | null;
  pointsEarned: number;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  createdAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  items: OrderItemDTO[];
  shippingAddress: { recipient: string; city: string; region: string; line1: string } | null;
};

export type SubscriptionDTO = {
  id: string;
  status: string;
  plan: PlanDTO;
  product: { id: string; name: string; slug: string; imageUrl: string | null } | null;
  grind: string;
  priceCop: number;
  cardBrand: string | null;
  cardLast4: string | null;
  nextBillingAt: string | null;
  pausedUntil: string | null;
  startedAt: string | null;
  address: { recipient: string; city: string; region: string; line1: string; phone: string } | null;
};

export type MeDTO = {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: 'customer' | 'editor' | 'admin';
  loyaltyPoints: number;
  marketingOptIn: boolean;
  legalIdType: string | null;
  legalId: string | null;
};

export type AiRecommendation = {
  kind: 'product' | 'course' | 'plan';
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  priceCop: number;
  reason: string;
  href: string;
};

export type ChatReplyDTO = {
  sessionId: string;
  status: 'bot' | 'human_requested' | 'human' | 'closed';
  messages: { id: string; role: 'user' | 'assistant' | 'agent' | 'system'; content: string; actions: { type: string; label: string; href?: string }[] | null; createdAt: string }[];
  ai: boolean;
};

export type CheckoutResultDTO = {
  orderId: string;
  number: string;
  totalCop: number;
  /** Datos para el Widget/Web Checkout de Wompi */
  wompi: { publicKey: string; currency: 'COP'; amountInCents: number; reference: string; signatureIntegrity: string; redirectUrl: string; checkoutUrl: string } | null;
  /** Total 0 (cubierto por cupón/puntos): ya quedó pagado */
  paid: boolean;
};

export type ApiError = { error: string; issues?: Record<string, string[]> };
