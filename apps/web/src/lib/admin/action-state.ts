/** Estado estándar de las Server Actions del panel (serializable, seguro para cliente). */
export type ActionState<T = unknown> = {
  ok: boolean;
  message: string;
  errors?: Record<string, string[]>;
  data?: T;
  demo?: boolean;
  /** marca de tiempo para disparar toasts aunque el mensaje se repita */
  ts: number;
};
export const initialActionState: ActionState = { ok: false, message: '', ts: 0 };
export const DEMO_MESSAGE = 'Modo demo: los cambios no se guardan.';
