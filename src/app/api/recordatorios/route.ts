import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RecurringRow = {
  id: string;
  household_id: string;
  amount: number;
  note: string | null;
  day_of_month: number;
  category: { name: string; icon: string } | null;
  household: { id: string; name: string; currency: string } | null;
};

function fmtMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("es", { style: "currency", currency }).format(
    amount
  );
}

function buildEmail(
  firstName: string,
  items: RecurringRow[],
  currency: string
) {
  const total = items.reduce((s, r) => s + Number(r.amount), 0);
  const rows = items
    .map(
      (r) => `
      <tr>
        <td style="padding: 8px 0; color: #1e293b; font-size: 15px;">
          ${r.note || r.category?.name || "Pago recurrente"}
        </td>
        <td style="padding: 8px 0; color: #1e293b; font-size: 15px; text-align: right; font-weight: bold;">
          ${fmtMoney(Number(r.amount), currency)}
        </td>
      </tr>`
    )
    .join("");

  return `
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1e293b;">
    <h1 style="font-size: 20px; margin: 0 0 8px;">Mañana ${items.length === 1 ? "tenéis un pago" : `tenéis ${items.length} pagos`} 🔔</h1>
    <p style="font-size: 15px; line-height: 1.6; color: #475569;">
      Hola ${firstName}, recordatorio de Fliapp: ${items.length === 1 ? "este pago recurrente vence" : "estos pagos recurrentes vencen"} mañana.
    </p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
      ${rows}
    </table>
    <p style="font-size: 15px; color: #475569;">
      Total: <b>${fmtMoney(total, currency)}</b>
    </p>
    <p style="text-align: center; margin: 28px 0;">
      <a href="https://fliapp.vercel.app"
         style="background: #7C3AED; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 999px; font-weight: bold; font-size: 15px; display: inline-block;">
        Abrir Fliapp
      </a>
    </p>
    <p style="font-size: 12px; color: #94a3b8;">
      Recibes este aviso porque tenéis pagos recurrentes activos en Fliapp.
      Puedes pausarlos o eliminarlos desde la sección Recurrentes de la app.
    </p>
  </div>`;
}

export async function GET(request: Request) {
  // solo el cron de Vercel (o quien tenga el secreto) puede ejecutar esto
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.BREVO_API_KEY) {
    return NextResponse.json(
      { error: "Faltan variables de entorno (service role / Brevo)" },
      { status: 500 }
    );
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // pagos que vencen mañana
  const manana = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const diaManana = manana.getUTCDate();

  const { data: recurring, error } = await admin
    .from("recurring_expenses")
    .select(
      "id, household_id, amount, note, day_of_month, category:categories(name, icon), household:households(id, name, currency)"
    )
    .eq("active", true)
    .eq("day_of_month", diaManana);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (recurring ?? []) as unknown as RecurringRow[];
  if (rows.length === 0) {
    return NextResponse.json({ enviados: 0, motivo: "sin pagos mañana" });
  }

  // agrupa por hogar
  const porHogar = new Map<string, RecurringRow[]>();
  for (const r of rows) {
    porHogar.set(r.household_id, [...(porHogar.get(r.household_id) ?? []), r]);
  }

  // miembros de esos hogares
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email, full_name, household_id")
    .in("household_id", [...porHogar.keys()]);

  let enviados = 0;
  const fallos: string[] = [];

  for (const p of profiles ?? []) {
    if (!p.email || !p.household_id) continue;
    const items = porHogar.get(p.household_id);
    if (!items || items.length === 0) continue;

    const currency = items[0].household?.currency ?? "EUR";
    const firstName = (p.full_name ?? "").trim().split(" ")[0] || "hola";

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "Fliapp",
          email: process.env.BREVO_SENDER_EMAIL,
        },
        to: [{ email: p.email, name: p.full_name ?? p.email }],
        subject:
          items.length === 1
            ? `🔔 Mañana: ${items[0].note || items[0].category?.name || "pago recurrente"} (${fmtMoney(Number(items[0].amount), currency)})`
            : `🔔 Mañana tenéis ${items.length} pagos recurrentes`,
        htmlContent: buildEmail(firstName, items, currency),
      }),
    });

    if (res.ok) enviados++;
    else fallos.push(`${p.email}: ${res.status} ${await res.text()}`);
  }

  return NextResponse.json({
    enviados,
    hogares: porHogar.size,
    fallos: fallos.length > 0 ? fallos : undefined,
  });
}
