"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useApp } from "@/components/AppProvider";
import { CategoryIcon } from "@/lib/icons";
import { currentMonth, fmtMoney, monthLabel, monthRange } from "@/lib/format";
import type { Budget, Expense } from "@/lib/types";

export default function PresupuestosPage() {
  const { household, categories } = useApp();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { start, end } = monthRange(currentMonth());
    const [budRes, expRes] = await Promise.all([
      supabase.from("budgets").select("*").eq("household_id", household.id),
      supabase
        .from("expenses")
        .select("category_id, amount")
        .eq("household_id", household.id)
        .gte("date", start)
        .lt("date", end),
    ]);
    const buds = (budRes.data ?? []) as Budget[];
    setBudgets(buds);
    setExpenses((expRes.data ?? []) as Expense[]);
    setDrafts(
      Object.fromEntries(
        buds.map((b) => [b.category_id, String(b.monthly_limit)])
      )
    );
  }, [household.id]);

  useEffect(() => {
    load();
  }, [load]);

  function spentOf(categoryId: string) {
    return expenses
      .filter((e) => e.category_id === categoryId)
      .reduce((s, e) => s + Number(e.amount), 0);
  }

  async function save(categoryId: string) {
    const raw = drafts[categoryId]?.replace(",", ".") ?? "";
    const limit = parseFloat(raw);
    setSavingId(categoryId);
    if (!raw || !limit || limit <= 0) {
      // sin valor => quitar presupuesto
      await supabase
        .from("budgets")
        .delete()
        .eq("household_id", household.id)
        .eq("category_id", categoryId);
    } else {
      await supabase.from("budgets").upsert(
        {
          household_id: household.id,
          category_id: categoryId,
          monthly_limit: limit,
        },
        { onConflict: "household_id,category_id" }
      );
    }
    await load();
    setSavingId(null);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Presupuestos</h1>
        <p className="text-sm text-slate-400 mt-1">
          Define un límite mensual por categoría. Te avisamos cuando llegues al
          80% y cuando te pases. Deja el campo vacío y guarda para quitar un
          presupuesto.
        </p>
      </div>

      <div className="bg-[#151923] rounded-2xl border border-white/5 divide-y divide-white/5">
        {categories.map((c) => {
          const budget = budgets.find((b) => b.category_id === c.id);
          const spent = spentOf(c.id);
          const limit = budget ? Number(budget.monthly_limit) : null;
          const pct = limit ? Math.min(100, (spent / limit) * 100) : 0;
          return (
            <div key={c.id} className="p-4">
              <div className="flex items-center gap-3">
                <CategoryIcon icon={c.icon} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-slate-400">
                    Gastado en {monthLabel(currentMonth()).toLowerCase()}:{" "}
                    {fmtMoney(spent, household.currency)}
                  </p>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Sin límite"
                  value={drafts[c.id] ?? ""}
                  onChange={(e) =>
                    setDrafts({ ...drafts, [c.id]: e.target.value })
                  }
                  className="w-28 border border-white/10 rounded-xl px-3 py-2 text-sm text-right"
                />
                <button
                  onClick={() => save(c.id)}
                  disabled={savingId === c.id}
                  className="text-sm font-medium text-indigo-300 hover:text-indigo-200 px-2 disabled:opacity-50"
                >
                  {savingId === c.id ? "..." : "Guardar"}
                </button>
              </div>
              {limit && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span
                      className={
                        spent > limit
                          ? "text-red-400 font-semibold"
                          : pct >= 80
                            ? "text-amber-400 font-medium"
                            : "text-slate-400"
                      }
                    >
                      {spent > limit
                        ? `Superado por ${fmtMoney(spent - limit, household.currency)}`
                        : pct >= 80
                          ? `Ya usaste el ${Math.round(pct)}%`
                          : `${Math.round(pct)}% usado`}
                    </span>
                    <span className="text-slate-400">
                      {fmtMoney(limit, household.currency)}
                    </span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        spent > limit
                          ? "bg-red-500"
                          : pct >= 80
                            ? "bg-amber-400"
                            : "bg-emerald-400"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
