"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { supabase } from "@/lib/supabase/client";
import { useApp } from "@/components/AppProvider";
import { computeBalance } from "@/lib/balance";
import { chartColor } from "@/lib/colors";
import { CategoryIcon } from "@/lib/icons";
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

const CARD = "#151923";

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
  const ahorro = totalIngresos - totalGastos;

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
          name: cat ? cat.name : "Sin categoría",
          value: Math.round(value * 100) / 100,
          color: chartColor(cat?.color),
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
            label: cat ? cat.name : "Sin categoría",
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
    <div className="space-y-5">
      {/* Hero: gasto del mes */}
      <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-800 p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between relative">
          <p className="text-sm font-medium text-white/70">Gastado en</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMonth(shiftMonth(month, -1))}
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition"
              aria-label="Mes anterior"
            >
              ‹
            </button>
            <span className="text-sm font-semibold text-white px-1 min-w-28 text-center">
              {monthLabel(month)}
            </span>
            <button
              onClick={() => setMonth(shiftMonth(month, 1))}
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition"
              aria-label="Mes siguiente"
            >
              ›
            </button>
          </div>
        </div>
        <p className="tnum display text-5xl md:text-6xl font-semibold text-white mt-4 relative">
          {loading ? "···" : fmtMoney(totalGastos, household.currency)}
        </p>
        <div className="flex gap-2 mt-5 relative">
          <span className="tnum text-xs font-medium text-white bg-white/15 rounded-full px-3 py-1.5">
            Ingresos{" "}
            {loading ? "…" : `+${fmtMoney(totalIngresos, household.currency)}`}
          </span>
          <span
            className={`tnum text-xs font-medium rounded-full px-3 py-1.5 ${
              ahorro >= 0
                ? "text-white bg-white/15"
                : "text-red-100 bg-red-500/40"
            }`}
          >
            Ahorro {loading ? "…" : fmtMoney(ahorro, household.currency)}
          </span>
        </div>
      </div>

      {/* Cuentas en pareja */}
      <div
        className="rounded-3xl border border-white/5 p-6"
        style={{ background: CARD }}
      >
        <h2 className="font-semibold text-sm text-slate-200 mb-2">
          Cuentas en pareja
        </h2>
        {members.length < 2 ? (
          <p className="text-sm text-slate-400">
            Todavía estás solo/a en el hogar. Invita a tu pareja desde{" "}
            <Link
              href="/ajustes"
              className="text-indigo-300 font-medium underline"
            >
              Ajustes
            </Link>
            .
          </p>
        ) : balance ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-300">
              <b className="text-white">{nameOf(balance.debtor.id)}</b> le debe{" "}
              <b className="tnum text-emerald-400">
                {fmtMoney(balance.amount, household.currency)}
              </b>{" "}
              a <b className="text-white">{nameOf(balance.creditor.id)}</b>
            </p>
            <button
              onClick={settleUp}
              className="bg-white hover:bg-slate-200 text-slate-900 text-sm font-semibold rounded-full px-4 py-2 transition"
            >
              Saldar cuentas
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Están a mano.</p>
        )}
      </div>

      {/* Gráfico por categoría */}
      <div
        className="rounded-3xl border border-white/5 p-6"
        style={{ background: CARD }}
      >
        <h2 className="font-semibold text-sm text-slate-200 mb-3">
          Gastos por categoría
        </h2>
        {pieData.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">
            Sin gastos este mes.
          </p>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="w-52 h-52 shrink-0 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={62}
                    outerRadius={90}
                    paddingAngle={2}
                    stroke={CARD}
                    strokeWidth={2}
                  >
                    {pieData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => fmtMoney(Number(v), household.currency)}
                    contentStyle={{
                      background: "#0E1118",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 12,
                      color: "#F1F5F9",
                    }}
                    itemStyle={{ color: "#F1F5F9" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[11px] text-slate-500">Total</span>
                <span className="tnum display text-xl font-semibold text-white">
                  {fmtMoney(totalGastos, household.currency)}
                </span>
              </div>
            </div>
            <ul className="flex-1 w-full space-y-2">
              {pieData.map((d) => (
                <li
                  key={d.name}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="flex items-center gap-2 text-slate-300">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ background: d.color }}
                    />
                    {d.name}
                  </span>
                  <span className="tnum font-medium text-white">
                    {fmtMoney(d.value, household.currency)}
                    <span className="tnum text-slate-500 text-xs ml-2">
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
        <div
          className="rounded-3xl border border-white/5 p-6"
          style={{ background: CARD }}
        >
          <h2 className="font-semibold text-sm text-slate-200 mb-3">
            Presupuestos del mes
          </h2>
          <div className="space-y-3">
            {budgetRows.map((b) => (
              <div key={b.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300">{b.label}</span>
                  <span
                    className={`tnum ${
                      b.spent > b.limit
                        ? "text-red-400 font-semibold"
                        : b.pct >= 80
                          ? "text-amber-400 font-medium"
                          : "text-slate-400"
                    }`}
                  >
                    {fmtMoney(b.spent, household.currency)} /{" "}
                    {fmtMoney(b.limit, household.currency)}
                    
                  </span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      b.spent > b.limit
                        ? "bg-red-500"
                        : b.pct >= 80
                          ? "bg-amber-400"
                          : "bg-emerald-400"
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
      <div
        className="rounded-3xl border border-white/5 p-6"
        style={{ background: CARD }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm text-slate-200">
            Últimos movimientos
          </h2>
          <Link
            href="/gastos"
            className="text-xs text-indigo-300 font-medium hover:underline"
          >
            Ver todos →
          </Link>
        </div>
        {expenses.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">
            Sin movimientos todavía.
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {expenses.slice(0, 5).map((e) => {
              const cat = categories.find((c) => c.id === e.category_id);
              return (
                <li key={e.id} className="flex items-center gap-3 py-2.5">
                  <CategoryIcon icon={cat?.icon} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {e.note || cat?.name || "Gasto"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {fmtDate(e.date)} · {nameOf(e.paid_by)} ·{" "}
                      {e.scope === "shared" ? "Compartido" : "Personal"}
                    </p>
                  </div>
                  <span className="tnum text-sm font-semibold text-white">
                    -{fmtMoney(Number(e.amount), household.currency)}
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
