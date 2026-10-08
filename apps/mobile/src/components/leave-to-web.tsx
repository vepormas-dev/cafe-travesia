import { useEffect } from 'react';
import { Redirect } from 'expo-router';

import { openWeb } from '@/lib/links';

/** La tienda y el pago viven en cafetravesia.com. La app de las tiendas es solo la Academia. */
export function LeaveToWeb({ path }: { path: string }) {
  useEffect(() => {
    void openWeb(path);
  }, [path]);
  return <Redirect href="/academia" />;
}
