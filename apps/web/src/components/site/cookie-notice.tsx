"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

const KEY = "cafe-travesia-cookies";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function readPending() {
  try { return !localStorage.getItem(KEY); } catch { return false; }
}

export function CookieNotice() {
  // Se lee localStorage sin setState dentro de un efecto (regla react-hooks/set-state-in-effect)
  const pending = useSyncExternalStore(subscribe, readPending, () => false);
  const [dismissed, setDismissed] = useState(false);
  if (!pending || dismissed) return null;
  return (
    <div className="fixed inset-x-3 bottom-3 z-[70] mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl bg-[#1c1410] px-4 py-3 text-sm text-[#f6efe4] shadow-lg md:flex-row md:items-center" role="dialog" aria-label="Aviso de cookies">
      <p className="m-0">Usamos cookies propias para la sesión y el carrito. No hay cookies de publicidad.</p>
      <div className="flex shrink-0 gap-3">
        <Link href="/privacidad" className="underline">Privacidad</Link>
        <button type="button" className="rounded-full bg-[#c4a574] px-3 py-1.5 font-semibold text-[#1c1410]" onClick={() => { try { localStorage.setItem(KEY, "1"); } catch { /* preferencia local */ } setDismissed(true); }}>Entendido</button>
      </div>
    </div>
  );
}
