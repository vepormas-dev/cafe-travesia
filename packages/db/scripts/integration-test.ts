/**
 * Prueba de integración de punta a punta de la capa de datos:
 *   MySQL real (mysql-memory-server) ◀── pasarela PHP (php -S) ◀── drizzle (driver gateway)
 * Verifica: migraciones, CRUD, tipos (JSON, fechas, booleanos), transacción atómica con
 * rollback, firma HMAC (rechazo), bloqueo de DDL, subida de archivos con ticket y driver mysql2.
 *
 *   npm run test -w @travesia/db
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHmac } from 'node:crypto';
import assert from 'node:assert/strict';
import { createDB } from 'mysql-memory-server';

const here = dirname(fileURLToPath(import.meta.url));
const gatewayDir = join(here, '..', '..', '..', 'infra', 'cpanel', 'gateway');
const SECRET = 'test-secret-'.padEnd(64, 'x');

async function waitFor(url: string, tries = 50) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.status < 500) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Servidor no respondió: ' + url);
}

async function main() {
  const t0 = Date.now();
  console.log('• Iniciando MySQL…');
  const mysql = await createDB({ version: process.env.TEST_MYSQL_VERSION ?? '8.4.x', dbName: 'cafe_travesia', logLevel: 'ERROR' });
  const work = mkdtempSync(join(tmpdir(), 'ct-gw-'));
  const mediaDir = join(work, 'media');
  const cfgPath = join(work, 'config.php');
  const writeCfg = (allowDdl: boolean) =>
    writeFileSync(
      cfgPath,
      `<?php return ${JSON.stringify({
        secret: SECRET,
        db: { host: '127.0.0.1', port: mysql.port, name: mysql.dbName, user: mysql.username, pass: '' },
        allow_ddl: allowDdl,
        max_skew: 90,
        media: { dir: mediaDir, base_url: 'https://media.test', max_bytes: 5_000_000, allowed_mime: ['image/png', 'image/jpeg', 'application/pdf'] },
        cors_origins: ['https://cafetravesia.co'],
      })
        .replace(/\{/g, '[')
        .replace(/\}/g, ']')
        .replace(/":/g, '" =>')};`,
    );
  writeCfg(true);
  const port = 18080 + Math.floor(Math.random() * 1000);
  const php = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', gatewayDir], {
    env: { ...process.env, CT_GATEWAY_CONFIG: cfgPath },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let phpErr = '';
  php.stderr.on('data', (d) => (phpErr += d.toString()));
  const base = `http://127.0.0.1:${port}`;
  try {
    await waitFor(`${base}/health.php`);
    process.env.DB_DRIVER = 'gateway';
    process.env.DB_GATEWAY_URL = base;
    process.env.DB_GATEWAY_SECRET = SECRET;
    const { migrate } = await import('./migrate');
    const db = await import('../src/index');
    const { eq, sql } = await import('drizzle-orm');

    // 1. Salud + migraciones
    const ping = await db.pingDb();
    assert.ok(ping.ok, 'ping ' + ping.error);
    console.log(`✓ ping pasarela (MySQL ${ping.version}, ${ping.ms} ms)`);
    await migrate(() => undefined);
    await migrate(() => undefined); // idempotente
    const tables = await db.rawQuery<{ n: number }>("SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE()");
    console.log(`✓ migraciones aplicadas (${tables[0].n} tablas) e idempotentes`);

    // 2. DDL bloqueado en producción
    writeCfg(false);
    await assert.rejects(() => db.rawQuery('DROP TABLE users'), /DDL deshabilitado/);
    console.log('✓ DDL bloqueado con allow_ddl=false');

    // 3. Firma inválida rechazada
    const bad = await fetch(`${base}/db.php`, {
      method: 'POST',
      headers: { 'x-ct-timestamp': String(Date.now()), 'x-ct-signature': 'deadbeef' },
      body: JSON.stringify({ op: 'ping' }),
    });
    assert.equal(bad.status, 401);
    const old = String(Date.now() - 10 * 60_000);
    const replay = await fetch(`${base}/db.php`, {
      method: 'POST',
      headers: { 'x-ct-timestamp': old, 'x-ct-signature': db.signGatewayBody(SECRET, old, '{"op":"ping"}') },
      body: '{"op":"ping"}',
    });
    assert.equal(replay.status, 401);
    console.log('✓ firma inválida y firma vencida (replay) rechazadas');

    // 4. CRUD con tipos
    const d = db.getDb();
    const userId = crypto.randomUUID();
    await d.insert(db.users).values({ id: userId, firebaseUid: 'fb-1', email: 'ana@example.com', fullName: 'Ana Gómez ☕' });
    const productId = crypto.randomUUID();
    await d.insert(db.products).values({
      id: productId,
      slug: 'cima-del-viento',
      name: 'Cima del Viento',
      tastingNotes: ['cacao', 'panela', 'naranja'],
      profile: { tueste: 5, acidez: 6, cuerpo: 7, dulzor: 8, amargor: 3, complejidad: 7 },
      isFeatured: true,
      altitudeM: 1950,
    });
    const [p] = await d.select().from(db.products).where(eq(db.products.slug, 'cima-del-viento'));
    assert.deepEqual(p.tastingNotes, ['cacao', 'panela', 'naranja']);
    assert.equal(p.profile?.dulzor, 8);
    assert.equal(p.isFeatured, true);
    assert.equal(p.isActive, true);
    assert.equal(p.altitudeM, 1950);
    assert.ok(p.createdAt instanceof Date && !Number.isNaN(p.createdAt.getTime()));
    const [u] = await d.select().from(db.users).where(eq(db.users.id, userId));
    assert.equal(u.fullName, 'Ana Gómez ☕');
    const upd = await d.update(db.users).set({ loyaltyPoints: sql`${db.users.loyaltyPoints} + 120` }).where(eq(db.users.id, userId));
    assert.equal((upd as unknown as [{ affectedRows: number }])[0].affectedRows, 1);
    const joined = await d.query.products.findFirst({ where: eq(db.products.id, productId) });
    assert.equal(joined?.name, 'Cima del Viento');
    console.log('✓ CRUD: JSON, booleanos, enteros, fechas, emojis, update relativo y query API');

    // 4b. Carga inicial completa (idempotente)
    const { seed } = await import('./seed');
    await d.delete(db.products).where(eq(db.products.id, productId));
    await seed(() => undefined);
    await seed(() => undefined);
    const counts = await db.rawQuery<{ p: number; v: number; c: number; l: number; q: number; sc: number }>(
      'SELECT (SELECT COUNT(*) FROM products) p, (SELECT COUNT(*) FROM product_variants) v, (SELECT COUNT(*) FROM courses) c, (SELECT COUNT(*) FROM lessons) l, (SELECT COUNT(*) FROM quiz_questions) q, (SELECT COUNT(*) FROM site_content) sc',
    );
    assert.ok(counts[0].p >= 12 && counts[0].v >= 29 && counts[0].c === 4 && counts[0].l >= 15 && counts[0].q >= 4 && counts[0].sc >= 8, JSON.stringify(counts[0]));
    console.log(`✓ carga inicial idempotente (${counts[0].p} productos, ${counts[0].v} variantes, ${counts[0].c} cursos, ${counts[0].l} lecciones)`);

    // 5. Duplicados -> DbError.isDuplicate
    try {
      await d.insert(db.users).values({ firebaseUid: 'fb-2', email: 'ana@example.com' });
      assert.fail('debía fallar');
    } catch (e) {
      assert.ok(db.isDuplicateError(e), 'isDuplicate');
    }
    console.log('✓ violación de unicidad detectada (isDuplicate)');

    // 6. Transacción atómica: éxito y rollback
    const orderId = crypto.randomUUID();
    await db.atomic([
      d.insert(db.orders).values({ id: orderId, number: 'CT-TEST-1', email: 'ana@example.com', customerName: 'Ana', subtotalCop: 54900, totalCop: 54900, wompiReference: 'ref-1' }),
      d.insert(db.orderItems).values({ orderId, itemKind: 'product', productId, name: 'Cima del Viento', unitPriceCop: 54900, totalCop: 54900 }),
    ]);
    const items = await d.select().from(db.orderItems).where(eq(db.orderItems.orderId, orderId));
    assert.equal(items.length, 1);
    await assert.rejects(() =>
      db.atomic([
        d.insert(db.orders).values({ number: 'CT-TEST-2', email: 'x@example.com', customerName: 'X', subtotalCop: 1, totalCop: 1, wompiReference: 'ref-2' }),
        d.insert(db.orders).values({ number: 'CT-TEST-2', email: 'y@example.com', customerName: 'Y', subtotalCop: 1, totalCop: 1, wompiReference: 'ref-3' }),
      ]),
    );
    const leaked = await d.select().from(db.orders).where(eq(db.orders.wompiReference, 'ref-2'));
    assert.equal(leaked.length, 0, 'rollback');
    console.log('✓ transacción atómica: commit y rollback completo');

    // 7. Subida de archivos con ticket
    const payload = Buffer.from(JSON.stringify({ folder: 'productos', maxBytes: 1_000_000, exp: Math.floor(Date.now() / 1000) + 300, nonce: 'n1' })).toString('base64url');
    const ticket = `${payload}.${createHmac('sha256', SECRET).update(payload).digest('hex')}`;
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    const form = new FormData();
    form.set('ticket', ticket);
    form.set('file', new Blob([png], { type: 'image/png' }), 'x.png');
    const up = await fetch(`${base}/media.php`, { method: 'POST', body: form, headers: { origin: 'https://cafetravesia.co' } });
    const upJson = (await up.json()) as { ok: boolean; path: string; url: string; width: number; mime: string };
    assert.ok(upJson.ok, JSON.stringify(upJson));
    assert.equal(upJson.width, 1);
    assert.equal(upJson.mime, 'image/png');
    assert.ok(existsSync(join(mediaDir, upJson.path)));
    assert.equal(up.headers.get('access-control-allow-origin'), 'https://cafetravesia.co');
    const formBad = new FormData();
    formBad.set('ticket', ticket.slice(0, -2) + '00');
    formBad.set('file', new Blob([png], { type: 'image/png' }), 'x.png');
    assert.equal((await fetch(`${base}/media.php`, { method: 'POST', body: formBad })).status, 401);
    const formExe = new FormData();
    formExe.set('ticket', ticket);
    formExe.set('file', new Blob(['<?php echo 1;'], { type: 'image/png' }), 'x.php');
    assert.equal((await fetch(`${base}/media.php`, { method: 'POST', body: formExe })).status, 415);
    const delBody = JSON.stringify({ op: 'delete', path: upJson.path });
    const ts = String(Date.now());
    const del = await fetch(`${base}/media.php`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-ct-timestamp': ts, 'x-ct-signature': db.signGatewayBody(SECRET, ts, delBody) },
      body: delBody,
    });
    assert.equal(((await del.json()) as { deleted: boolean }).deleted, true);
    console.log('✓ medios: subida con ticket, MIME real verificado (PHP disfrazado rechazado), ticket alterado rechazado, borrado');

    // 8. Driver mysql2 directo sobre la misma base
    delete (globalThis as { __travesiaDb?: unknown }).__travesiaDb;
    process.env.DB_DRIVER = 'mysql';
    process.env.DATABASE_URL = `mysql://${mysql.username}@127.0.0.1:${mysql.port}/${mysql.dbName}`;
    process.env.DB_SSL = 'false';
    const d2 = db.getDb();
    const [p2] = await d2.select().from(db.products).where(eq(db.products.slug, 'travesia-caicedo'));
    assert.deepEqual(p2.tastingNotes, ['Chocolate', 'Panela', 'Nuez']);
    assert.equal(p2.isFeatured, true);
    assert.ok(p2.createdAt instanceof Date);
    console.log('✓ driver mysql2 directo lee los mismos datos con los mismos tipos');

    console.log(`\nTodo OK en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  } finally {
    php.kill();
    await mysql.stop();
    if (phpErr.includes('Fatal')) console.error(phpErr);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error('✗', e);
  process.exit(1);
});
void readFileSync;
