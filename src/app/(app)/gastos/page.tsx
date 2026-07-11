"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useApp } from "@/components/AppProvider";
import {
  currentMonth,
  fmtDate,
  fmtMoney,
  firstName,
  monthLabel,
  shiftMonth,
  monthRange,
} from "@/lib/format";
import type { Expense, Scope } from "@/lib/types";

type FormState = {
  id: string | null;
  amount: string;
  category_id: string;
  date: string;
  scope: Scope;
  paid_by: string;
  note: string;
};

const today = () => new Date().toISOString().slice(0, 10);

export default function GastosPage() {
  const { household, members, userId, categories } = useApp();
  const [month, setMonth] = useState(currentMonth());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const emptyForm = useCallback(
    (): FormState => ({
      id: null,
      amount: "",
      category_id: categories[0]?.id ?? "",
      date: today(),
      scope: "shared",
      paid_by: userId,
      note: "",
    }),
    [categories, userId]
  );
  const [form, setForm] = useState<FormState>(emptyForm());

  const load = useCallback(async () => {
    const { start, end } = monthRange(month);
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .eq("household_id", household.id)
      .gte("date", start)
      .lt("date", end)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    setExpenses((data ?? []) as Expense[]);
  }, [month, household.id]);

  useEffect(() => {
    load();
  }, [load]);

  function startNew() {
    setForm(emptyForm());
    setShowForm(true);
  }

  function startEdit(e: Expense) {
    setForm({
      id: e.id,
      amount: String(e.amount),
      category_id: e.category_id ?? "",
      date: e.date,
      scope: e.scope,
      paid_by: e.paid_by,
      note: e.note ?? "",
    });
    setShowForm(true);
  }

  async function save(ev: React.FormEvent) {
    ev.preventDefault();
    const amount = parseFloat(form.amount.replace(",", "."));
    if (!amount || amount <= 0) return;
    setSaving(true);
    const payload = {
      household_id: household.id,
      amount,
      category_id: form.category_id || null,
      date: form.date,
      scope: form.scope,
      paid_by: form.paid_by,
      note: form.note.trim() || null,
    };
    if (form.id) {
      await supabase.from("expenses").update(payload).eq("id", form.id);
    } else {
      await supabase.from("expenses").insert(payload);
    }
    setSaving(false);
    setShowForm(false);
    setForm(emptyForm());
    // si el gasto es de otro mes, salta a ese mes para verlo
    const expMonth = form.date.slice(0, 7);
    if (expMonth !== month) setMonth(expMonth);
    else load();
  }

  async function remove(id: string) {
    if (!window.confirm("¿Eliminar este gasto?")) return;
    await supabase.from("expenses").delete().eq("id", id);
    load();
  }

  const nameOf = (id: string) => {
    const m = members.find((x) => x.id === id);
    if (!m) return "";
    return m.id === userId ? "Tú" : firstName(m.full_name, m.email);
  };

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">Gastos</h1>
        <div className="flex items-center gap-1 bg-[#151923] border border-white/5 rounded-xl px-1 py-1">
          <button
            onClick={() => setMonth(shiftMonth(month, -1))}
            className="px-2.5 py-1 rounded-lg hover:bg-white/10 text-slate-400"
          >
            ‹
          </button>
          <span className="text-sm font-medium px-1 min-w-32 text-center">
            {monthLabel(month)}
          </span>
          <button
            onClick={() => setMonth(shiftMonth(month, 1))}
            className="px-2.5 py-1 rounded-lg hover:bg-white/10 text-slate-400"
          >
            ›
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Total: <b className="text-white">{fmtMoney(total, household.currency)}</b>
        </p>
        <button
          onClick={startNew}
          className="bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium rounded-xl px-4 py-2 transition"
        >
          + Nuevo gasto
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={save}
          className="bg-[#151923] rounded-2xl border border-indigo-400/30 p-5 space-y-4"
        >
          <h2 className="font-semibold text-sm">
            {form.id ? "Editar gasto" : "Nuevo gasto"}
          </h2>

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
              <label className="text-xs text-slate-400 block mb-1">Fecha</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
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

          <div>
            <label className="text-xs text-slate-400 block mb-1">Tipo</label>
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
                💑 Compartido
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
                👤 Personal
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Los gastos compartidos se dividen entre ambos y cuentan para el
              saldo de pareja.
            </p>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Nota (opcional)
            </label>
            <input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="ej: compra semanal"
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
              className="bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium rounded-xl px-5 py-2 transition disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-[#151923] rounded-2xl border border-white/5 divide-y divide-white/5">
        {expenses.length === 0 ? (
          <p className="text-sm text-slate-400 py-10 text-center">
            Sin gastos en {monthLabel(month).toLowerCase()}.
          </p>
        ) : (
          expenses.map((e) => {
            const cat = categories.find((c) => c.id === e.category_id);
            return (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xl">{cat?.icon ?? "🧾"}</span>
                <button
                  onClick={() => startEdit(e)}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="text-sm font-medium truncate">
                    {e.note || cat?.name || "Gasto"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {fmtDate(e.date)} · {nameOf(e.paid_by)} ·{" "}
                    {e.scope === "shared" ? "💑 Compartido" : "👤 Personal"}
                  </p>
                </button>
                <span className="text-sm font-semibold whitespace-nowrap">
                  {fmtMoney(Number(e.amount), household.currency)}
                </span>
                <button
                  onClick={() => remove(e.id)}
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
