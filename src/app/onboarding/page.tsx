"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function OnboardingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } =
      mode === "create"
        ? await supabase.rpc("create_household", { p_name: name })
        : await supabase.rpc("join_household", { p_code: code });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-emerald-50 to-slate-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-xl font-bold text-slate-900 text-center">
          ¡Último paso! 🏡
        </h1>
        <p className="text-slate-500 text-sm text-center mt-2 mb-6">
          Crea vuestro hogar, o únete al que ya creó tu pareja con su código.
        </p>

        <div className="grid grid-cols-2 gap-2 mb-6 bg-slate-100 rounded-xl p-1">
          <button
            onClick={() => setMode("create")}
            className={`rounded-lg py-2 text-sm font-medium transition ${
              mode === "create" ? "bg-white shadow text-emerald-700" : "text-slate-500"
            }`}
          >
            Crear hogar
          </button>
          <button
            onClick={() => setMode("join")}
            className={`rounded-lg py-2 text-sm font-medium transition ${
              mode === "join" ? "bg-white shadow text-emerald-700" : "text-slate-500"
            }`}
          >
            Tengo un código
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "create" ? (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del hogar (ej: Casa de Nico y ...)"
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm"
            />
          ) : (
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Código de invitación"
              required
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm"
            />
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl py-3 transition disabled:opacity-60"
          >
            {loading
              ? "Un momento..."
              : mode === "create"
                ? "Crear hogar"
                : "Unirme"}
          </button>
        </form>

        {mode === "create" && (
          <p className="text-xs text-slate-400 mt-4 text-center">
            Después de crearlo, en <b>Ajustes</b> encontrarás el código para
            invitar a tu pareja.
          </p>
        )}
      </div>
    </main>
  );
}
