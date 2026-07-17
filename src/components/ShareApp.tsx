"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

const APP_URL = "https://fliapp.vercel.app";
const SHARE_TEXT =
  "Estamos usando Fliapp para llevar los gastos de casa: quién pagó qué, presupuestos con avisos y las cuentas siempre claras entre los dos. Es gratis 👉";

export default function ShareApp() {
  const [copied, setCopied] = useState(false);

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Fliapp",
          text: SHARE_TEXT,
          url: APP_URL,
        });
      } catch {
        // el usuario cerró el diálogo: no hacemos nada
      }
      return;
    }
    await navigator.clipboard.writeText(`${SHARE_TEXT} ${APP_URL}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    `${SHARE_TEXT} ${APP_URL}`
  )}`;

  return (
    <div className="rise rise-5 rounded-3xl border border-white/5 p-6 bg-[#151923]">
      <h2 className="font-semibold text-sm text-slate-200 mb-1">
        ¿Te está sirviendo Fliapp?
      </h2>
      <p className="text-sm text-slate-400 mb-4">
        Compartila con otra pareja o con tus amigos — es gratis.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={share}
          className="flex items-center gap-2 bg-white hover:bg-slate-200 text-slate-900 text-sm font-semibold rounded-full px-4 py-2 transition"
        >
          {copied ? <Check size={15} /> : <Share2 size={15} />}
          {copied ? "¡Enlace copiado!" : "Compartir"}
        </button>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 border border-white/15 hover:bg-white/5 text-white text-sm font-semibold rounded-full px-4 py-2 transition"
        >
          WhatsApp
        </a>
      </div>
    </div>
  );
}
