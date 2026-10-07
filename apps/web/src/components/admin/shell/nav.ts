import {
  Activity,
  BarChart3,
  BellRing,
  BookOpen,
  Boxes,
  ClipboardList,
  FileText,
  GraduationCap,
  Image as ImageIcon,
  KeyRound,
  LayoutDashboard,
  LayoutTemplate,
  Mail,
  MapPin,
  MessagesSquare,
  Package,
  PlugZap,
  Repeat,
  ScrollText,
  ShoppingBag,
  Star,
  Ticket,
  Truck,
  Users,
  Award,
  Handshake,
  type LucideIcon,
} from 'lucide-react';
import type { Badges } from '@/lib/admin/types';

export type NavItem = { href: string; label: string; icon: LucideIcon; badge?: keyof Badges; badgeTone?: 'ambar' | 'danger'; adminOnly?: boolean; keys?: string };
export type NavGroup = { label: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    label: 'Resumen',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, keys: 'g d' },
      { href: '/admin/analitica', label: 'Analítica', icon: BarChart3, keys: 'g a' },
      { href: '/admin/monitor', label: 'Monitor', icon: Activity, badge: 'errors24h', badgeTone: 'danger' },
    ],
  },
  {
    label: 'Ventas',
    items: [
      { href: '/admin/pedidos', label: 'Pedidos', icon: ShoppingBag, badge: 'toPrepare', badgeTone: 'ambar', keys: 'g p' },
      { href: '/admin/suscripciones', label: 'Suscripciones', icon: Repeat, keys: 'g s' },
      { href: '/admin/cupones', label: 'Cupones', icon: Ticket, adminOnly: true },
      { href: '/admin/clientes', label: 'Clientes', icon: Users, keys: 'g c' },
    ],
  },
  {
    label: 'Catálogo',
    items: [
      { href: '/admin/productos', label: 'Productos', icon: Package, keys: 'g o' },
      { href: '/admin/planes', label: 'Planes', icon: Boxes },
      { href: '/admin/envios', label: 'Envíos', icon: Truck },
      { href: '/admin/resenas', label: 'Reseñas', icon: Star },
    ],
  },
  {
    label: 'Academia',
    items: [
      { href: '/admin/cursos', label: 'Cursos', icon: GraduationCap },
      { href: '/admin/estudiantes', label: 'Estudiantes', icon: BookOpen },
      { href: '/admin/certificados', label: 'Certificados', icon: Award },
    ],
  },
  {
    label: 'Contenido',
    items: [
      { href: '/admin/contenido', label: 'Páginas del sitio', icon: LayoutTemplate },
      { href: '/admin/blog', label: 'Blog', icon: FileText },
      { href: '/admin/medios', label: 'Medios', icon: ImageIcon, keys: 'g m' },
      { href: '/admin/puntos', label: 'Puntos físicos', icon: MapPin },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { href: '/admin/notificaciones', label: 'Notificaciones push', icon: BellRing, keys: 'g n' },
      { href: '/admin/leads', label: 'Leads / CRM', icon: Handshake, keys: 'g l' },
      { href: '/admin/newsletter', label: 'Newsletter', icon: Mail },
    ],
  },
  {
    label: 'Soporte',
    items: [{ href: '/admin/chat', label: 'Chat en vivo', icon: MessagesSquare, badge: 'chatsWaiting', badgeTone: 'danger', keys: 'g h' }],
  },
  {
    label: 'Configuración',
    items: [
      { href: '/admin/usuarios', label: 'Usuarios y roles', icon: KeyRound, adminOnly: true },
      { href: '/admin/integraciones', label: 'Integraciones', icon: PlugZap, adminOnly: true },
      { href: '/admin/auditoria', label: 'Auditoría', icon: ScrollText },
    ],
  },
];

export const ALL_NAV = NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label })));
export const isActive = (pathname: string, href: string) => (href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`));
export { ClipboardList };
