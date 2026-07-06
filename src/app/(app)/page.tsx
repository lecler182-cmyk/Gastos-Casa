"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { supabase } from "@/lib/supabase/client";
import { useApp } from "@/components/AppProvider";
import { computeBalance } from "@/lib/balance";
import {
  currentMonth,
  fmtDate,
  fmtMoney,
  firstName,
  monthLabel,
  monthRange,
  shiftMonth,
} from "@/lib/format";
import type { Budget, Expense, Income, Settlement } from "@/lib/types";

export default function DashboardPage() {
  const { household, members, userId, categories } = useApp();
  const [month, setMonth] = useState(currentMonth());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [sharedAll, setSharedAll] = useState<
    { amount: number; paid_by: string }[]
  >([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    // genera los gastos recurrentes pendientes antes de leer
    await supabase.rpc("generate_recurring");

    const { start, end } = monthRange(month);
    const [expRes, incRes, budRes, sharedRes, setRes] = await Promise.all([
      supabase
        .from("expenses")
        .select("*")
        .eq("household_id", household.id)
        .gte("date", start)
        .lt("date", end)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("incomes")
        .select("*")
        .eq("household_id", household.id)
        .gte("date", start)
        .lt("date", end),
      supabase.from("budgets").select("*").eq("household_id", household.id),
      supabase
        .from("expenses")
        .select("amount, paid_by")
        .eq("household_id", household.id)
        .eq("scope", "shared"),
      supabase
        .from("settlements")
        .select("*")
        .eq("household_id", household.id),
    ]);

    setExpenses((expRes.data ?? []) as Expense[]);
    setIncomes((incRes.data ?? []) as Income[]);
    setBudgets((budRes.data ?? []) as Budget[]);
    setSharedAll(sharedRes.data ?? []);
    setSettlements((setRes.data ?? []) as Settlement[]);
    setLoading(false);
  }, [month, household.id]);

  useEffect(() => {
    load();
  }, [load]);

  const totalGastos = useMemo(
    () => expenses.reduce((s, e) => s + Number(e.amount), 0),
    [expenses]
  );
  const totalIngresos = useMemo(
    () => incomes.reduce((s, i) => s + Number(i.amount), 0),
    [incomes]
  );

  const pieData = useMemo(() => {
    const byCat = new Map<string, number>();
    for (const e of expenses) {
      const key = e.category_id ?? "none";
      byCat.set(key, (byCat.get(key) ?? 0) + Number(e.amount));
    }
    return [...byCat.entries()]
      .map(([catId, value]) => {
        const cat = categories.find((c) => c.id === catId);
        return {
          name: cat ? `${cat.icon} ${cat.name}` : "🧾 Sin categoría",
          value: Math.round(value * 100) / 100,
          color: cat?.color ?? "#94a3b8",
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [expenses, categories]);

  const balance = useMemo(
    () => computeBalance(household, members, sharedAll, settlements),
    [household, members, sharedAll, settlements]
  );

  const budgetRows = useMemo(
    () =>
      budgets
        .map((b) => {
          const cat = categories.find((c) => c.id === b.category_id);
          const spent = expenses
            .filter((e) => e.category_id === b.category_id)
            .reduce((s, e) => s + Number(e.amount), 0);
          return {
            id: b.id,
            label: cat ? `${cat.icon} ${cat.name}` : "Sin categoría",
            spent,
            limit: Number(b.monthly_limit),
            pct: Math.min(100, (spent / Number(b.monthly_limit)) * 100),
          };
        })
        .sort((a, b) => b.pct - a.pct),
    [budgets, categories, expenses]
  );

  async function settleUp() {
    if (!balance) return;
    const amount = Math.round(balance.amount * 100) / 100;
    const debtorName = firstName(balance.debtor.full_name, balance.debtor.email);
    const creditorName = firstName(
      balance.creditor.full_name,
      balance.creditor.email
    );
    if (
      !window.confirm(
        `¿Registrar que ${debtorName} le pagó ${fmtMoney(amount, household.currency)} a ${creditorName}? Esto deja las cuentas en cero.`
      )
    )
      return;
    await supabase.from("settlements").insert({
      household_id: household.id,
      from_user: balance.debtor.id,
      to_user: balance.creditor.id,
      amount,
      note: "Saldar cuentas",
    });
    load();
  }

  const nameOf = (id: string) => {
    const m = members.find((x) => x.id === id);
    if (!m) return "";
    return m.id === userId ? "Tú" : firstName(m.full_name, m.email);
  };

  return (
    <div className="space-y-6">
      {/* Selector de mes */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">Resumen</h1>
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-1 py-1">
          <button
            onClick={() => setMonth(shiftMonth(month, -1))}
            className="px-2.5 py-1 rounded-lg hover:bg-slate-100 text-slate-500"
            aria-label="Mes anterior"
          >
            ‹
          </button>
          <span className="text-sm font-medium px-1 min-w-32 text-center">
            {monthLabel(month)}
          </span>
          <button
            onClick={() => setMonth(shiftMonth(month, 1))}
            className="px-2.5 py-1 rounded-lg hover:bg-slate-100 text-slate-500"
            aria-label="Mes siguiente"
          >
            ›
          </button>
        </div>
      </div>

      {/* Tarjetas de totales */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Gastos</p>
          <p className="text-lg md:text-2xl font-bold text-red-600 mt-1">
            {loading ? "…" : fmtMoney(totalGastos, household.currency)}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Ingresos</p>
          <p className="text-lg md:text-2xl font-bold text-emerald-600 mt-1">
            {loading ? "…" : fmtMoney(totalIngresos, household.currency)}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Ahorro</p>
          <p
            className={`text-lg md:text-2xl font-bold mt-1 ${
              totalIngresos - totalGastos >= 0
                ? "text-slate-900"
                : "text-red-600"
            }`}
          >
            {loading
              ? "…"
              : fmtMoney(totalIngresos - totalGastos, household.currency)}
          </p>
        </div>
      </div>

      {/* Cuentas en pareja */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="font-semibold text-sm text-slate-700 mb-2">
          💑 Cuentas en pareja
        </h2>
        {members.length < 2 ? (
          <p className="text-sm text-slate-500">
            Todavía estás solo/a en el hogar. Invita a tu pareja desde{" "}
            <Link href="/ajustes" className="text-emerald-600 font-medium underline">
              Ajustes
            </Link>
            .
          </p>
        ) : balance ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              <b>{nameOf(balance.debtor.id)}</b> le debe{" "}
              <b className="text-emerald-700">
                {fmtMoney(balance.amount, household.currency)}
              </b>{" "}
              a <b>{nameOf(balance.creditor.id)}</b>
            </p>
            <button
              onClick={settleUp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl px-4 py-2 transition"
            >
              Saldar cuentas
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Están a mano 🎉</p>
        )}
      </div>

      {/* Gráfico por categoría */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="font-semibold text-sm text-slate-700 mb-3">
          📊 Gastos por categoría — {monthLabel(month)}
        </h2>
        {pieData.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">
            Sin gastos este mes. ¡Registra el primero desde 💸 Gastos!
          </p>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-48 h-48 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {pieData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) =>
                      fmtMoney(Number(v), household.currency)
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex-1 w-full space-y-1.5">
              {pieData.map((d) => (
                <li
                  key={d.name}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ background: d.color }}
                    />
                    {d.name}
                  </span>
                  <span className="font-medium">
                    {fmtMoney(d.value, household.currency)}
                    <span className="text-slate-400 text-xs ml-2">
                      {totalGastos > 0
                        ? `${Math.round((d.value / totalGastos) * 100)}%`
                        : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Presupuestos */}
      {budgetRows.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-sm text-slate-700 mb-3">
            🎯 Presupuestos del mes
          </h2>
          <div className="space-y-3">
            {budgetRows.map((b) => (
              <div key={b.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{b.label}</span>
                  <span
                    className={
                      b.spent > b.limit
                        ? "text-red-600 font-semibold"
                        : b.pct >= 80
                          ? "text-amber-600 font-medium"
                          : "text-slate-500"
                    }
                  >
                    {fmtMoney(b.spent, household.currency)} /{" "}
                    {fmtMoney(b.limit, household.currency)}
                    {b.spent > b.limit && " ⚠️"}
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      b.spent > b.limit
                        ? "bg-red-500"
                        : b.pct >= 80
                          ? "bg-amber-400"
                          : "bg-emerald-500"
                    }`}
                    style={{ width: `${b.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Últimos movimientos */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm text-slate-700">
            🕐 Últimos movimientos
          </h2>
          <Link
            href="/gastos"
            className="text-xs text-emerald-600 font-medium hover:underline"
          >
            Ver todos →
          </Link>
        </div>
        {expenses.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">
            Nada por aquí todavía.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {expenses.slice(0, 5).map((e) => {
              const cat = categories.find((c) => c.id === e.category_id);
              return (
                <li key={e.id} className="flex items-center gap-3 py-2.5">
                  <span className="text-xl">{cat?.icon ?? "🧾"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {e.note || cat?.name || "Gasto"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {fmtDate(e.date)} · {nameOf(e.paid_by)} ·{" "}
                      {e.scope === "shared" ? "Compartido" : "Personal"}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">
                    {fmtMoney(Number(e.amount), household.currency)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
