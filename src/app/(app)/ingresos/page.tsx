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
  monthRange,
  shiftMonth,
} from "@/lib/format";
import type { Income } from "@/lib/types";

const today = () => new Date().toISOString().slice(0, 10);

export default function IngresosPage() {
  const { household, members, userId } = useApp();
  const [month, setMonth] = useState(currentMonth());
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    source: "",
    date: today(),
    user_id: userId,
  });

  const load = useCallback(async () => {
    const { start, end } = monthRange(month);
    const { data } = await supabase
      .from("incomes")
      .select("*")
      .eq("household_id", household.id)
      .gte("date", start)
      .lt("date", end)
      .order("date", { ascending: false });
    setIncomes((data ?? []) as Income[]);
  }, [month, household.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(ev: React.FormEvent) {
    ev.preventDefault();
    const amount = parseFloat(form.amount.replace(",", "."));
    if (!amount || amount <= 0) return;
    setSaving(true);
    await supabase.from("incomes").insert({
      household_id: household.id,
      user_id: form.user_id,
      amount,
      source: form.source.trim() || null,
      date: form.date,
    });
    setSaving(false);
    setShowForm(false);
    setForm({ amount: "", source: "", date: today(), user_id: userId });
    const incMonth = form.date.slice(0, 7);
    if (incMonth !== month) setMonth(incMonth);
    else load();
  }

  async function remove(id: string) {
    if (!window.confirm("¿Eliminar este ingreso?")) return;
    await supabase.from("incomes").delete().eq("id", id);
    load();
  }

  const nameOf = (id: string) => {
    const m = members.find((x) => x.id === id);
    if (!m) return "";
    return m.id === userId ? "Tú" : firstName(m.full_name, m.email);
  };

  const total = incomes.reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">Ingresos</h1>
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-1 py-1">
          <button
            onClick={() => setMonth(shiftMonth(month, -1))}
            className="px-2.5 py-1 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            ‹
          </button>
          <span className="text-sm font-medium px-1 min-w-32 text-center">
            {monthLabel(month)}
          </span>
          <button
            onClick={() => setMonth(shiftMonth(month, 1))}
            className="px-2.5 py-1 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            ›
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Total:{" "}
          <b className="text-emerald-700">
            {fmtMoney(total, household.currency)}
          </b>
        </p>
        <button
          onClick={() => setShowForm(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl px-4 py-2 transition"
        >
          + Nuevo ingreso
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={save}
          className="bg-white rounded-2xl border border-emerald-200 p-5 space-y-4"
        >
          <h2 className="font-semibold text-sm">Nuevo ingreso</h2>
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
              <label className="text-xs text-slate-500 block mb-1">Fecha</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">
                Fuente
              </label>
              <input
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                placeholder="ej: sueldo, freelance"
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">
                De quién
              </label>
              <select
                value={form.user_id}
                onChange={(e) => setForm({ ...form, user_id: e.target.value })}
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
        {incomes.length === 0 ? (
          <p className="text-sm text-slate-400 py-10 text-center">
            Sin ingresos en {monthLabel(month).toLowerCase()}.
          </p>
        ) : (
          incomes.map((i) => (
            <div key={i.id} className="flex items-center gap-3 px-4 py-3">
              <span className="text-xl">💵</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {i.source || "Ingreso"}
                </p>
                <p className="text-xs text-slate-400">
                  {fmtDate(i.date)} · {nameOf(i.user_id)}
                </p>
              </div>
              <span className="text-sm font-semibold text-emerald-700 whitespace-nowrap">
                +{fmtMoney(Number(i.amount), household.currency)}
              </span>
              <button
                onClick={() => remove(i.id)}
                className="text-slate-300 hover:text-red-500 px-1"
                aria-label="Eliminar"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
