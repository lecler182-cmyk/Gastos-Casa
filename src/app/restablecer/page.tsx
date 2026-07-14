"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import LogoMark from "@/components/Logo";

export default function RestablecerPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    if (password !== repeat) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(
        error.message.includes("at least 6 characters")
          ? "La contraseña debe tener al menos 6 caracteres."
          : error.message
      );
      return;
    }
    router.replace("/");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-[#131A2C] to-[#0A0D14]">
      <div className="w-full max-w-sm bg-[#151923] border border-white/10 rounded-3xl shadow-2xl p-8">
        <div className="flex justify-center mb-4">
          <LogoMark size={48} />
        </div>
        <h1 className="text-xl font-bold text-white text-center">
          Nueva contraseña
        </h1>
        <p className="text-slate-400 text-sm text-center mt-2 mb-6">
          Elige una contraseña nueva para tu cuenta.
        </p>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nueva contraseña (mín. 6)"
            required
            minLength={6}
            className="w-full border border-white/10 rounded-xl px-4 py-3 text-sm"
          />
          <input
            type="password"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            placeholder="Repite la contraseña"
            required
            minLength={6}
            className="w-full border border-white/10 rounded-xl px-4 py-3 text-sm"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white hover:bg-slate-200 text-slate-900 font-semibold rounded-full py-3 transition disabled:opacity-60"
          >
            {loading ? "Guardando..." : "Guardar y entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
