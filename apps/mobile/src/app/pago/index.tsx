import { Redirect, useLocalSearchParams } from 'expo-router';

/** cafetravesia://pago?pedido=..&id=.. (retorno de Wompi) → pantalla de resultado. */
export default function PagoRedirect() {
  const params = useLocalSearchParams<{ pedido?: string; id?: string }>();
  return <Redirect href={{ pathname: '/pago/resultado', params }} />;
}
