/**
 * Durante el build de producción, corrige el CMS si todavía trae el teléfono de ejemplo.
 * Solo toca site_content.contact (whatsapp, phone) y stores.phone. No falla el build.
 */
import { createHmac } from 'node:crypto';

const PLACEHOLDER = /^(57)?300000000\d$/;
const WHATSAPP = '573147482358';

function digits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function isPlaceholder(value) {
  const d = digits(value);
  return d === '573000000000' || PLACEHOLDER.test(d);
}

async function gateway(payload) {
  const url = process.env.DB_GATEWAY_URL.replace(/\/$/, '');
  const body = JSON.stringify(payload);
  const ts = Date.now().toString();
  const signature = createHmac('sha256', process.env.DB_GATEWAY_SECRET).update(`${ts}.${body}`).digest('hex');
  const res = await fetch(`${url}/db.php`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-ct-timestamp': ts, 'x-ct-signature': signature },
    body,
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || `pasarela ${res.status}`);
  return data;
}

async function query(sql, params, method = 'objects') {
  const data = await gateway({ op: 'query', sql, params, method });
  return data.rows;
}

async function main() {
  if (process.env.VERCEL_ENV !== 'production') return;
  if (process.env.DB_DRIVER !== 'gateway' || !process.env.DB_GATEWAY_URL || !process.env.DB_GATEWAY_SECRET) return;
  if (process.env.DB_GATEWAY_SECRET === '[SENSITIVE]') return;

  const rows = await query('SELECT content FROM site_content WHERE `key` = ? LIMIT 1', ['contact']);
  if (!rows.length) throw new Error('sin site_content contact');
  const raw = rows[0].content;
  const before = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const whatsapp = !before.whatsapp || isPlaceholder(before.whatsapp) ? WHATSAPP : String(before.whatsapp);
  const phone = isPlaceholder(before.phone) ? '' : String(before.phone ?? '');
  const next = { ...before, whatsapp, phone };
  for (const key of Object.keys(before)) {
    if (key === 'whatsapp' || key === 'phone') continue;
    if (JSON.stringify(before[key]) !== JSON.stringify(next[key])) throw new Error(`campo inesperado: ${key}`);
  }
  if (JSON.stringify(before) !== JSON.stringify(next)) {
    await query('UPDATE site_content SET content = ? WHERE `key` = ?', [JSON.stringify(next), 'contact'], 'execute');
  }

  const stores = await query('SELECT id, slug, phone FROM stores', []);
  const cleared = [];
  for (const store of stores) {
    if (!store.phone || !isPlaceholder(store.phone)) continue;
    await query('UPDATE stores SET phone = NULL WHERE id = ? AND phone = ?', [store.id, store.phone], 'execute');
    cleared.push(store.slug);
  }
  const afterRows = await query('SELECT content FROM site_content WHERE `key` = ? LIMIT 1', ['contact']);
  const afterRaw = afterRows[0]?.content;
  const after = typeof afterRaw === 'string' ? JSON.parse(afterRaw) : afterRaw;
  console.log(JSON.stringify({
    sync: 'public-phones',
    contact: {
      whatsapp: { before: before.whatsapp ?? null, after: after?.whatsapp ?? null },
      phone: { before: before.phone ?? null, after: after?.phone ?? null },
    },
    storesCleared: cleared,
  }));
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'error';
  console.error(`sync-public-phones: ${message.replace(/https?:\/\/\S+/g, '[url]').slice(0, 240)}`);
  process.exitCode = 0;
});
