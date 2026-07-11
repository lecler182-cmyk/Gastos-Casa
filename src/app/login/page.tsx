"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-[#131A2C] to-[#0A0D14]">
      <div className="w-full max-w-sm bg-[#151923] border border-white/10 rounded-2xl shadow-2xl p-8 text-center">
        <div className="text-5xl mb-3">💰</div>
        <h1 className="text-2xl font-bold text-white">Gastos Casa</h1>
        <p className="text-slate-400 mt-2 mb-8 text-sm">
          Gastos diarios, presupuestos y cuentas compartidas en pareja
        </p>
        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-200 rounded-full py-3 px-4 font-semibold text-slate-900 transition disabled:opacity-60"
        >
          <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
            <path
              fill="#FFC107"
              d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.5 6.1 29.5 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"
            />
            <path
              fill="#FF3D00"
              d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.4 0 10.3-2.1 14-5.4l-6.5-5.5c-2.1 1.6-4.7 2.9-7.5 2.9-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.6 16.3 44 24 44z"
            />
            <path
              fill="#1976D2"
              d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4 5.6l6.5 5.5C41.4 35.4 44 30.1 44 24c0-1.3-.1-2.6-.4-3.9z"
            />
          </svg>
          {loading ? "Redirigiendo..." : "Entrar con Google"}
        </button>
        <p className="text-xs text-slate-400 mt-6">
          Sin contraseñas. Solo tu cuenta de Google.
        </p>
      </div>
    </main>
  );
}
