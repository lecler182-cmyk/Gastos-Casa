"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useApp } from "@/components/AppProvider";
import { CategoryIcon } from "@/lib/icons";
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
          <p className="text-sm text-slate-400 mt-1">
            Alquiler, suscripciones, cuotas... se registran solos cada mes el
            día que elijas.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-white hover:bg-slate-200 text-slate-900 text-sm font-semibold rounded-full px-4 py-2 transition shrink-0"
        >
          + Nuevo
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={save}
          className="bg-[#151923] rounded-3xl border border-white/10 p-6 space-y-4"
        >
          <h2 className="font-semibold text-sm">Nuevo gasto recurrente</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">
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
                className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">
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
                className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Categoría
              </label>
              <select
                value={form.category_id}
                onChange={(e) =>
                  setForm({ ...form, category_id: e.target.value })
                }
                className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm"
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
              <label className="text-xs text-slate-400 block mb-1">
                Pagado por
              </label>
              <select
                value={form.paid_by}
                onChange={(e) => setForm({ ...form, paid_by: e.target.value })}
                className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {nameOf(m.id)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-white/5 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setForm({ ...form, scope: "shared" })}
              className={`rounded-lg py-2 text-sm font-medium transition ${
                form.scope === "shared"
                  ? "bg-white/15 text-white"
                  : "text-slate-400"
              }`}
            >
              Compartido
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, scope: "personal" })}
              className={`rounded-lg py-2 text-sm font-medium transition ${
                form.scope === "personal"
                  ? "bg-white/15 text-white"
                  : "text-slate-400"
              }`}
            >
              Personal
            </button>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Nota (ej: Netflix, alquiler)
            </label>
            <input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-sm text-slate-400 px-4 py-2 rounded-xl hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-white hover:bg-slate-200 text-slate-900 text-sm font-semibold rounded-full px-5 py-2 transition disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-[#151923] rounded-3xl border border-white/5 divide-y divide-white/5">
        {items.length === 0 ? (
          <p className="text-sm text-slate-400 py-10 text-center">
            Sin gastos recurrentes. Agrega el alquiler o tus suscripciones.
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
                <CategoryIcon icon={cat?.icon ?? "🔁"} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {r.note || cat?.name || "Recurrente"}
                  </p>
                  <p className="text-xs text-slate-400">
                    Día {r.day_of_month} de cada mes · {nameOf(r.paid_by)} ·{" "}
                    {r.scope === "shared" ? "Compartido" : "Personal"}
                  </p>
                </div>
                <span className="text-sm font-semibold whitespace-nowrap">
                  {fmtMoney(Number(r.amount), household.currency)}
                </span>
                <button
                  onClick={() => toggle(r)}
                  className={`text-xs font-medium rounded-lg px-2 py-1 ${
                    r.active
                      ? "bg-emerald-400/15 text-emerald-300"
                      : "bg-white/10 text-slate-400"
                  }`}
                >
                  {r.active ? "Activo" : "Pausado"}
                </button>
                <button
                  onClick={() => remove(r.id)}
                  className="text-slate-300 hover:text-red-400 px-1"
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
