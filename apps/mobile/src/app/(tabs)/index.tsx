import { Redirect } from 'expo-router';

/** La app de tiendas es solo la Academia. La tienda y el plan viven en cafetravesia.com. */
export default function Home() {
  return <Redirect href="/academia" />;
}
