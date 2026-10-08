import { useLocalSearchParams } from 'expo-router';

import { LeaveToWeb } from '@/components/leave-to-web';

export default function Producto() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const id = typeof slug === 'string' ? slug : '';
  return <LeaveToWeb path={id ? `/tienda/${id}` : '/tienda'} />;
}
