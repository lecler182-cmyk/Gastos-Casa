"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import LogoMark from "@/components/Logo";

function traducirError(msg: string) {
  if (msg.includes("Invalid login credentials"))
    return "Correo o contraseña incorrectos.";
  if (msg.includes("Email not confirmed"))
    return "Tu cuenta aún no está confirmada. Revisa tu correo.";
  if (msg.includes("already registered"))
    return "Ese correo ya tiene una cuenta. Prueba a iniciar sesión.";
  if (msg.includes("at least 6 characters"))
    return "La contraseña debe tener al menos 6 caracteres.";
  return msg;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function submitEmail(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: name.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      setLoading(false);
      if (error) {
        setError(traducirError(error.message));
        return;
      }
      if (data.session) {
        // confirmación de email desactivada: entra directo
        router.replace("/");
        return;
      }
      setNotice(
        "¡Cuenta creada! Te enviamos un correo de bienvenida: confirma tu cuenta desde el enlace y ya puedes entrar."
      );
      setMode("signin");
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      setLoading(false);
      if (error) {
        setError(traducirError(error.message));
        return;
      }
      router.replace("/");
      router.refresh();
    }
  }

  async function forgotPassword() {
    setError(null);
    setNotice(null);
    if (!email.trim()) {
      setError("Escribe tu correo arriba y vuelve a pulsar aquí.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/restablecer`,
    });
    if (error) setError(traducirError(error.message));
    else
      setNotice(
        "Te enviamos un correo con un enlace para crear una contraseña nueva."
      );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-[#131A2C] to-[#0A0D14]">
      <div className="w-full max-w-sm bg-[#151923] border border-white/10 rounded-3xl shadow-2xl p-8">
        <div className="flex justify-center mb-4">
          <LogoMark size={56} />
        </div>
        <h1 className="text-2xl font-bold text-white text-center">Fliapp</h1>
        <p className="text-slate-400 mt-2 mb-6 text-sm text-center">
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
          Entrar con Google
        </button>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-slate-500">o con tu correo</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <form onSubmit={submitEmail} className="space-y-3">
          {mode === "signup" && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              required
              className="w-full border border-white/10 rounded-xl px-4 py-3 text-sm"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Correo electrónico"
            required
            className="w-full border border-white/10 rounded-xl px-4 py-3 text-sm"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={
              mode === "signup" ? "Crea una contraseña (mín. 6)" : "Contraseña"
            }
            required
            minLength={6}
            className="w-full border border-white/10 rounded-xl px-4 py-3 text-sm"
          />

          {error && <p className="text-sm text-red-400">{error}</p>}
          {notice && <p className="text-sm text-emerald-400">{notice}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white/10 hover:bg-white/15 border border-white/10 text-white font-semibold rounded-full py-3 transition disabled:opacity-60"
          >
            {loading
              ? "Un momento..."
              : mode === "signup"
                ? "Crear cuenta"
                : "Iniciar sesión"}
          </button>
        </form>

        <div className="flex items-center justify-between mt-4 text-xs">
          <button
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setNotice(null);
            }}
            className="text-indigo-300 hover:underline"
          >
            {mode === "signin"
              ? "¿No tienes cuenta? Regístrate"
              : "¿Ya tienes cuenta? Inicia sesión"}
          </button>
          {mode === "signin" && (
            <button
              onClick={forgotPassword}
              className="text-slate-500 hover:text-slate-300 hover:underline"
            >
              Olvidé mi contraseña
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
