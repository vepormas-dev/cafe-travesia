"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "cafe-travesia-cookies";

export function CookieNotice() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try { if (!localStorage.getItem(KEY)) setOpen(true); } catch { setOpen(false); }
  }, []);
  if (!open) return null;
  return (
    <div className="fixed inset-x-3 bottom-3 z-[70] mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl bg-[#1c1410] px-4 py-3 text-sm text-[#f6efe4] shadow-lg md:flex-row md:items-center" role="dialog" aria-label="Aviso de cookies">
      <p className="m-0">Usamos cookies propias para la sesión y el carrito. No hay cookies de publicidad.</p>
      <div className="flex shrink-0 gap-3">
        <Link href="/privacidad" className="underline">Privacidad</Link>
        <button type="button" className="rounded-full bg-[#c4a574] px-3 py-1.5 font-semibold text-[#1c1410]" onClick={() => { try { localStorage.setItem(KEY, "1"); } catch { /* preferencia local */ } setOpen(false); }}>Entendido</button>
      </div>
    </div>
  );
}
