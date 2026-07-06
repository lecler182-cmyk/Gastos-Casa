"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Inicio", icon: "🏠" },
  { href: "/gastos", label: "Gastos", icon: "💸" },
  { href: "/ingresos", label: "Ingresos", icon: "💵" },
  { href: "/presupuestos", label: "Presupuestos", icon: "🎯" },
  { href: "/recurrentes", label: "Recurrentes", icon: "🔁" },
  { href: "/ajustes", label: "Ajustes", icon: "⚙️" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <>
      {/* Barra lateral en escritorio */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-slate-200 bg-white min-h-screen sticky top-0 p-4">
        <div className="flex items-center gap-2 px-2 py-3 mb-4">
          <span className="text-2xl">💰</span>
          <span className="font-bold text-slate-900">Gastos Casa</span>
        </div>
        <nav className="space-y-1">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                pathname === it.href
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>{it.icon}</span>
              {it.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Barra inferior en móvil */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 flex justify-around pb-[env(safe-area-inset-bottom)]">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={`flex flex-col items-center gap-0.5 py-2 px-1 text-[10px] font-medium ${
              pathname === it.href ? "text-emerald-600" : "text-slate-400"
            }`}
          >
            <span className="text-lg leading-none">{it.icon}</span>
            {it.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
