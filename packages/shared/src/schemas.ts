/** Validaciones compartidas (web, app y API). Mensajes en español. */
import { z } from 'zod';
import { COLOMBIA_REGIONS } from './colombia';

const phone = z
  .string()
  .trim()
  .min(7, 'Escribe un teléfono válido')
  .max(20)
  .regex(/^[+\d][\d\s-]{6,}$/, 'Escribe un teléfono válido');

export const addressSchema = z.object({
  recipient: z.string().trim().min(3, 'Escribe el nombre de quien recibe').max(160),
  phone,
  region: z.enum(COLOMBIA_REGIONS, { message: 'Elige un departamento' }),
  city: z.string().trim().min(2, 'Escribe la ciudad o municipio').max(80),
  line1: z.string().trim().min(5, 'Escribe la dirección').max(200),
  line2: z.string().trim().max(200).optional().nullable(),
  notes: z.string().trim().max(300).optional().nullable(),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const cartLineSchema = z.object({
  kind: z.enum(['product', 'course']),
  id: z.string().min(1).max(64), // productId o courseId
  variantId: z.string().max(64).optional().nullable(),
  quantity: z.number().int().min(1).max(50),
});
export type CartLineInput = z.infer<typeof cartLineSchema>;

export const customerSchema = z.object({
  email: z.email('Escribe un correo válido').max(191),
  fullName: z.string().trim().min(3, 'Escribe tu nombre completo').max(160),
  phone,
  legalIdType: z.enum(['CC', 'CE', 'NIT', 'PP', 'TI']).default('CC'),
  legalId: z.string().trim().min(5, 'Escribe tu documento').max(40),
});

export const checkoutSchema = z.object({
  items: z.array(cartLineSchema).min(1, 'Tu carrito está vacío').max(40),
  customer: customerSchema,
  address: addressSchema.optional().nullable(),
  couponCode: z.string().trim().toUpperCase().max(40).optional().nullable(),
  redeemPoints: z.number().int().min(0).max(1_000_000).optional(),
  notes: z.string().trim().max(500).optional().nullable(),
  channel: z.enum(['web', 'app']).default('web'),
  acceptTerms: z.literal(true, { message: 'Debes aceptar los términos y la política de datos' }),
  utm: z.record(z.string(), z.string().max(120)).optional(),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const subscribeSchema = z.object({
  planId: z.string().min(1),
  productId: z.string().min(1).optional().nullable(),
  grind: z.enum(['grano', 'fina', 'media', 'gruesa']).default('grano'),
  address: addressSchema,
  customer: customerSchema,
  /** token de tarjeta generado por Wompi en el navegador/app */
  cardToken: z.string().min(5),
  acceptanceToken: z.string().min(5),
  personalAuthToken: z.string().min(5).optional(),
  channel: z.enum(['web', 'app']).default('web'),
});
export type SubscribeInput = z.infer<typeof subscribeSchema>;

export const subscriptionUpdateSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('pause'), until: z.iso.date().optional() }),
  z.object({ action: z.literal('resume') }),
  z.object({ action: z.literal('skip') }),
  z.object({ action: z.literal('cancel'), reason: z.string().trim().max(300).optional() }),
  z.object({ action: z.literal('change_plan'), planId: z.string().min(1) }),
  z.object({ action: z.literal('change_coffee'), productId: z.string().min(1), grind: z.enum(['grano', 'fina', 'media', 'gruesa']).optional() }),
  z.object({ action: z.literal('change_address'), address: addressSchema }),
]);

export const leadSchema = z.object({
  name: z.string().trim().min(2, 'Escribe tu nombre').max(160),
  email: z.email('Escribe un correo válido'),
  phone: z.string().trim().max(40).optional().nullable(),
  company: z.string().trim().max(160).optional().nullable(),
  source: z.string().trim().max(60).default('contacto'),
  interest: z.string().trim().max(80).optional().nullable(),
  message: z.string().trim().max(3000).optional().nullable(),
  consent: z.literal(true, { message: 'Autoriza el tratamiento de datos para continuar' }),
  website: z.string().max(0).optional(), // honeypot
});

export const newsletterSchema = z.object({ email: z.email('Escribe un correo válido'), source: z.string().max(60).optional() });

export const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  phone: z.string().trim().max(40).optional().nullable(),
  legalIdType: z.enum(['CC', 'CE', 'NIT', 'PP', 'TI']).optional().nullable(),
  legalId: z.string().trim().max(40).optional().nullable(),
  marketingOptIn: z.boolean(),
});

export const chatMessageSchema = z.object({
  sessionId: z.string().max(64).optional().nullable(),
  visitorId: z.string().max(64).optional().nullable(),
  message: z.string().trim().min(1).max(1500),
  channel: z.enum(['web', 'app']).default('web'),
  page: z.string().max(300).optional(),
});

export const progressSchema = z.object({
  lessonId: z.string().min(1),
  positionS: z.number().int().min(0).max(86_400),
  completed: z.boolean().optional(),
});

export const quizSubmitSchema = z.object({ answers: z.array(z.number().int().min(0).max(20)).max(100) });

export const pushRegisterSchema = z.object({
  token: z.string().min(10).max(255),
  platform: z.enum(['ios', 'android', 'web']),
  appVersion: z.string().max(20).optional(),
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(160).optional(),
  body: z.string().trim().min(10, 'Cuéntanos un poco más (mín. 10 caracteres)').max(2000),
});

export const aiSearchSchema = z.object({ query: z.string().trim().min(2).max(300), kind: z.enum(['all', 'product', 'course', 'plan']).optional() });
export const aiTutorSchema = z.object({
  lessonId: z.string().min(1),
  question: z.string().trim().min(2).max(1000),
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(4000) })).max(12).optional(),
});
export const aiRecommendSchema = z.object({
  context: z.enum(['home', 'product', 'cart', 'course', 'account']),
  productSlug: z.string().max(160).optional(),
  courseSlug: z.string().max(160).optional(),
  cart: z.array(cartLineSchema).max(40).optional(),
});
