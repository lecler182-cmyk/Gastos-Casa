"use client";

import {
  Banknote,
  Car,
  Home,
  Lightbulb,
  Pill,
  ReceiptText,
  Repeat,
  Shirt,
  ShoppingCart,
  Ticket,
  Tv,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

/**
 * Las categorías guardan un emoji en la base de datos; aquí se mapea a un
 * icono de línea profesional. Si el usuario creó una categoría con un emoji
 * que no está en el mapa, se muestra el emoji tal cual.
 */
const EMOJI_TO_ICON: Record<string, LucideIcon> = {
  "🛒": ShoppingCart,
  "🏠": Home,
  "💡": Lightbulb,
  "🚗": Car,
  "🎉": Ticket,
  "🍽️": UtensilsCrossed,
  "🍽": UtensilsCrossed,
  "💊": Pill,
  "👕": Shirt,
  "📺": Tv,
  "🧾": ReceiptText,
  "💵": Banknote,
  "🔁": Repeat,
};

export function CategoryIcon({
  icon,
  size = 16,
  className = "w-9 h-9 rounded-full bg-white/5 text-slate-300 flex items-center justify-center shrink-0",
}: {
  icon?: string | null;
  size?: number;
  className?: string;
}) {
  const Icon = EMOJI_TO_ICON[(icon ?? "").trim()];
  return (
    <span className={className}>
      {Icon ? (
        <Icon size={size} strokeWidth={2} />
      ) : (
        <span className="text-base leading-none">{icon || "•"}</span>
      )}
    </span>
  );
}
