import type { Metadata } from 'next';
import { LegalPage } from '@/components/site/legal-page';

export const metadata: Metadata = {
  title: 'Política de privacidad y tratamiento de datos',
  description: 'Cómo Café Travesía trata tus datos personales conforme a la Ley 1581 de 2012 (habeas data) en Colombia.',
  alternates: { canonical: '/privacidad' },
};

const MD = `
> Política de tratamiento de datos personales conforme a la **Ley Estatutaria 1581 de 2012**, el **Decreto 1377 de 2013** (compilado en el Decreto 1074 de 2015) y demás normas de protección de datos en Colombia.

## 1. Responsable del tratamiento

Responsable del tratamiento: **Café Travesía**, con origen en Caicedo, Antioquia, y punto de venta en el Parque Comercial Florida, Medellín. Canales de contacto: correo **info@cafetravesia.co** y WhatsApp **+57 314 748 2358**.

## 2. Datos que recolectamos

- **Identificación y contacto:** nombre, correo, teléfono, documento (para facturación y envíos) y direcciones de entrega.
- **Transacciones:** pedidos, suscripciones, cupones, Puntos Travesía y estado de los pagos. **No almacenamos los datos completos de tu tarjeta**: los gestiona Wompi.
- **Academia:** cursos, progreso, notas, evaluaciones y certificados.
- **Conversaciones:** mensajes con el Asistente Travesía y con nuestros asesores.
- **Navegación:** estadísticas agregadas de visitas (ruta, fuente de tráfico y tipo de dispositivo), **sin cookies de seguimiento ni identificadores personales**.

## 3. Finalidades

1. Gestionar tu cuenta, compras, envíos, suscripciones y cursos.
2. Procesar pagos y prevenir fraude.
3. Atender PQRS, soporte y el asistente de chat.
4. Enviarte información comercial (boletín, push, lanzamientos) **solo si lo autorizas**; puedes retirarte en cualquier momento.
5. Mejorar el sitio con estadísticas agregadas.
6. Cumplir obligaciones legales, contables y tributarias (factura electrónica).

## 4. Encargados y proveedores

Compartimos datos solo en lo necesario con:

- **Wompi (Bancolombia):** procesamiento de pagos y tokenización de tarjetas.
- **Firebase Authentication (Google):** inicio de sesión con correo, Google o Apple.
- **Proveedor de hosting en Colombia/cPanel:** almacenamiento de la base de datos y archivos.
- **Vercel:** alojamiento de la aplicación web.
- **Transportadoras:** nombre, dirección y teléfono para entregar tu pedido.
- **Proveedor de IA (compatible con OpenAI):** para responder en el chat y recomendaciones; no enviamos datos de pago y minimizamos los datos personales.
- **Expo (notificaciones push)** y **proveedor de correo SMTP**.

Algunos proveedores pueden almacenar datos fuera de Colombia (transferencia internacional), con garantías adecuadas de seguridad.

## 5. Cookies

Usamos **solo cookies propias y necesarias**: la cookie de sesión \`__session\` (httpOnly, para mantenerte conectado) y el almacenamiento local del navegador para tu carrito y la conversación del chat. No usamos cookies publicitarias ni de terceros para rastrearte.

## 6. Tus derechos (habeas data)

Como titular puedes: **conocer, actualizar y rectificar** tus datos; **solicitar prueba de la autorización**; ser informado del uso; **revocar la autorización y/o pedir la supresión** cuando no exista un deber legal de conservarlos; acceder gratuitamente a tus datos; y presentar quejas ante la **Superintendencia de Industria y Comercio (SIC)**.

## 7. Cómo ejercerlos

Escríbenos a **info@cafetravesia.co** o desde [Contacto](/contacto) indicando tu nombre, documento y solicitud. Respondemos **consultas en máximo 10 días hábiles** y **reclamos en máximo 15 días hábiles**, prorrogables según la ley.

Para **eliminar tu cuenta** y los datos personales asociados, entra a [Eliminar cuenta](/eliminar-cuenta) (también desde la app, en Perfil › Eliminar mi cuenta). Cancelamos suscripciones, anulamos tarjetas guardadas en Wompi y borramos direcciones, notas, dispositivos y el acceso a cursos. Conservamos el registro de compras ya facturadas, desvinculado de la cuenta, por obligación contable.

## 8. Menores de edad

Nuestros servicios están dirigidos a mayores de 18 años. No recolectamos intencionalmente datos de menores.

## 9. Seguridad y conservación

Aplicamos cifrado en tránsito (HTTPS), control de acceso por roles, firmas HMAC en la conexión con la base de datos y registros de auditoría. Conservamos los datos mientras exista la relación y por los plazos legales (p. ej., contables).

## 10. Vigencia

Esta política rige desde su publicación. Te avisaremos de cambios sustanciales por correo o en el sitio.
`;

export default function PrivacidadPage() {
  return <LegalPage title="Política de privacidad" intro="Tus datos, tratados con el mismo cuidado que cada cereza." updated="octubre de 2026" current="/privacidad" markdown={MD} />;
}
