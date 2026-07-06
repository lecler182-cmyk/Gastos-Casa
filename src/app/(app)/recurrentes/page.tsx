"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useApp } from "@/components/AppProvider";
import { fmtMoney, firstName } from "@/lib/format";
import type { RecurringExpense, Scope } from "@/lib/types";

export default function RecurrentesPage() {
  const { household, members, userId, categories } = useApp();
  const [items, setItems] = useState<RecurringExpense[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    category_id: "",
    note: "",
    scope: "shared" as Scope,
    paid_by: userId,
    day_of_month: "1",
  });

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("recurring_expenses")
      .select("*")
      .eq("household_id", household.id)
      .order("day_of_month");
    setItems((data ?? []) as RecurringExpense[]);
  }, [household.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(ev: React.FormEvent) {
    ev.preventDefault();
    const amount = parseFloat(form.amount.replace(",", "."));
    const day = parseInt(form.day_of_month, 10);
    if (!amount || amount <= 0 || !day || day < 1 || day > 28) return;
    setSaving(true);
    await supabase.from("recurring_expenses").insert({
      household_id: household.id,
      paid_by: form.paid_by,
      category_id: form.category_id || null,
      amount,
      note: form.note.trim() || null,
      scope: form.scope,
      day_of_month: day,
    });
    setSaving(false);
    setShowForm(false);
    setForm({
      amount: "",
      category_id: "",
      note: "",
      scope: "shared",
      paid_by: userId,
      day_of_month: "1",
    });
    load();
  }

  async function toggle(item: RecurringExpense) {
    await supabase
      .from("recurring_expenses")
      .update({ active: !item.active })
      .eq("id", item.id);
    load();
  }

  async function remove(id: string) {
    if (
      !window.confirm(
        "¿Eliminar este gasto recurrente? Los gastos ya generados no se borran."
      )
    )
      return;
    await supabase.from("recurring_expenses").delete().eq("id", id);
    load();
  }

  const nameOf = (id: string) => {
    const m = members.find((x) => x.id === id);
    if (!m) return "";
    return m.id === userId ? "Tú" : firstName(m.full_name, m.email);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Gastos recurrentes</h1>
          <p className="text-sm text-slate-500 mt-1">
            Alquiler, suscripciones, cuotas... se registran solos cada mes el
            día que elijas.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl px-4 py-2 transition shrink-0"
        >
          + Nuevo
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={save}
          className="bg-white rounded-2xl border border-emerald-200 p-5 space-y-4"
        >
          <h2 className="font-semibold text-sm">Nuevo gasto recurrente</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 block mb-1">
                Monto *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                autoFocus
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">
                Día del mes (1–28)
              </label>
              <input
                type="number"
                min="1"
                max="28"
                required
                value={form.day_of_month}
                onChange={(e) =>
                  setForm({ ...form, day_of_month: e.target.value })
                }
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">
                Categoría
              </label>
              <select
                value={form.category_id}
                onChange={(e) =>
                  setForm({ ...form, category_id: e.target.value })
                }
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm"
              >
                <option value="">Sin categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">
                Pagado por
              </label>
              <select
                value={form.paid_by}
                onChange={(e) => setForm({ ...form, paid_by: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {nameOf(m.id)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-slate-100 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setForm({ ...form, scope: "shared" })}
              className={`rounded-lg py-2 text-sm font-medium transition ${
                form.scope === "shared"
                  ? "bg-white shadow text-emerald-700"
                  : "text-slate-500"
              }`}
            >
              💑 Compartido
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, scope: "personal" })}
              className={`rounded-lg py-2 text-sm font-medium transition ${
                form.scope === "personal"
                  ? "bg-white shadow text-emerald-700"
                  : "text-slate-500"
              }`}
            >
              👤 Personal
            </button>
          </div>

          <div>
            <label className="text-xs text-slate-500 block mb-1">
              Nota (ej: Netflix, alquiler)
            </label>
            <input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-sm text-slate-500 px-4 py-2 rounded-xl hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl px-5 py-2 transition disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
        {items.length === 0 ? (
          <p className="text-sm text-slate-400 py-10 text-center">
            Sin gastos recurrentes. Agrega el alquiler o tus suscripciones 📺
          </p>
        ) : (
          items.map((r) => {
            const cat = categories.find((c) => c.id === r.category_id);
            return (
              <div
                key={r.id}
                className={`flex items-center gap-3 px-4 py-3 ${
                  r.active ? "" : "opacity-50"
                }`}
              >
                <span className="text-xl">{cat?.icon ?? "🔁"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {r.note || cat?.name || "Recurrente"}
                  </p>
                  <p className="text-xs text-slate-400">
                    Día {r.day_of_month} de cada mes · {nameOf(r.paid_by)} ·{" "}
                    {r.scope === "shared" ? "💑 Compartido" : "👤 Personal"}
                  </p>
                </div>
                <span className="text-sm font-semibold whitespace-nowrap">
                  {fmtMoney(Number(r.amount), household.currency)}
                </span>
                <button
                  onClick={() => toggle(r)}
                  className={`text-xs font-medium rounded-lg px-2 py-1 ${
                    r.active
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {r.active ? "Activo" : "Pausado"}
                </button>
                <button
                  onClick={() => remove(r.id)}
                  className="text-slate-300 hover:text-red-500 px-1"
                  aria-label="Eliminar"
                >
                  ✕
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
