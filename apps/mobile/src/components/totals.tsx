import { View } from 'react-native';
import { formatCOP, type Totals } from '@travesia/shared';

import { C } from '@/theme';
import { T } from './ui';

export function TotalsView({ totals }: { totals: Totals }) {
  const row = (label: string, value: string, strong?: boolean, color?: string) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }} accessible accessibilityLabel={`${label}: ${value}`}>
      <T v={strong ? 'bodyStrong' : 'body'} color={strong ? C.noche : C.muted}>
        {label}
      </T>
      <T v={strong ? 'price' : 'bodyStrong'} color={color ?? C.noche}>
        {value}
      </T>
    </View>
  );
  return (
    <View style={{ gap: 8 }}>
      {row('Subtotal', formatCOP(totals.subtotalCop))}
      {totals.discountCop ? row('Descuento', `−${formatCOP(totals.discountCop)}`, false, C.montana) : null}
      {totals.pointsDiscountCop ? row('Puntos Travesía', `−${formatCOP(totals.pointsDiscountCop)}`, false, C.montana) : null}
      {totals.requiresShipping
        ? row(
            `Envío${totals.zone ? ` · ${totals.zone.name}` : ''}`,
            totals.freeShippingByCoupon || totals.shippingCop === 0 ? 'Gratis' : formatCOP(totals.shippingCop),
            false,
            totals.shippingCop === 0 ? C.montana : undefined,
          )
        : null}
      {totals.zone?.etaDays ? (
        <T v="small" color={C.muted}>
          Entrega estimada: {totals.zone.etaDays}
        </T>
      ) : null}
      <View style={{ height: 1, backgroundColor: C.line, marginVertical: 4 }} />
      {row('Total', formatCOP(totals.totalCop), true)}
      {totals.pointsToEarn ? (
        <T v="small" color={C.ambarProfundo}>
          Ganarás {totals.pointsToEarn} Puntos Travesía con esta compra.
        </T>
      ) : null}
    </View>
  );
}
