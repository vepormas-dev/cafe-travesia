import { getStores } from '@/lib/data/catalog';
import { json } from '@/lib/api';

export async function GET() {
  return json({ stores: await getStores() });
}
