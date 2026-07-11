"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  Target,
  Repeat,
  Settings,
  type LucideIcon,
} from "lucide-react";
import LogoMark from "./Logo";

const items: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Inicio", icon: LayoutDashboard },
  { href: "/gastos", label: "Gastos", icon: Receipt },
  { href: "/ingresos", label: "Ingresos", icon: Wallet },
  { href: "/presupuestos", label: "Presupuestos", icon: Target },
  { href: "/recurrentes", label: "Recurrentes", icon: Repeat },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <>
      {/* Barra lateral en escritorio */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-white/5 bg-[#0D1019] min-h-screen sticky top-0 p-4">
        <div className="flex items-center gap-2.5 px-2 py-3 mb-4">
          <LogoMark size={30} />
          <span className="font-bold text-white tracking-tight">
            Gastos Casa
          </span>
        </div>
        <nav className="space-y-1">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                pathname === it.href
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              <it.icon size={18} strokeWidth={2} />
              {it.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Barra inferior en móvil */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0D1019]/90 backdrop-blur-md border-t border-white/5 flex justify-around pb-[env(safe-area-inset-bottom)]">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={`flex flex-col items-center gap-1 py-2 px-1 text-[10px] font-medium ${
              pathname === it.href ? "text-white" : "text-slate-500"
            }`}
          >
            <it.icon size={19} strokeWidth={2} />
            {it.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
