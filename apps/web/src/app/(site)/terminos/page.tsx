import type { Metadata } from 'next';
import { LegalPage } from '@/components/site/legal-page';

export const metadata: Metadata = {
  title: 'Términos y condiciones',
  description: 'Condiciones de uso de la tienda en línea, suscripciones, Academia y app de Café Travesía.',
  alternates: { canonical: '/terminos' },
};

const MD = `
> Los datos marcados con **[CONFIRMAR CON EL CLIENTE]** deben ser validados por Café Travesía y su asesor legal antes de publicar.

## 1. Quiénes somos

Este sitio (cafetravesia.com), la app móvil y la Academia son operados por **Café Travesía** [CONFIRMAR CON EL CLIENTE: razón social, NIT, domicilio y correo de notificaciones judiciales], con origen en Caicedo, Antioquia, y punto de venta en el Parque Comercial Florida, Medellín.

Al navegar, crear una cuenta o comprar aceptas estos términos. Si no estás de acuerdo, por favor no uses el servicio.

## 2. Cuenta de usuario

- Una sola cuenta sirve para la tienda, la Academia y la app. La identidad se gestiona con Firebase Authentication (correo y contraseña, Google o Apple).
- Eres responsable de la confidencialidad de tu contraseña y de la veracidad de tus datos.
- Podemos suspender cuentas que se usen para fraude o en contra de estos términos.

## 3. Productos, precios y disponibilidad

- Los precios están en pesos colombianos (COP) e incluyen IVA cuando aplica [CONFIRMAR CON EL CLIENTE: régimen tributario].
- El café es un producto agrícola: el perfil de taza puede variar levemente entre cosechas. Las ediciones de temporada son limitadas y se venden hasta agotar existencias.
- El precio final, el costo de envío y los descuentos se calculan y confirman en el servidor antes del pago.

## 4. Pagos

Los pagos se procesan a través de **Wompi** (Bancolombia): tarjetas de crédito y débito, PSE, Nequi, botón Bancolombia y Daviplata. Café Travesía no almacena los datos completos de tu tarjeta; Wompi los tokeniza bajo estándares PCI DSS.

Un pedido se confirma únicamente cuando Wompi aprueba la transacción. Si el pago es rechazado, el pedido queda sin efecto.

## 5. Suscripciones

- Al suscribirte autorizas el **cobro recurrente** del plan elegido con la frecuencia indicada, usando la fuente de pago tokenizada en Wompi.
- Puedes **pausar, saltar un envío, cambiar de café o de plan, o cancelar** en cualquier momento desde tu cuenta o la app, sin penalidad. Los cambios aplican desde el siguiente ciclo de cobro.
- Si un cobro falla, reintentaremos y te avisaremos; tras varios intentos fallidos la suscripción puede quedar en pausa.
- Los planes que incluyen Academia dan acceso a los cursos mientras la suscripción esté activa.

## 6. Academia Travesía y certificados

- Los cursos comprados dan acceso personal e intransferible al contenido. Está prohibido descargar, copiar o redistribuir videos y materiales.
- El certificado se emite al completar todas las lecciones y aprobar las evaluaciones, con un código verificable públicamente.

## 7. Experiencias (catas y tours)

Las reservas están sujetas a cupos. Puedes reprogramar con mínimo 72 horas de anticipación [CONFIRMAR CON EL CLIENTE]. Si cancelamos por clima o fuerza mayor, te ofrecemos nueva fecha o el reembolso total.

## 8. Derecho de retracto y reversión del pago

Conforme a la **Ley 1480 de 2011** (Estatuto del Consumidor), en ventas a distancia tienes **5 días hábiles** desde la entrega para ejercer el retracto, salvo las excepciones de ley (por ejemplo, bienes perecederos o de uso personal, empaques abiertos y contenidos digitales ya accedidos). La reversión del pago procede en los casos del artículo 51 de la misma ley. Detalles en [Envíos y devoluciones](/envios-y-devoluciones).

## 9. Puntos Travesía

Los puntos se acumulan con compras pagadas, no son dinero, no son transferibles y pueden vencer [CONFIRMAR CON EL CLIENTE: vigencia y valor del punto]. Podemos ajustar el programa avisando con anticipación.

## 10. Propiedad intelectual

La marca Café Travesía, el logotipo, el patrón andino, las fotos, los textos y los cursos son de Café Travesía o se usan con autorización. No pueden usarse sin permiso escrito.

## 11. Responsabilidad

Hacemos lo posible para que el sitio funcione sin interrupciones, pero puede haber pausas por mantenimiento o fallas de terceros (pasarela de pagos, transportadoras, proveedores de nube).

## 12. Ley aplicable y PQRS

Estos términos se rigen por las leyes de la República de Colombia. Para peticiones, quejas, reclamos o sugerencias escríbenos desde [Contacto](/contacto). También puedes acudir a la Superintendencia de Industria y Comercio (SIC).
`;

export default function TerminosPage() {
  return <LegalPage title="Términos y condiciones" intro="Las reglas claras de la casa: compras, suscripciones, Academia y app." updated="octubre de 2026 [CONFIRMAR CON EL CLIENTE]" current="/terminos" markdown={MD} />;
}
