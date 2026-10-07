// Lector mínimo de archivos .env (KEY=VALUE, comillas simples/dobles, comentarios #).
// Sin dependencias para que los scripts corran con `node` puro (Node 22).
import { readFileSync } from 'node:fs';

export function parseDotenv(text) {
  const out = {};
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2];
    if (val.startsWith('"') || val.startsWith("'")) {
      const q = val[0];
      let acc = val.slice(1);
      // valor entre comillas que puede continuar en varias líneas
      while (!acc.replace(/\\./g, '').includes(q) && i + 1 < lines.length) acc += '\n' + lines[++i];
      const end = acc.lastIndexOf(q);
      val = end >= 0 ? acc.slice(0, end) : acc;
      if (q === '"') val = val.replace(/\\"/g, '"');
    } else {
      val = val.replace(/\s+#.*$/, '').trim();
    }
    out[key] = val;
  }
  return out;
}

export function loadDotenv(path) {
  return parseDotenv(readFileSync(path, 'utf8'));
}

/** Devuelve un objeto de entorno: archivo (si se pasa) con prioridad sobre process.env si `merge`. */
export function resolveEnv(file, { merge = false } = {}) {
  if (!file) return { ...process.env };
  const fromFile = loadDotenv(file);
  return merge ? { ...process.env, ...fromFile } : fromFile;
}

export const val = (env, k) => {
  const x = env[k];
  return typeof x === 'string' && x.trim() !== '' ? x.trim() : undefined;
};
