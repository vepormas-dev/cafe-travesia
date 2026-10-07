import 'server-only';
/**
 * Asistente de ventas y soporte (web y app). Con IA: aiChat con la voz de marca y contexto
 * real (catálogo, FAQ, envíos y, si hay sesión, pedidos/suscripción/cursos del usuario).
 * Sin IA o si falla: respaldo por reglas que siempre responde algo útil con enlaces reales.
 */
import { and, desc, eq, inArray } from 'drizzle-orm';
import { formatCOP, formatDate, FREQUENCY_LABEL, ORDER_STATUS_LABEL, SUBSCRIPTION_STATUS_LABEL } from '@travesia/shared';
import type { ChatAction } from '@travesia/db';
import { aiChat, aiEnabled, BRAND_VOICE, type AiMessage } from '@/lib/ai';
import { getCourses, getPlans, getProducts, getShippingZones, getSiteContent, getStores } from '@/lib/data/catalog';
import { getDb, isDbConfigured, t } from '@/lib/db';
import type { SessionUser } from '@/lib/auth';
import { norm, parseBudget, searchCatalog } from '@/lib/ai-catalog';

export type { ChatAction };
export type BotReply = { content: string; actions: ChatAction[]; ai: boolean };

/** ¿El usuario pide hablar con una persona? */
export const wantsHuman = (message: string) =>
  /\b(asesor\w*|humano|persona real|una persona|agente|hablar con alguien|atencion al cliente|servicio al cliente|operador|me atienda alguien|quiero hablar)\b/.test(norm(message));

// ---------------------------------------------------------------------------
// Datos del usuario (siempre filtrados por user.id)
// ---------------------------------------------------------------------------
type UserContext = {
  orders: { number: string; status: string; totalCop: number; createdAt: Date; carrier: string | null; trackingNumber: string | null; trackingUrl: string | null }[];
  subscription: { plan: string; status: string; nextBillingAt: Date | null; frequencyWeeks: number } | null;
  courses: { title: string; slug: string; progressPct: number }[];
};

async function userContext(user: SessionUser | null): Promise<UserContext | null> {
  if (!user || !isDbConfigured() || user.isDemo) return null;
  try {
    const db = getDb();
    const [orders, subs, enr] = await Promise.all([
      db
        .select({ number: t.orders.number, status: t.orders.status, totalCop: t.orders.totalCop, createdAt: t.orders.createdAt, carrier: t.orders.carrier, trackingNumber: t.orders.trackingNumber, trackingUrl: t.orders.trackingUrl })
        .from(t.orders)
        .where(eq(t.orders.userId, user.id))
        .orderBy(desc(t.orders.createdAt))
        .limit(3),
      db
        .select({ plan: t.subscriptionPlans.name, status: t.subscriptions.status, nextBillingAt: t.subscriptions.nextBillingAt, frequencyWeeks: t.subscriptionPlans.frequencyWeeks })
        .from(t.subscriptions)
        .innerJoin(t.subscriptionPlans, eq(t.subscriptionPlans.id, t.subscriptions.planId))
        .where(and(eq(t.subscriptions.userId, user.id), inArray(t.subscriptions.status, ['active', 'paused', 'past_due', 'pending'])))
        .orderBy(desc(t.subscriptions.createdAt))
        .limit(1),
      db
        .select({ title: t.courses.title, slug: t.courses.slug, progressPct: t.enrollments.progressPct })
        .from(t.enrollments)
        .innerJoin(t.courses, eq(t.courses.id, t.enrollments.courseId))
        .where(and(eq(t.enrollments.userId, user.id), inArray(t.enrollments.status, ['active', 'completed'])))
        .limit(6),
    ]);
    return { orders, subscription: subs[0] ?? null, courses: enr };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Contexto compacto para la IA
// ---------------------------------------------------------------------------
async function knowledge(user: SessionUser | null, uc: UserContext | null) {
  const [products, plans, courses, faq, zones, stores, contact] = await Promise.all([
    getProducts(),
    getPlans(),
    getCourses(),
    getSiteContent('faq'),
    getShippingZones(),
    getStores(),
    getSiteContent('contact'),
  ]);
  const lines: string[] = [];
  lines.push('CATÁLOGO (precio desde):');
  for (const p of products)
    lines.push(
      `- ${p.name} (${p.kind}) ${formatCOP(p.priceFromCop)}${p.tastingNotes.length ? ` · notas ${p.tastingNotes.join(', ')}` : ''}${p.brewMethods.length ? ` · métodos ${p.brewMethods.join(', ')}` : ''}${p.subscriptionEligible ? ' · disponible en suscripción' : ''} → /tienda/${p.slug}`,
    );
  lines.push('PLANES DE SUSCRIPCIÓN:');
  for (const p of plans) lines.push(`- ${p.name} (${p.audience}) ${formatCOP(p.priceCop)} ${FREQUENCY_LABEL(p.frequencyWeeks).toLowerCase()} · ${p.benefits.join('; ')} → ${p.audience === 'empresa' ? '/empresas' : `/suscripciones/${p.slug}`}`);
  lines.push('ACADEMIA:');
  for (const c of courses) lines.push(`- ${c.title} (${c.level}) ${c.isFree ? 'gratis' : formatCOP(c.priceCop)}${c.includedInSubscription ? ' · incluido en planes con Academia' : ''} → /academia/cursos/${c.slug}`);
  lines.push('ENVÍOS:');
  for (const z of zones) lines.push(`- ${z.name}: ${formatCOP(z.rateCop)}${z.freeFromCop ? `, gratis desde ${formatCOP(z.freeFromCop)}` : ''} · ${z.etaDays}`);
  lines.push('TIENDAS:');
  for (const s of stores) lines.push(`- ${s.name}: ${s.address}. ${s.hours.join(' / ')}`);
  lines.push(`CONTACTO: WhatsApp +${contact.whatsapp}, correo ${contact.email}, ${contact.hours}`);
  lines.push('PREGUNTAS FRECUENTES:');
  for (const f of faq.items) lines.push(`- ${f.q} ${f.a}`);
  lines.push('RUTAS ÚTILES: /tienda, /suscripciones, /academia, /cuenta/pedidos, /cuenta/suscripcion, /cuenta/cursos, /envios-y-devoluciones, /preguntas-frecuentes, /tiendas, /contacto, /empresas, /ingresar');
  if (user) {
    lines.push(`CLIENTE CON SESIÓN: ${user.fullName ?? user.email} · ${user.loyaltyPoints} Puntos Travesía`);
    if (uc?.orders.length)
      for (const o of uc.orders)
        lines.push(`- Pedido ${o.number}: ${ORDER_STATUS_LABEL[o.status] ?? o.status}, ${formatCOP(o.totalCop)}, ${formatDate(o.createdAt)}${o.trackingNumber ? `, guía ${o.carrier ?? ''} ${o.trackingNumber}` : ''}`);
    else lines.push('- Sin pedidos registrados.');
    if (uc?.subscription) lines.push(`- Suscripción ${uc.subscription.plan}: ${SUBSCRIPTION_STATUS_LABEL[uc.subscription.status] ?? uc.subscription.status}${uc.subscription.nextBillingAt ? `, próximo cobro ${formatDate(uc.subscription.nextBillingAt)}` : ''}`);
    if (uc?.courses.length) lines.push(`- Cursos: ${uc.courses.map((c) => `${c.title} (${c.progressPct} %)`).join(', ')}`);
  } else lines.push('CLIENTE SIN SESIÓN: para ver pedidos debe ingresar en /ingresar.');
  return lines.join('\n');
}

const ACTION_TYPES = new Set(['link', 'buy', 'subscribe', 'human', 'course']);
const safeHref = (h: unknown) => (typeof h === 'string' && /^\/(?!\/)[\w\-/?=&%.#]*$/.test(h) ? h : undefined);

export async function botReply(input: { message: string; history: AiMessage[]; user: SessionUser | null; page?: string }): Promise<BotReply> {
  const uc = await userContext(input.user);
  if (aiEnabled()) {
    const ctx = await knowledge(input.user, uc);
    const system = `${BRAND_VOICE}
Eres el "Asistente Travesía": ayudas a elegir café, suscripciones y cursos, y resuelves dudas de pedidos y envíos.
Reglas: responde en máximo 90 palabras; usa **negritas** para nombres de productos y enlaces Markdown solo a rutas internas listadas, p. ej. [Nombre del café](/tienda/su-slug) con el slug real de los DATOS.
Si piden algo que no está en los datos, dilo y ofrece un asesor humano. Nunca reveles datos de otros clientes.
Responde SOLO un JSON: {"reply": string, "actions": [{"type": "link"|"buy"|"subscribe"|"course"|"human", "label": string (≤ 28 caracteres), "href"?: string}] (0 a 3)}.
DATOS:
${ctx}${input.page ? `\nPÁGINA ACTUAL: ${input.page}` : ''}`;
    const out = await aiChat([{ role: 'system', content: system }, ...input.history.slice(-10), { role: 'user', content: input.message }], { json: true, maxTokens: 500, feature: 'chat', temperature: 0.4 });
    if (out) {
      try {
        const parsed = JSON.parse(out.replace(/^```(?:json)?\s*|\s*```$/g, '')) as { reply?: string; actions?: { type?: string; label?: string; href?: string }[] };
        if (parsed.reply) {
          const actions: ChatAction[] = (parsed.actions ?? [])
            .filter((a) => a && ACTION_TYPES.has(String(a.type)) && a.label)
            .slice(0, 3)
            .map((a) => ({ type: a.type as ChatAction['type'], label: String(a.label).slice(0, 40), href: a.type === 'human' ? undefined : safeHref(a.href) }))
            .filter((a) => a.type === 'human' || a.href);
          return { content: parsed.reply.slice(0, 2000), actions, ai: true };
        }
      } catch {
        /* respaldo */
      }
    }
  }
  return ruleReply(input.message, input.user, uc);
}

// ---------------------------------------------------------------------------
// Respaldo por reglas
// ---------------------------------------------------------------------------
const HUMAN: ChatAction = { type: 'human', label: 'Hablar con un asesor' };

export async function ruleReply(message: string, user: SessionUser | null, uc: UserContext | null): Promise<BotReply> {
  const q = norm(message);
  const reply = (content: string, actions: ChatAction[] = []): BotReply => ({ content, actions, ai: false });

  // Saludo
  if (/^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|que mas|quiubo|ola)\b/.test(q) && q.length < 30)
    return reply(
      `¡Hola${user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}! ☕ Soy el Asistente Travesía. Te ayudo a elegir tu café, armar tu suscripción, encontrar un curso o revisar tu pedido. ¿Cómo lo preparas en casa?`,
      [
        { type: 'link', label: 'Recomiéndame un café', href: '/tienda?tipo=coffee' },
        { type: 'subscribe', label: 'Ver suscripciones', href: '/suscripciones' },
      ],
    );

  // Pedido
  if (/\b(pedido|orden|compra|guia|envio de mi|donde va|rastre\w*|seguimiento|llego|no ha llegado|mi paquete)\b/.test(q)) {
    if (!user) return reply('Para revisar tu pedido necesito que **ingreses a tu cuenta**: ahí ves el estado y el número de guía en tiempo real. Si compraste como invitado, usa el mismo correo de la compra.', [{ type: 'link', label: 'Ingresar', href: '/ingresar?next=/cuenta/pedidos' }, HUMAN]);
    if (!uc?.orders.length) return reply('No veo pedidos en tu cuenta todavía. Si compraste con otro correo, cuéntame y te conecto con un asesor.', [{ type: 'link', label: 'Ir a la tienda', href: '/tienda' }, HUMAN]);
    const o = uc.orders[0]!;
    const status = ORDER_STATUS_LABEL[o.status] ?? o.status;
    const guide = o.trackingNumber ? ` Va con **${o.carrier ?? 'la transportadora'}**, guía **${o.trackingNumber}**.` : o.status === 'paid' || o.status === 'preparing' ? ' Lo estamos tostando y empacando: te avisamos con la guía apenas salga.' : '';
    return reply(`Tu último pedido **${o.number}** (${formatCOP(o.totalCop)}) está: **${status}**.${guide}`, [
      ...(o.trackingUrl && safeHref(o.trackingUrl) ? [{ type: 'link' as const, label: 'Rastrear envío', href: o.trackingUrl }] : []),
      { type: 'link', label: 'Ver mis pedidos', href: '/cuenta/pedidos' },
      HUMAN,
    ]);
  }

  // Empresas
  if (/\b(empresa\w*|oficina\w*|corporativ\w*|negocio|restaurante|por mayor|mayorista|factura electronica)\b/.test(q)) {
    const plans = await getPlans('empresa');
    return reply(`Tenemos planes para empresas con **factura electrónica**, capacitación de barismo y asesor dedicado: ${plans.map((p) => `**${p.name}** desde ${formatCOP(p.priceCop)}`).join(' y ')}. Déjanos tus datos y te armamos una propuesta.`, [{ type: 'link', label: 'Planes para empresas', href: '/empresas' }, HUMAN]);
  }

  // Suscripción
  if (/\b(suscri\w*|plan\w*|cada mes|mensual\w*|pausar|cancelar|saltar)\b/.test(q)) {
    if (uc?.subscription && /\b(mi suscri\w*|pausar|cancelar|saltar|cambiar|proximo envio|proximo cobro)\b/.test(q)) {
      const s = uc.subscription;
      return reply(`Tu plan **${s.plan}** está **${SUBSCRIPTION_STATUS_LABEL[s.status] ?? s.status}**${s.nextBillingAt ? `; el próximo envío se cobra el **${formatDate(s.nextBillingAt)}**` : ''}. Desde tu cuenta puedes pausar, saltar un envío, cambiar de café o cancelar sin penalidad.`, [{ type: 'link', label: 'Gestionar suscripción', href: '/cuenta/suscripcion' }]);
    }
    const plans = (await getPlans('personal')).slice(0, 3);
    const list = plans.map((p) => `• **${p.name}**: ${formatCOP(p.priceCop)} ${FREQUENCY_LABEL(p.frequencyWeeks).toLowerCase()} — ${p.tagline ?? ''}`).join('\n');
    const star = plans.find((p) => p.isHighlighted) ?? plans[0];
    return reply(`Con la suscripción recibes café recién tostado, con **envío gratis** y precio menor que en tienda. Pausa o cancela cuando quieras.\n\n${list}`, [
      ...(star ? [{ type: 'subscribe' as const, label: `Quiero el ${star.name}`, href: `/suscripciones/${star.slug}` }] : []),
      { type: 'link', label: 'Comparar planes', href: '/suscripciones' },
    ]);
  }

  // Academia
  if (/\b(curso\w*|academia|aprend\w*|clase\w*|barismo|barista|certificad\w*|latte art)\b/.test(q)) {
    const courses = await getCourses();
    const free = courses.find((c) => c.isFree);
    const pick = /espresso|latte|leche|maquina/.test(q) ? courses.find((c) => /espresso/.test(c.slug)) : /filtrad|v60|chemex|prensa/.test(q) ? courses.find((c) => /filtrad/.test(c.slug)) : /tueste|tostar/.test(q) ? courses.find((c) => /tueste/.test(c.slug)) : free;
    return reply(
      `En la **Academia Travesía** aprendes con Gabo y Alex, a tu ritmo y con certificado verificable.${pick ? ` Te recomiendo [${pick.title}](/academia/cursos/${pick.slug}) (${pick.isFree ? 'gratis' : formatCOP(pick.priceCop)}).` : ''}${free && pick?.id !== free.id ? ` Y si quieres empezar sin pagar, [${free.title}](/academia/cursos/${free.slug}) es gratis.` : ''} Con el plan **Maestro Premium** todos los cursos van incluidos.`,
      [...(pick ? [{ type: 'course' as const, label: 'Ver curso', href: `/academia/cursos/${pick.slug}` }] : []), { type: 'link', label: 'Explorar la Academia', href: '/academia' }],
    );
  }

  // Recomendación (método, sabor, presupuesto) → buscador
  const r = await searchCatalog(message);
  const products = r.items.filter((i) => i.kind === 'product').slice(0, 3);
  const anyMatch = /\b(recomien\w*|sugier\w*|que cafe|cual cafe|cafe para|busco|quiero un cafe|v ?60|chemex|espresso|prensa|greca|frut\w*|flor\w*|chocolat\w*|dulce|acid\w*|suave|fuerte|intens\w*|descaf\w*|cold brew)\b/.test(q) || parseBudget(message) !== null;
  if (anyMatch && r.items.length) {
    const top = r.items.slice(0, 3);
    return reply(
      `${/recomien|sugier|que cafe|cual cafe/.test(q) && !/v ?60|chemex|espresso|prensa|greca|frut|flor|chocolat|dulce|acid|suave|fuerte|intens|descaf/.test(q) ? 'Cuéntame cómo lo preparas (V60, espresso, prensa, greca…) y qué sabores te gustan. Mientras tanto, estos son los favoritos de la casa:' : 'Con lo que me cuentas, te recomiendo:'}\n${top.map((i) => `• [${i.title}](${i.href}) — ${formatCOP(i.priceCop)}. ${i.reason}`).join('\n')}`,
      [
        ...(products[0] ? [{ type: 'buy' as const, label: `Ver ${products[0].title}`.slice(0, 40), href: products[0].href }] : []),
        { type: 'link', label: 'Ver todos los cafés', href: '/tienda?tipo=coffee' },
      ],
    );
  }

  // Envíos
  if (/\b(envi\w*|domicilio|despach\w*|cuanto se demora|cuanto tarda|entrega\w*|llega a|mandan a|hacen envios)\b/.test(q)) {
    const zones = await getShippingZones();
    return reply(`Enviamos a toda Colombia, recién tostado:\n${zones.map((z) => `• **${z.name}**: ${formatCOP(z.rateCop)} (gratis desde ${formatCOP(z.freeFromCop ?? 0)}) · ${z.etaDays}`).join('\n')}\n\nLas suscripciones siempre tienen envío gratis.`, [{ type: 'link', label: 'Envíos y devoluciones', href: '/envios-y-devoluciones' }, { type: 'link', label: 'Ir a la tienda', href: '/tienda' }]);
  }

  // Pagos
  if (/\b(pago\w*|pagar|tarjeta|pse|nequi|daviplata|bancolombia|wompi|contraentrega|efectivo)\b/.test(q))
    return reply('Pagas seguro con **Wompi** (de Bancolombia): tarjetas de crédito y débito, **PSE**, **Nequi**, botón **Bancolombia** y **Daviplata**. Por ahora no manejamos contraentrega.', [{ type: 'link', label: 'Ir a la tienda', href: '/tienda' }]);

  // Tiendas / horario
  if (/\b(tienda fisica|local|punto\w*|donde quedan|direccion|horario\w*|abren|cierran|florida|medellin|visitar|caicedo|finca|tour)\b/.test(q)) {
    const stores = await getStores();
    const tour = (await getProducts({ kind: 'experience' })).find((p) => /tour|caicedo/.test(p.slug));
    return reply(`${stores.map((s) => `📍 **${s.name}** — ${s.address}. ${s.hours.join(' · ')}`).join('\n')}${tour ? `\n\n¿Quieres vivir el origen? Reserva la [${tour.name}](/tienda/${tour.slug}).` : ''}`, [{ type: 'link', label: 'Ver tiendas y mapa', href: '/tiendas' }, ...(tour ? [{ type: 'buy' as const, label: 'Reservar experiencia', href: `/tienda/${tour.slug}` }] : [])]);
  }

  // Regalo
  if (/\b(regal\w*|obsequi\w*|cumplea\w*|detalle|navidad)\b/.test(q)) {
    const kit = (await getProducts({ kind: 'kit' }))[0];
    return reply(`Para regalar origen, nuestro favorito es ${kit ? `el **${kit.name}** (${formatCOP(kit.priceFromCop)}): ${kit.subtitle?.toLowerCase() ?? ''}` : 'un kit de regalo'}. También puedes regalar una experiencia o un curso de la Academia.`, [
      ...(kit ? [{ type: 'buy' as const, label: 'Ver kit de regalo', href: `/tienda/${kit.slug}` }] : []),
      { type: 'link', label: 'Kits de regalo', href: '/tienda?tipo=kit' },
    ]);
  }

  // Precios
  if (/\b(precio\w*|cuanto (vale|cuesta)|valor|barato|economico|cuanto es)\b/.test(q) && !parseBudget(message)) {
    const coffees = await getProducts({ kind: 'coffee' });
    return reply(`Nuestros cafés de origen (340 g) van desde **${formatCOP(Math.min(...coffees.map((c) => c.priceFromCop)))}**:\n${coffees.map((c) => `• [${c.name}](/tienda/${c.slug}) — ${formatCOP(c.priceFromCop)}`).join('\n')}\n\nCon suscripción pagas hasta 15 % menos.`, [{ type: 'link', label: 'Ver todos los cafés', href: '/tienda?tipo=coffee' }]);
  }

  // Devoluciones / garantía
  if (/\b(devoluci\w*|cambio\w*|reembols\w*|garantia|llego mal|danad\w*|reclamo|pqrs|queja)\b/.test(q))
    return reply('Lamentamos cualquier inconveniente. Si tu pedido llegó con un problema, escríbenos dentro de los 5 días siguientes con fotos y tu número de pedido: lo resolvemos con reposición o reembolso.', [{ type: 'link', label: 'Envíos y devoluciones', href: '/envios-y-devoluciones' }, HUMAN]);

  // Genérico
  return reply('Puedo ayudarte a **elegir tu café**, con **suscripciones**, **cursos de la Academia**, **envíos** o el **estado de tu pedido**. Si prefieres, te conecto con una persona del equipo.', [
    { type: 'link', label: 'Recomiéndame un café', href: '/tienda?tipo=coffee' },
    { type: 'link', label: 'Preguntas frecuentes', href: '/preguntas-frecuentes' },
    HUMAN,
  ]);
}
