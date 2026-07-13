"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Repeat } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useApp } from "@/components/AppProvider";
import { CategoryIcon } from "@/lib/icons";
import {
  currentMonth,
  fmtMoney,
  fmtMoneyShort,
  firstName,
  monthLabel,
  monthRange,
  shiftMonth,
} from "@/lib/format";
import type { Expense, RecurringExpense } from "@/lib/types";

const CARD = "#151923";
const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

export default function CalendarioPage() {
  const { household, members, userId, categories } = useApp();
  const [month, setMonth] = useState(currentMonth());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [recurring, setRecurring] = useState<RecurringExpense[]>([]);
  const now = new Date();
  const isCurrentMonth = month === currentMonth();
  const [selected, setSelected] = useState<number | null>(
    isCurrentMonth ? now.getDate() : null
  );

  const load = useCallback(async () => {
    const { start, end } = monthRange(month);
    const [expRes, recRes] = await Promise.all([
      supabase
        .from("expenses")
        .select("*")
        .eq("household_id", household.id)
        .gte("date", start)
        .lt("date", end)
        .order("created_at", { ascending: false }),
      supabase
        .from("recurring_expenses")
        .select("*")
        .eq("household_id", household.id)
        .eq("active", true),
    ]);
    setExpenses((expRes.data ?? []) as Expense[]);
    setRecurring((recRes.data ?? []) as RecurringExpense[]);
  }, [month, household.id]);

  useEffect(() => {
    load();
    setSelected(month === currentMonth() ? new Date().getDate() : null);
  }, [load, month]);

  const [year, monthNum] = month.split("-").map(Number);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  // lunes = 0 ... domingo = 6
  const firstOffset = (new Date(year, monthNum - 1, 1).getDay() + 6) % 7;

  const byDay = useMemo(() => {
    const map = new Map<number, Expense[]>();
    for (const e of expenses) {
      const d = Number(e.date.slice(8, 10));
      map.set(d, [...(map.get(d) ?? []), e]);
    }
    return map;
  }, [expenses]);

  const totalOf = useCallback(
    (day: number) =>
      (byDay.get(day) ?? []).reduce((s, e) => s + Number(e.amount), 0),
    [byDay]
  );

  const maxDayTotal = useMemo(() => {
    let max = 0;
    for (let d = 1; d <= daysInMonth; d++) max = Math.max(max, totalOf(d));
    return max;
  }, [daysInMonth, totalOf]);

  const recurringDays = useMemo(
    () => new Set(recurring.map((r) => r.day_of_month)),
    [recurring]
  );

  const totalMes = useMemo(
    () => expenses.reduce((s, e) => s + Number(e.amount), 0),
    [expenses]
  );

  const nameOf = (id: string) => {
    const m = members.find((x) => x.id === id);
    if (!m) return "";
    return m.id === userId ? "Tú" : firstName(m.full_name, m.email);
  };

  const selectedExpenses = selected ? (byDay.get(selected) ?? []) : [];
  const selectedRecurring = selected
    ? recurring.filter((r) => r.day_of_month === selected)
    : [];
  const selectedLabel = selected
    ? new Date(year, monthNum - 1, selected).toLocaleDateString("es", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">Calendario</h1>
        <div className="flex items-center gap-1 bg-[#151923] border border-white/5 rounded-xl px-1 py-1">
          <button
            onClick={() => setMonth(shiftMonth(month, -1))}
            className="px-2.5 py-1 rounded-lg hover:bg-white/10 text-slate-400"
            aria-label="Mes anterior"
          >
            ‹
          </button>
          <span className="text-sm font-medium px-1 min-w-32 text-center">
            {monthLabel(month)}
          </span>
          <button
            onClick={() => setMonth(shiftMonth(month, 1))}
            className="px-2.5 py-1 rounded-lg hover:bg-white/10 text-slate-400"
            aria-label="Mes siguiente"
          >
            ›
          </button>
        </div>
      </div>

      <p className="text-sm text-slate-400">
        Total del mes:{" "}
        <b className="tnum text-white">{fmtMoney(totalMes, household.currency)}</b>
        {recurring.length > 0 && (
          <span className="ml-3 inline-flex items-center gap-1.5 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
            día con pago recurrente
          </span>
        )}
      </p>

      {/* Cuadrícula del mes */}
      <div
        className="rise rounded-3xl border border-white/5 p-3 md:p-4"
        style={{ background: CARD }}
      >
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="text-center text-[10px] font-medium text-slate-500 py-1"
            >
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstOffset }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const total = totalOf(day);
            const isToday = isCurrentMonth && day === now.getDate();
            const isSelected = selected === day;
            const heat =
              total > 0 && maxDayTotal > 0
                ? 0.1 + 0.38 * (total / maxDayTotal)
                : 0;
            return (
              <button
                key={day}
                onClick={() => setSelected(day)}
                className={`relative min-h-14 md:min-h-16 rounded-xl p-1.5 flex flex-col items-start justify-between text-left transition ${
                  isSelected
                    ? "ring-2 ring-violet-400"
                    : isToday
                      ? "ring-1 ring-white/30"
                      : ""
                } ${total === 0 ? "hover:bg-white/5" : ""}`}
                style={
                  heat > 0
                    ? { background: `rgba(124, 58, 237, ${heat})` }
                    : undefined
                }
              >
                <span
                  className={`text-[11px] leading-none ${
                    isToday ? "font-bold text-white" : "text-slate-400"
                  }`}
                >
                  {day}
                </span>
                {recurringDays.has(day) && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-violet-300" />
                )}
                {total > 0 && (
                  <span className="tnum text-[10px] md:text-xs font-semibold text-white leading-none">
                    {fmtMoneyShort(total, household.currency)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detalle del día seleccionado */}
      <div
        className="rise rise-1 rounded-3xl border border-white/5 p-6"
        style={{ background: CARD }}
      >
        {!selected ? (
          <p className="text-sm text-slate-500 text-center py-2">
            Toca un día para ver el detalle.
          </p>
        ) : (
          <>
            <h2 className="font-semibold text-sm text-slate-200 mb-3 capitalize">
              {selectedLabel}
            </h2>
            {selectedExpenses.length === 0 &&
            selectedRecurring.length === 0 ? (
              <p className="text-sm text-slate-500 py-2">
                Sin movimientos este día.
              </p>
            ) : (
              <ul className="divide-y divide-white/5">
                {selectedExpenses.map((e) => {
                  const cat = categories.find((c) => c.id === e.category_id);
                  return (
                    <li key={e.id} className="flex items-center gap-3 py-2.5">
                      <CategoryIcon icon={cat?.icon} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {e.note || cat?.name || "Gasto"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {nameOf(e.paid_by)} ·{" "}
                          {e.scope === "shared" ? "Compartido" : "Personal"}
                        </p>
                      </div>
                      <span className="tnum text-sm font-semibold text-white">
                        -{fmtMoney(Number(e.amount), household.currency)}
                      </span>
                    </li>
                  );
                })}
                {selectedRecurring.map((r) => {
                  const cat = categories.find((c) => c.id === r.category_id);
                  return (
                    <li
                      key={`rec-${r.id}`}
                      className="flex items-center gap-3 py-2.5 opacity-80"
                    >
                      <span className="w-9 h-9 rounded-full bg-violet-500/15 text-violet-300 flex items-center justify-center shrink-0">
                        <Repeat size={15} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {r.note || cat?.name || "Recurrente"}
                        </p>
                        <p className="text-xs text-violet-300">
                          Pago recurrente · cada mes el día {r.day_of_month}
                        </p>
                      </div>
                      <span className="tnum text-sm font-semibold text-slate-300">
                        {fmtMoney(Number(r.amount), household.currency)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
