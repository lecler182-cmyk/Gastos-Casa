"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useApp } from "@/components/AppProvider";
import { firstName } from "@/lib/format";

const CURRENCIES = ["EUR", "USD", "ARS", "MXN", "CLP", "COP", "UYU", "GBP"];

export default function AjustesPage() {
  const router = useRouter();
  const { household, members, partner, userId, categories, reload } = useApp();

  const [name, setName] = useState(household.name);
  const [currency, setCurrency] = useState(household.currency);
  // porcentaje que paga el usuario actual en los gastos compartidos
  const myShareInit = Math.round(
    (userId === household.created_by
      ? Number(household.creator_share)
      : 1 - Number(household.creator_share)) * 100
  );
  const [myShare, setMyShare] = useState(myShareInit);
  const [savingHouse, setSavingHouse] = useState(false);
  const [copied, setCopied] = useState(false);

  const [newCat, setNewCat] = useState({ name: "", icon: "🧾" });
  const [savingCat, setSavingCat] = useState(false);

  async function saveHousehold() {
    setSavingHouse(true);
    const creatorShare =
      userId === household.created_by ? myShare / 100 : 1 - myShare / 100;
    await supabase
      .from("households")
      .update({
        name: name.trim() || "Nuestro hogar",
        currency,
        creator_share: creatorShare,
      })
      .eq("id", household.id);
    await reload();
    setSavingHouse(false);
  }

  async function copyCode() {
    await navigator.clipboard.writeText(household.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function addCategory(ev: React.FormEvent) {
    ev.preventDefault();
    if (!newCat.name.trim()) return;
    setSavingCat(true);
    await supabase.from("categories").insert({
      household_id: household.id,
      name: newCat.name.trim(),
      icon: newCat.icon.trim() || "🧾",
    });
    setNewCat({ name: "", icon: "🧾" });
    await reload();
    setSavingCat(false);
  }

  async function removeCategory(id: string) {
    if (
      !window.confirm(
        "¿Eliminar esta categoría? Los gastos existentes quedarán sin categoría."
      )
    )
      return;
    await supabase.from("categories").delete().eq("id", id);
    await reload();
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const partnerName = partner
    ? firstName(partner.full_name, partner.email)
    : "tu pareja";

  return (
    <div className="space-y-6">
      <h1 className="text-xl md:text-2xl font-bold">Ajustes</h1>

      {/* Hogar */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h2 className="font-semibold text-sm text-slate-700">🏡 Hogar</h2>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Nombre</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Moneda</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">
            División de gastos compartidos
          </label>
          <input
            type="range"
            min="10"
            max="90"
            step="5"
            value={myShare}
            onChange={(e) => setMyShare(Number(e.target.value))}
            className="w-full accent-emerald-600"
          />
          <p className="text-sm text-slate-600 text-center">
            Tú pagas <b>{myShare}%</b> · {partnerName} paga{" "}
            <b>{100 - myShare}%</b>
          </p>
        </div>
        <button
          onClick={saveHousehold}
          disabled={savingHouse}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl px-5 py-2 transition disabled:opacity-60"
        >
          {savingHouse ? "Guardando..." : "Guardar cambios"}
        </button>
      </section>

      {/* Miembros / invitación */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <h2 className="font-semibold text-sm text-slate-700">👥 Miembros</h2>
        <ul className="space-y-2">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 text-sm">
              {m.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.avatar_url}
                  alt=""
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <span className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  👤
                </span>
              )}
              <span className="font-medium">
                {firstName(m.full_name, m.email)}
                {m.id === userId && (
                  <span className="text-slate-400 font-normal"> (tú)</span>
                )}
              </span>
              <span className="text-slate-400 text-xs truncate">{m.email}</span>
            </li>
          ))}
        </ul>
        {members.length < 2 && (
          <div className="bg-emerald-50 rounded-xl p-4">
            <p className="text-sm text-emerald-900">
              Invita a tu pareja: que entre con su Google y use este código en
              la pantalla de bienvenida.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <code className="bg-white border border-emerald-200 rounded-lg px-3 py-1.5 font-mono text-lg tracking-wider">
                {household.invite_code}
              </code>
              <button
                onClick={copyCode}
                className="text-sm font-medium text-emerald-700 hover:underline"
              >
                {copied ? "¡Copiado! ✓" : "Copiar"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Categorías */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <h2 className="font-semibold text-sm text-slate-700">🏷️ Categorías</h2>
        <ul className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full pl-3 pr-1.5 py-1 text-sm"
            >
              <span>
                {c.icon} {c.name}
              </span>
              <button
                onClick={() => removeCategory(c.id)}
                className="text-slate-300 hover:text-red-500 w-5 h-5 flex items-center justify-center"
                aria-label={`Eliminar ${c.name}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={addCategory} className="flex gap-2">
          <input
            value={newCat.icon}
            onChange={(e) => setNewCat({ ...newCat, icon: e.target.value })}
            className="w-14 border border-slate-300 rounded-xl px-2 py-2 text-sm text-center"
            aria-label="Emoji"
          />
          <input
            value={newCat.name}
            onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
            placeholder="Nueva categoría"
            className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={savingCat}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl px-4 transition disabled:opacity-60"
          >
            Añadir
          </button>
        </form>
      </section>

      {/* Sesión */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5">
        <button
          onClick={signOut}
          className="text-sm font-medium text-red-600 hover:underline"
        >
          Cerrar sesión
        </button>
      </section>
    </div>
  );
}
