import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fliapp — Gastos en pareja, cuentas claras",
  description:
    "La app gratuita para llevar los gastos de casa en pareja: quién pagó qué, presupuestos con avisos, pagos recurrentes y el saldo entre los dos siempre claro. Sin hojas de cálculo y sin discusiones.",
  openGraph: {
    title: "Fliapp — Gastos en pareja, cuentas claras",
    description:
      "Gastos compartidos, presupuestos y quién le debe a quién — automático y gratis.",
    url: "https://fliapp.vercel.app",
    siteName: "Fliapp",
    locale: "es_ES",
    type: "website",
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
