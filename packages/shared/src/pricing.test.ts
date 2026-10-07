import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeTotals, couponDiscount, findShippingZone, monthlyValue, orderNumber, type ShippingZoneRule } from './pricing';

const zones: ShippingZoneRule[] = [
  { id: 'med', name: 'Área metropolitana', regions: [], cities: ['Medellín', 'Envigado', 'Itagüí'], rateCop: 8000, freeFromCop: 120000, etaDays: '1-2 días', isDefault: false },
  { id: 'ant', name: 'Antioquia', regions: ['Antioquia'], cities: [], rateCop: 12000, freeFromCop: 150000, etaDays: '2-3 días', isDefault: false },
  { id: 'nal', name: 'Nacional', regions: [], cities: [], rateCop: 16000, freeFromCop: 180000, etaDays: '3-5 días', isDefault: true },
];
const coffee = (price: number, q = 1) => ({ kind: 'product' as const, unitPriceCop: price, quantity: q, requiresShipping: true });
const course = (price: number) => ({ kind: 'course' as const, unitPriceCop: price, quantity: 1, requiresShipping: false });

test('zona por ciudad sin tildes, luego departamento, luego por defecto', () => {
  assert.equal(findShippingZone(zones, 'Antioquia', 'itagui')?.id, 'med');
  assert.equal(findShippingZone(zones, 'antioquia', 'Rionegro')?.id, 'ant');
  assert.equal(findShippingZone(zones, 'Nariño', 'Pasto')?.id, 'nal');
});

test('envío gratis por umbral solo cuenta productos físicos', () => {
  const t = computeTotals({ lines: [coffee(54900, 2), course(120000)], zones, region: 'Antioquia', city: 'Medellín' });
  assert.equal(t.subtotalCop, 229800);
  assert.equal(t.shippingCop, 8000); // 109.800 en café < 120.000
  assert.equal(t.totalCop, 237800);
  const t2 = computeTotals({ lines: [coffee(60000, 2)], zones, city: 'Medellín' });
  assert.equal(t2.shippingCop, 0);
});

test('solo cursos: sin envío', () => {
  const t = computeTotals({ lines: [course(99000)], zones });
  assert.equal(t.requiresShipping, false);
  assert.equal(t.shippingCop, 0);
  assert.equal(t.totalCop, 99000);
});

test('cupones: porcentaje con alcance, fijo con tope, mínimo y envío gratis', () => {
  const lines = [coffee(50000), course(100000)];
  assert.equal(couponDiscount({ code: 'A', kind: 'percent', value: 10, scope: 'courses', minSubtotalCop: 0 }, lines).discountCop, 10000);
  assert.equal(couponDiscount({ code: 'B', kind: 'fixed', value: 999999, scope: 'products', minSubtotalCop: 0 }, lines).discountCop, 50000);
  assert.equal(couponDiscount({ code: 'C', kind: 'percent', value: 10, scope: 'all', minSubtotalCop: 200000 }, lines).reason, 'min');
  const t = computeTotals({ lines, zones, city: 'Pasto', coupon: { code: 'D', kind: 'free_shipping', value: 0, scope: 'all', minSubtotalCop: 0 } });
  assert.equal(t.shippingCop, 0);
  assert.equal(t.freeShippingByCoupon, true);
});

test('puntos: tope del 30 % y acumulación', () => {
  const t = computeTotals({ lines: [coffee(100000)], zones, city: 'Medellín', redeemPoints: 10000, availablePoints: 10000 });
  assert.equal(t.pointsDiscountCop, 30000);
  assert.equal(t.totalCop, 100000 - 30000 + 8000);
  assert.equal(t.pointsToEarn, 70);
});

test('MRR y número de pedido', () => {
  assert.equal(monthlyValue(60000, 4), 65000);
  assert.match(orderNumber(new Date('2026-10-07T12:00:00Z')), /^CT-261007-[A-Z2-9]{5}$/);
});
