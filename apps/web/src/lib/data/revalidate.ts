import 'server-only';
import { revalidateTag, updateTag } from 'next/cache';
import { TAGS } from './tags';

/**
 * Invalida contenido público tras una edición en el CMS.
 * - En Server Actions usa updateTag (el editor ve el cambio de inmediato).
 * - En Route Handlers / cron usa revalidateTag con stale-while-revalidate.
 */
export function invalidate(tags: string[], mode: 'action' | 'route' = 'action') {
  for (const tag of tags) {
    if (mode === 'action') updateTag(tag);
    else revalidateTag(tag, 'max');
  }
}

export { TAGS };
