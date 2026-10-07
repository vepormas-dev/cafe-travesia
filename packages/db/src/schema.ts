/**
 * Esquema MySQL / MariaDB (alojado en cPanel) — Café Travesía.
 *
 * Convenciones:
 *  - IDs: UUID v4 en varchar(36) generados en la app (portables y seguros para URLs).
 *  - Fechas: datetime(3) en UTC (mode 'date').
 *  - Dinero: enteros en COP (sin decimales).
 *  - JSON: LONGTEXT serializado (compatible con MariaDB y la pasarela PHP).
 *  - No hay RLS: el control de acceso vive en la capa de servidor (lib/auth + lib/data).
 */
import { sql } from 'drizzle-orm';
import {
  boolean,
  datetime,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  tinyint,
  uniqueIndex,
  varchar,
  mediumtext,
  double,
} from 'drizzle-orm/mysql-core';
import { jsonText } from './types';

const id = () =>
  varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const ref = (name: string) => varchar(name, { length: 36 });
const createdAt = () =>
  datetime('created_at', { mode: 'date', fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`);
const updatedAt = () =>
  datetime('updated_at', { mode: 'date', fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`)
    .$onUpdate(() => new Date());
const dt = (name: string) => datetime(name, { mode: 'date', fsp: 3 });

// ---------------------------------------------------------------------------
// Usuarios (identidad en Firebase Auth; perfil y rol aquí)
// ---------------------------------------------------------------------------
export const users = mysqlTable(
  'users',
  {
    id: id(),
    firebaseUid: varchar('firebase_uid', { length: 128 }).notNull(),
    email: varchar('email', { length: 191 }).notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    fullName: varchar('full_name', { length: 160 }),
    phone: varchar('phone', { length: 40 }),
    avatarUrl: varchar('avatar_url', { length: 500 }),
    role: mysqlEnum('role', ['customer', 'editor', 'admin']).notNull().default('customer'),
    legalIdType: mysqlEnum('legal_id_type', ['CC', 'CE', 'NIT', 'PP', 'TI']),
    legalId: varchar('legal_id', { length: 40 }),
    marketingOptIn: boolean('marketing_opt_in').notNull().default(true),
    loyaltyPoints: int('loyalty_points').notNull().default(0),
    provider: varchar('provider', { length: 40 }),
    lastSeenAt: dt('last_seen_at'),
    disabledAt: dt('disabled_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('users_firebase_uid').on(t.firebaseUid), uniqueIndex('users_email').on(t.email), index('users_role').on(t.role)],
);

export const addresses = mysqlTable(
  'addresses',
  {
    id: id(),
    userId: ref('user_id').notNull(),
    label: varchar('label', { length: 60 }).notNull().default('Casa'),
    recipient: varchar('recipient', { length: 160 }).notNull(),
    phone: varchar('phone', { length: 40 }).notNull(),
    region: varchar('region', { length: 80 }).notNull(),
    city: varchar('city', { length: 80 }).notNull(),
    line1: varchar('line1', { length: 200 }).notNull(),
    line2: varchar('line2', { length: 200 }),
    notes: varchar('notes', { length: 300 }),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('addresses_user').on(t.userId)],
);

// ---------------------------------------------------------------------------
// Catálogo (café, merch, accesorios, kits, experiencias: catas y tours)
// ---------------------------------------------------------------------------
export type SensoryProfile = {
  tueste: number; // 1-10
  acidez: number;
  cuerpo: number;
  dulzor: number;
  amargor: number;
  complejidad: number;
};

export const products = mysqlTable(
  'products',
  {
    id: id(),
    slug: varchar('slug', { length: 160 }).notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    subtitle: varchar('subtitle', { length: 240 }),
    kind: mysqlEnum('kind', ['coffee', 'merch', 'accessory', 'kit', 'experience']).notNull().default('coffee'),
    category: varchar('category', { length: 80 }),
    description: mediumtext('description'),
    story: mediumtext('story'),
    originRegion: varchar('origin_region', { length: 120 }),
    originFarm: varchar('origin_farm', { length: 120 }),
    producer: varchar('producer', { length: 160 }),
    altitudeM: int('altitude_m'),
    variety: varchar('variety', { length: 120 }),
    process: varchar('process', { length: 80 }),
    roastLevel: varchar('roast_level', { length: 40 }),
    profile: jsonText<SensoryProfile | null>('profile'),
    tastingNotes: jsonText<string[]>('tasting_notes'),
    brewMethods: jsonText<string[]>('brew_methods'),
    themeColor: varchar('theme_color', { length: 9 }),
    accentColor: varchar('accent_color', { length: 9 }),
    imageUrl: varchar('image_url', { length: 500 }),
    gallery: jsonText<string[]>('gallery'),
    badges: jsonText<string[]>('badges'),
    isActive: boolean('is_active').notNull().default(true),
    isFeatured: boolean('is_featured').notNull().default(false),
    isSeasonal: boolean('is_seasonal').notNull().default(false),
    subscriptionEligible: boolean('subscription_eligible').notNull().default(false),
    ratingAvg: double('rating_avg').notNull().default(0),
    ratingCount: int('rating_count').notNull().default(0),
    sortOrder: int('sort_order').notNull().default(0),
    seoTitle: varchar('seo_title', { length: 200 }),
    seoDescription: varchar('seo_description', { length: 320 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('products_slug').on(t.slug), index('products_active').on(t.isActive, t.kind, t.sortOrder)],
);

export const productVariants = mysqlTable(
  'product_variants',
  {
    id: id(),
    productId: ref('product_id').notNull(),
    name: varchar('name', { length: 120 }).notNull(), // "340 g · Grano"
    weightG: int('weight_g'),
    grind: varchar('grind', { length: 40 }), // grano | fina | media | gruesa
    priceCop: int('price_cop').notNull(),
    compareAtCop: int('compare_at_cop'),
    stock: int('stock').notNull().default(0),
    sku: varchar('sku', { length: 80 }),
    eventAt: dt('event_at'), // para experiencias (fecha de la cata/tour)
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: int('sort_order').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('variants_product').on(t.productId), uniqueIndex('variants_sku').on(t.sku)],
);

export const productReviews = mysqlTable(
  'product_reviews',
  {
    id: id(),
    productId: ref('product_id'),
    courseId: ref('course_id'),
    userId: ref('user_id').notNull(),
    rating: tinyint('rating').notNull(),
    title: varchar('title', { length: 160 }),
    body: text('body'),
    status: mysqlEnum('status', ['pending', 'approved', 'rejected']).notNull().default('pending'),
    verified: boolean('verified').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index('reviews_product').on(t.productId, t.status), index('reviews_course').on(t.courseId, t.status)],
);

// ---------------------------------------------------------------------------
// Suscripciones de café (cobro recurrente con fuente de pago Wompi)
// ---------------------------------------------------------------------------
export const subscriptionPlans = mysqlTable(
  'subscription_plans',
  {
    id: id(),
    slug: varchar('slug', { length: 120 }).notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    tagline: varchar('tagline', { length: 200 }),
    description: text('description'),
    audience: mysqlEnum('audience', ['personal', 'empresa']).notNull().default('personal'),
    frequencyWeeks: int('frequency_weeks').notNull().default(4),
    bagsPerDelivery: int('bags_per_delivery').notNull().default(1),
    bagWeightG: int('bag_weight_g').notNull().default(340),
    priceCop: int('price_cop').notNull(),
    compareAtCop: int('compare_at_cop'),
    includesAcademy: boolean('includes_academy').notNull().default(false),
    benefits: jsonText<string[]>('benefits'),
    imageUrl: varchar('image_url', { length: 500 }),
    isHighlighted: boolean('is_highlighted').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: int('sort_order').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('plans_slug').on(t.slug)],
);

export type AddressSnapshot = {
  recipient: string;
  phone: string;
  region: string;
  city: string;
  line1: string;
  line2?: string | null;
  notes?: string | null;
};

export const subscriptions = mysqlTable(
  'subscriptions',
  {
    id: id(),
    userId: ref('user_id').notNull(),
    planId: ref('plan_id').notNull(),
    productId: ref('product_id'),
    grind: varchar('grind', { length: 40 }).notNull().default('grano'),
    status: mysqlEnum('status', ['pending', 'active', 'paused', 'past_due', 'cancelled']).notNull().default('pending'),
    priceCop: int('price_cop').notNull(),
    address: jsonText<AddressSnapshot>('address'),
    wompiPaymentSourceId: varchar('wompi_payment_source_id', { length: 64 }),
    cardBrand: varchar('card_brand', { length: 30 }),
    cardLast4: varchar('card_last4', { length: 4 }),
    nextBillingAt: dt('next_billing_at'),
    pausedUntil: dt('paused_until'),
    failedAttempts: int('failed_attempts').notNull().default(0),
    cancelReason: varchar('cancel_reason', { length: 300 }),
    startedAt: dt('started_at'),
    cancelledAt: dt('cancelled_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('subs_user').on(t.userId), index('subs_billing').on(t.status, t.nextBillingAt)],
);

export const subscriptionCharges = mysqlTable(
  'subscription_charges',
  {
    id: id(),
    subscriptionId: ref('subscription_id').notNull(),
    orderId: ref('order_id'),
    amountCop: int('amount_cop').notNull(),
    status: mysqlEnum('status', ['pending', 'approved', 'declined', 'error']).notNull().default('pending'),
    wompiTransactionId: varchar('wompi_transaction_id', { length: 64 }),
    attempt: int('attempt').notNull().default(1),
    error: varchar('error', { length: 500 }),
    createdAt: createdAt(),
  },
  (t) => [index('charges_sub').on(t.subscriptionId)],
);

// ---------------------------------------------------------------------------
// Pedidos (tienda, cursos, suscripciones) + pagos Wompi
// ---------------------------------------------------------------------------
export const orderStatuses = ['pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled', 'refunded', 'failed'] as const;

export const orders = mysqlTable(
  'orders',
  {
    id: id(),
    number: varchar('number', { length: 24 }).notNull(),
    userId: ref('user_id'),
    email: varchar('email', { length: 191 }).notNull(),
    customerName: varchar('customer_name', { length: 160 }).notNull(),
    phone: varchar('phone', { length: 40 }),
    legalIdType: varchar('legal_id_type', { length: 8 }),
    legalId: varchar('legal_id', { length: 40 }),
    kind: mysqlEnum('kind', ['store', 'course', 'subscription', 'mixed']).notNull().default('store'),
    channel: mysqlEnum('channel', ['web', 'app', 'admin', 'pos']).notNull().default('web'),
    status: mysqlEnum('status', orderStatuses).notNull().default('pending'),
    subtotalCop: int('subtotal_cop').notNull(),
    discountCop: int('discount_cop').notNull().default(0),
    shippingCop: int('shipping_cop').notNull().default(0),
    totalCop: int('total_cop').notNull(),
    couponCode: varchar('coupon_code', { length: 40 }),
    pointsRedeemed: int('points_redeemed').notNull().default(0),
    pointsEarned: int('points_earned').notNull().default(0),
    requiresShipping: boolean('requires_shipping').notNull().default(true),
    shippingAddress: jsonText<AddressSnapshot | null>('shipping_address'),
    paymentMethod: varchar('payment_method', { length: 40 }),
    wompiReference: varchar('wompi_reference', { length: 64 }).notNull(),
    wompiTransactionId: varchar('wompi_transaction_id', { length: 64 }),
    subscriptionId: ref('subscription_id'),
    paidAt: dt('paid_at'),
    carrier: varchar('carrier', { length: 60 }),
    trackingNumber: varchar('tracking_number', { length: 80 }),
    trackingUrl: varchar('tracking_url', { length: 500 }),
    shippedAt: dt('shipped_at'),
    deliveredAt: dt('delivered_at'),
    cancelledAt: dt('cancelled_at'),
    notes: varchar('notes', { length: 500 }),
    internalNotes: text('internal_notes'),
    utm: jsonText<Record<string, string> | null>('utm'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('orders_number').on(t.number),
    uniqueIndex('orders_reference').on(t.wompiReference),
    index('orders_user').on(t.userId),
    index('orders_email').on(t.email),
    index('orders_status_date').on(t.status, t.createdAt),
    index('orders_paid_at').on(t.paidAt),
  ],
);

export const orderItems = mysqlTable(
  'order_items',
  {
    id: id(),
    orderId: ref('order_id').notNull(),
    itemKind: mysqlEnum('item_kind', ['product', 'course', 'plan']).notNull(),
    productId: ref('product_id'),
    variantId: ref('variant_id'),
    courseId: ref('course_id'),
    planId: ref('plan_id'),
    name: varchar('name', { length: 200 }).notNull(),
    variantName: varchar('variant_name', { length: 160 }),
    imageUrl: varchar('image_url', { length: 500 }),
    unitPriceCop: int('unit_price_cop').notNull(),
    quantity: int('quantity').notNull().default(1),
    totalCop: int('total_cop').notNull(),
  },
  (t) => [index('items_order').on(t.orderId), index('items_product').on(t.productId), index('items_course').on(t.courseId)],
);

export const paymentEvents = mysqlTable(
  'payment_events',
  {
    id: id(),
    provider: varchar('provider', { length: 20 }).notNull().default('wompi'),
    event: varchar('event', { length: 60 }).notNull(),
    externalId: varchar('external_id', { length: 80 }).notNull(),
    reference: varchar('reference', { length: 80 }),
    status: varchar('status', { length: 30 }).notNull(),
    signatureOk: boolean('signature_ok').notNull().default(false),
    payload: jsonText<unknown>('payload'),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('payment_events_dedupe').on(t.provider, t.externalId, t.status), index('payment_events_ref').on(t.reference)],
);

export const coupons = mysqlTable(
  'coupons',
  {
    id: id(),
    code: varchar('code', { length: 40 }).notNull(),
    description: varchar('description', { length: 240 }),
    kind: mysqlEnum('kind', ['percent', 'fixed', 'free_shipping']).notNull().default('percent'),
    value: int('value').notNull().default(0),
    scope: mysqlEnum('scope', ['all', 'products', 'courses']).notNull().default('all'),
    minSubtotalCop: int('min_subtotal_cop').notNull().default(0),
    maxUses: int('max_uses'),
    maxUsesPerUser: int('max_uses_per_user').default(1),
    uses: int('uses').notNull().default(0),
    startsAt: dt('starts_at'),
    endsAt: dt('ends_at'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('coupons_code').on(t.code)],
);

export const couponRedemptions = mysqlTable(
  'coupon_redemptions',
  {
    id: id(),
    couponId: ref('coupon_id').notNull(),
    orderId: ref('order_id').notNull(),
    userId: ref('user_id'),
    email: varchar('email', { length: 191 }).notNull(),
    discountCop: int('discount_cop').notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('redemptions_order').on(t.orderId), index('redemptions_coupon').on(t.couponId, t.email)],
);

export const shippingZones = mysqlTable('shipping_zones', {
  id: id(),
  name: varchar('name', { length: 120 }).notNull(),
  regions: jsonText<string[]>('regions'),
  cities: jsonText<string[]>('cities'),
  rateCop: int('rate_cop').notNull(),
  freeFromCop: int('free_from_cop'),
  etaDays: varchar('eta_days', { length: 40 }).notNull().default('2-4 días hábiles'),
  isDefault: boolean('is_default').notNull().default(false),
  sortOrder: int('sort_order').notNull().default(0),
  createdAt: createdAt(),
});

/** Carritos persistidos (sincronía web/app + recuperación de carritos abandonados). */
export type CartLineSnapshot = { kind: 'product' | 'course'; id: string; variantId?: string | null; quantity: number };
export const carts = mysqlTable(
  'carts',
  {
    id: id(),
    userId: ref('user_id'),
    email: varchar('email', { length: 191 }),
    items: jsonText<CartLineSnapshot[]>('items'),
    subtotalCop: int('subtotal_cop').notNull().default(0),
    remindedAt: dt('reminded_at'),
    recoveredOrderId: ref('recovered_order_id'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('carts_user').on(t.userId), index('carts_updated').on(t.updatedAt)],
);

export const loyaltyLedger = mysqlTable(
  'loyalty_ledger',
  {
    id: id(),
    userId: ref('user_id').notNull(),
    points: int('points').notNull(),
    reason: varchar('reason', { length: 160 }).notNull(),
    orderId: ref('order_id'),
    createdAt: createdAt(),
  },
  (t) => [index('loyalty_user').on(t.userId), uniqueIndex('loyalty_order_reason').on(t.orderId, t.reason)],
);

// ---------------------------------------------------------------------------
// Academia (LMS)
// ---------------------------------------------------------------------------
export const courses = mysqlTable(
  'courses',
  {
    id: id(),
    slug: varchar('slug', { length: 160 }).notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    subtitle: varchar('subtitle', { length: 300 }),
    description: mediumtext('description'),
    coverUrl: varchar('cover_url', { length: 500 }),
    trailerUrl: varchar('trailer_url', { length: 500 }),
    level: mysqlEnum('level', ['principiante', 'intermedio', 'avanzado']).notNull().default('principiante'),
    category: varchar('category', { length: 80 }),
    instructorName: varchar('instructor_name', { length: 160 }),
    instructorTitle: varchar('instructor_title', { length: 160 }),
    instructorBio: text('instructor_bio'),
    instructorAvatarUrl: varchar('instructor_avatar_url', { length: 500 }),
    priceCop: int('price_cop').notNull().default(0),
    compareAtCop: int('compare_at_cop'),
    isFree: boolean('is_free').notNull().default(false),
    includedInSubscription: boolean('included_in_subscription').notNull().default(false),
    whatYouLearn: jsonText<string[]>('what_you_learn'),
    requirements: jsonText<string[]>('requirements'),
    resources: jsonText<{ label: string; url: string }[]>('resources'),
    durationMin: int('duration_min').notNull().default(0),
    certificateEnabled: boolean('certificate_enabled').notNull().default(true),
    ratingAvg: double('rating_avg').notNull().default(0),
    ratingCount: int('rating_count').notNull().default(0),
    isPublished: boolean('is_published').notNull().default(false),
    isFeatured: boolean('is_featured').notNull().default(false),
    sortOrder: int('sort_order').notNull().default(0),
    seoTitle: varchar('seo_title', { length: 200 }),
    seoDescription: varchar('seo_description', { length: 320 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('courses_slug').on(t.slug), index('courses_pub').on(t.isPublished, t.sortOrder)],
);

export const courseModules = mysqlTable(
  'course_modules',
  {
    id: id(),
    courseId: ref('course_id').notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    position: int('position').notNull().default(0),
  },
  (t) => [index('modules_course').on(t.courseId, t.position)],
);

export const lessons = mysqlTable(
  'lessons',
  {
    id: id(),
    courseId: ref('course_id').notNull(),
    moduleId: ref('module_id').notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    summary: varchar('summary', { length: 500 }),
    content: mediumtext('content'),
    videoUrl: varchar('video_url', { length: 600 }),
    videoProvider: mysqlEnum('video_provider', ['bunny', 'mp4', 'hls', 'youtube', 'vimeo']).notNull().default('mp4'),
    durationS: int('duration_s').notNull().default(0),
    isPreview: boolean('is_preview').notNull().default(false),
    resources: jsonText<{ label: string; url: string }[]>('resources'),
    position: int('position').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('lessons_module').on(t.moduleId, t.position), index('lessons_course').on(t.courseId)],
);

export const enrollments = mysqlTable(
  'enrollments',
  {
    id: id(),
    userId: ref('user_id').notNull(),
    courseId: ref('course_id').notNull(),
    source: mysqlEnum('source', ['purchase', 'subscription', 'admin', 'free']).notNull(),
    orderId: ref('order_id'),
    status: mysqlEnum('status', ['active', 'completed', 'revoked']).notNull().default('active'),
    progressPct: int('progress_pct').notNull().default(0),
    lastLessonId: ref('last_lesson_id'),
    completedAt: dt('completed_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('enroll_user_course').on(t.userId, t.courseId), index('enroll_course').on(t.courseId)],
);

export const lessonProgress = mysqlTable(
  'lesson_progress',
  {
    userId: ref('user_id').notNull(),
    lessonId: ref('lesson_id').notNull(),
    courseId: ref('course_id').notNull(),
    positionS: int('position_s').notNull().default(0),
    completed: boolean('completed').notNull().default(false),
    completedAt: dt('completed_at'),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lessonId] }), index('progress_course').on(t.userId, t.courseId)],
);

export const lessonNotes = mysqlTable(
  'lesson_notes',
  {
    id: id(),
    userId: ref('user_id').notNull(),
    lessonId: ref('lesson_id').notNull(),
    atS: int('at_s').notNull().default(0),
    body: text('body').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('notes_user_lesson').on(t.userId, t.lessonId)],
);

export const quizzes = mysqlTable(
  'quizzes',
  {
    id: id(),
    courseId: ref('course_id').notNull(),
    moduleId: ref('module_id'),
    title: varchar('title', { length: 200 }).notNull(),
    passScore: int('pass_score').notNull().default(70),
    position: int('position').notNull().default(0),
  },
  (t) => [index('quizzes_course').on(t.courseId)],
);

export const quizQuestions = mysqlTable(
  'quiz_questions',
  {
    id: id(),
    quizId: ref('quiz_id').notNull(),
    prompt: text('prompt').notNull(),
    options: jsonText<string[]>('options'),
    correctIndex: int('correct_index').notNull(),
    explanation: text('explanation'),
    position: int('position').notNull().default(0),
  },
  (t) => [index('questions_quiz').on(t.quizId, t.position)],
);

export const quizAttempts = mysqlTable(
  'quiz_attempts',
  {
    id: id(),
    userId: ref('user_id').notNull(),
    quizId: ref('quiz_id').notNull(),
    score: int('score').notNull(),
    passed: boolean('passed').notNull(),
    answers: jsonText<number[]>('answers'),
    createdAt: createdAt(),
  },
  (t) => [index('attempts_user_quiz').on(t.userId, t.quizId)],
);

export const certificates = mysqlTable(
  'certificates',
  {
    id: id(),
    code: varchar('code', { length: 24 }).notNull(),
    userId: ref('user_id').notNull(),
    courseId: ref('course_id').notNull(),
    holderName: varchar('holder_name', { length: 160 }).notNull(),
    courseTitle: varchar('course_title', { length: 200 }).notNull(),
    hours: int('hours').notNull().default(0),
    issuedAt: createdAt(),
    revokedAt: dt('revoked_at'),
  },
  (t) => [uniqueIndex('cert_code').on(t.code), uniqueIndex('cert_user_course').on(t.userId, t.courseId)],
);

// ---------------------------------------------------------------------------
// Contenido / CMS
// ---------------------------------------------------------------------------
export const blogPosts = mysqlTable(
  'blog_posts',
  {
    id: id(),
    slug: varchar('slug', { length: 180 }).notNull(),
    title: varchar('title', { length: 220 }).notNull(),
    excerpt: varchar('excerpt', { length: 400 }),
    content: mediumtext('content'),
    coverUrl: varchar('cover_url', { length: 500 }),
    category: varchar('category', { length: 80 }),
    tags: jsonText<string[]>('tags'),
    authorName: varchar('author_name', { length: 120 }),
    readingMin: int('reading_min').notNull().default(4),
    status: mysqlEnum('status', ['draft', 'scheduled', 'published']).notNull().default('draft'),
    isFeatured: boolean('is_featured').notNull().default(false),
    publishedAt: dt('published_at'),
    seoTitle: varchar('seo_title', { length: 200 }),
    seoDescription: varchar('seo_description', { length: 320 }),
    views: int('views').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('posts_slug').on(t.slug), index('posts_status').on(t.status, t.publishedAt)],
);

export const siteContent = mysqlTable('site_content', {
  key: varchar('key', { length: 80 }).primaryKey(),
  content: jsonText<Record<string, unknown>>('content'),
  updatedBy: ref('updated_by'),
  updatedAt: updatedAt(),
});

export const mediaAssets = mysqlTable(
  'media_assets',
  {
    id: id(),
    path: varchar('path', { length: 400 }).notNull(),
    url: varchar('url', { length: 600 }).notNull(),
    folder: varchar('folder', { length: 80 }).notNull().default('general'),
    alt: varchar('alt', { length: 300 }),
    mime: varchar('mime', { length: 80 }),
    sizeBytes: int('size_bytes'),
    width: int('width'),
    height: int('height'),
    uploadedBy: ref('uploaded_by'),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('media_path').on(t.path), index('media_folder').on(t.folder)],
);

/** Puntos físicos (Florida Parque Comercial, finca en Caicedo…) */
export const stores = mysqlTable('stores', {
  id: id(),
  slug: varchar('slug', { length: 120 }).notNull().unique(),
  name: varchar('name', { length: 160 }).notNull(),
  kind: mysqlEnum('kind', ['cafe', 'finca', 'aliado']).notNull().default('cafe'),
  address: varchar('address', { length: 300 }).notNull(),
  city: varchar('city', { length: 120 }).notNull(),
  hours: jsonText<string[]>('hours'),
  phone: varchar('phone', { length: 40 }),
  mapUrl: varchar('map_url', { length: 500 }),
  menuUrl: varchar('menu_url', { length: 500 }),
  imageUrl: varchar('image_url', { length: 500 }),
  description: text('description'),
  lat: double('lat'),
  lng: double('lng'),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: int('sort_order').notNull().default(0),
});

// ---------------------------------------------------------------------------
// CRM, chat y newsletter
// ---------------------------------------------------------------------------
export const leads = mysqlTable(
  'leads',
  {
    id: id(),
    name: varchar('name', { length: 160 }).notNull(),
    email: varchar('email', { length: 191 }).notNull(),
    phone: varchar('phone', { length: 40 }),
    company: varchar('company', { length: 160 }),
    source: varchar('source', { length: 60 }).notNull().default('contacto'),
    interest: varchar('interest', { length: 80 }),
    message: text('message'),
    status: mysqlEnum('status', ['new', 'contacted', 'qualified', 'won', 'lost']).notNull().default('new'),
    score: int('score'),
    notes: text('notes'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('leads_status').on(t.status, t.createdAt)],
);

export const newsletterSubscribers = mysqlTable('newsletter_subscribers', {
  email: varchar('email', { length: 191 }).primaryKey(),
  source: varchar('source', { length: 60 }).notNull().default('web'),
  createdAt: createdAt(),
  unsubscribedAt: dt('unsubscribed_at'),
});

export const chatSessions = mysqlTable(
  'chat_sessions',
  {
    id: id(),
    userId: ref('user_id'),
    visitorId: varchar('visitor_id', { length: 64 }),
    name: varchar('name', { length: 160 }),
    email: varchar('email', { length: 191 }),
    channel: mysqlEnum('channel', ['web', 'app']).notNull().default('web'),
    status: mysqlEnum('status', ['bot', 'human_requested', 'human', 'closed']).notNull().default('bot'),
    assignedTo: ref('assigned_to'),
    summary: text('summary'),
    // La columna física es created_at: se actualiza con cada mensaje y hace de "último mensaje".
    // (Antes había también un campo createdAt sobre la misma columna y el INSERT la repetía → 500 en /api/chat.)
    // La hora de inicio de la conversación es la del primer chat_messages de la sesión.
    lastMessageAt: createdAt(),
  },
  (t) => [index('chat_status').on(t.status, t.lastMessageAt), index('chat_visitor').on(t.visitorId)],
);

export type ChatAction = { type: 'link' | 'buy' | 'subscribe' | 'human' | 'course'; label: string; href?: string };
export const chatMessages = mysqlTable(
  'chat_messages',
  {
    id: id(),
    sessionId: ref('session_id').notNull(),
    role: mysqlEnum('role', ['user', 'assistant', 'agent', 'system']).notNull(),
    content: text('content').notNull(),
    actions: jsonText<ChatAction[] | null>('actions'),
    createdAt: createdAt(),
  },
  (t) => [index('chat_msgs_session').on(t.sessionId, t.createdAt)],
);

// ---------------------------------------------------------------------------
// Servicio push + bandeja de notificaciones
// ---------------------------------------------------------------------------
export const pushTokens = mysqlTable(
  'push_tokens',
  {
    token: varchar('token', { length: 255 }).primaryKey(),
    userId: ref('user_id'),
    platform: mysqlEnum('platform', ['ios', 'android', 'web']).notNull(),
    appVersion: varchar('app_version', { length: 20 }),
    enabled: boolean('enabled').notNull().default(true),
    lastError: varchar('last_error', { length: 300 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('push_user').on(t.userId)],
);

export const pushCampaigns = mysqlTable(
  'push_campaigns',
  {
    id: id(),
    title: varchar('title', { length: 80 }).notNull(),
    body: varchar('body', { length: 300 }).notNull(),
    deepLink: varchar('deep_link', { length: 300 }),
    imageUrl: varchar('image_url', { length: 500 }),
    audience: varchar('audience', { length: 80 }).notNull().default('all'), // all|subscribers|students|customers|inactive|course:<id>|user:<id>
    platform: mysqlEnum('platform', ['all', 'ios', 'android']).notNull().default('all'),
    status: mysqlEnum('status', ['draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled']).notNull().default('draft'),
    scheduledAt: dt('scheduled_at'),
    targetCount: int('target_count').notNull().default(0),
    sentCount: int('sent_count').notNull().default(0),
    errorCount: int('error_count').notNull().default(0),
    openCount: int('open_count').notNull().default(0),
    createdBy: ref('created_by'),
    sentAt: dt('sent_at'),
    createdAt: createdAt(),
  },
  (t) => [index('campaign_status').on(t.status, t.scheduledAt)],
);

export const pushDeliveries = mysqlTable(
  'push_deliveries',
  {
    id: id(),
    campaignId: ref('campaign_id'),
    userId: ref('user_id'),
    token: varchar('token', { length: 255 }),
    trigger: varchar('trigger', { length: 40 }).notNull().default('campaign'),
    title: varchar('title', { length: 120 }).notNull(),
    status: mysqlEnum('status', ['ok', 'error']).notNull().default('ok'),
    ticketId: varchar('ticket_id', { length: 80 }),
    error: varchar('error', { length: 300 }),
    createdAt: createdAt(),
  },
  (t) => [index('deliveries_date').on(t.createdAt), index('deliveries_campaign').on(t.campaignId)],
);

export const notifications = mysqlTable(
  'notifications',
  {
    id: id(),
    userId: ref('user_id').notNull(),
    title: varchar('title', { length: 120 }).notNull(),
    body: varchar('body', { length: 400 }).notNull(),
    deepLink: varchar('deep_link', { length: 300 }),
    kind: varchar('kind', { length: 40 }).notNull().default('general'),
    readAt: dt('read_at'),
    createdAt: createdAt(),
  },
  (t) => [index('notif_user').on(t.userId, t.createdAt)],
);

// ---------------------------------------------------------------------------
// Operación: monitoreo, auditoría, límites de uso
// ---------------------------------------------------------------------------
export const integrationEvents = mysqlTable(
  'integration_events',
  {
    id: id(),
    source: varchar('source', { length: 30 }).notNull(), // wompi|push|email|ai|cron|gateway|auth|system
    event: varchar('event', { length: 80 }).notNull(),
    status: mysqlEnum('status', ['ok', 'error', 'ignored']).notNull().default('ok'),
    externalId: varchar('external_id', { length: 120 }),
    message: varchar('message', { length: 1000 }),
    durationMs: int('duration_ms'),
    payload: jsonText<unknown>('payload'),
    createdAt: createdAt(),
  },
  (t) => [index('events_source_date').on(t.source, t.createdAt), index('events_status_date').on(t.status, t.createdAt)],
);

export const auditLog = mysqlTable(
  'audit_log',
  {
    id: id(),
    userId: ref('user_id'),
    action: varchar('action', { length: 80 }).notNull(),
    entity: varchar('entity', { length: 60 }).notNull(),
    entityId: varchar('entity_id', { length: 120 }),
    meta: jsonText<unknown>('meta'),
    createdAt: createdAt(),
  },
  (t) => [index('audit_entity').on(t.entity, t.entityId), index('audit_date').on(t.createdAt)],
);

export const rateLimits = mysqlTable('rate_limits', {
  key: varchar('key', { length: 191 }).primaryKey(),
  count: int('count').notNull().default(0),
  resetAt: dt('reset_at').notNull(),
});

/** Métricas de tráfico propias (sin cookies de terceros) para el dashboard. */
export const pageViews = mysqlTable(
  'page_views',
  {
    day: varchar('day', { length: 10 }).notNull(), // YYYY-MM-DD (Bogotá)
    path: varchar('path', { length: 191 }).notNull(),
    source: varchar('source', { length: 60 }).notNull().default('directo'),
    device: mysqlEnum('device', ['desktop', 'mobile', 'app']).notNull().default('desktop'),
    views: int('views').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.day, t.path, t.source, t.device] })],
);
