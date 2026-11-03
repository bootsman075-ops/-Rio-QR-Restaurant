import Link from "next/link";
import { redirect } from "next/navigation";

import DashboardNav from "@/components/dashboard/DashboardNav";
import LiveRefresh from "@/components/dashboard/LiveRefresh";
import RioDashboardBrand from "@/components/dashboard/RioDashboardBrand";
import RevenueChart from "@/components/dashboard/management/RevenueChart";
import type { RevenueBucket, RevenueReport } from "@/components/dashboard/management/RevenueChart";
import QrDashboardSummary from "@/components/dashboard/orders/QrDashboardSummary";
import { requirePermissionContext } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import styles from "./statistics.module.css";

export const dynamic = "force-dynamic";

function isBucket(v: unknown): v is RevenueBucket {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const x = v as Partial<RevenueBucket>;
  return typeof x.label === "string" && typeof x.period === "string"
    && Number.isFinite(x.ordered_cents) && Number.isFinite(x.paid_cents)
    && typeof x.orders === "number";
}

function isReport(value: unknown): value is RevenueReport {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const r = value as Partial<RevenueReport>;
  return Array.isArray(r.day) && r.day.length === 14 && r.day.every(isBucket)
    && Array.isArray(r.month) && r.month.length === 12 && r.month.every(isBucket)
    && Array.isArray(r.year) && r.year.length === 5 && r.year.every(isBucket);
}

const euros = (cents: number) => new Intl.NumberFormat("nl-NL", {
  currency: "EUR", style: "currency",
}).format(cents/100);

export default async function ManagementStatistics() {
  const context = await requirePermissionContext("management.access");
  if (context.restaurantSlug !== "rio-deventer" || !context.restaurantId) {
    redirect("/management");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("qr_management_analytics", {
    p_restaurant_id: context.restaurantId,
  });
  const report = !error && isReport(data) ? data : null;
  const currentMonth = report?.month.at(-1);
  const currentYear = report?.year.at(-1);
  return <main className={"staff-page rio-management " + styles.page}>
    <div className={"wrap " + styles.container}>
      <RioDashboardBrand area="management" />
      <DashboardNav area="management" current="stats" />
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>RIO · Management</p>
          <h1>Statistieken & omzet</h1>
          <p>QR-bestellingen, dag-, maand- en jaarontwikkelingen en inzichten per tafel.</p>
        </div>
        <Link href="/management" className={styles.back}>Terug naar werktafel</Link>
      </header>
      {report ? <>
        <section className={styles.metrics} aria-label="Financiële kerncijfers">
          <div><span>Deze maand · bestelwaarde</span><strong>{euros(currentMonth!.ordered_cents)}</strong></div>
          <div><span>Deze maand · als betaald geregistreerd</span><strong>{euros(currentMonth!.paid_cents)}</strong></div>
          <div><span>Dit jaar · bestelwaarde</span><strong>{euros(currentYear!.ordered_cents)}</strong></div>
          <div><span>Dit jaar · als betaald geregistreerd</span><strong>{euros(currentYear!.paid_cents)}</strong></div>
        </section>
        <RevenueChart report={report} />
        <QrDashboardSummary area="management" />
      </> : <p role="alert" className={styles.warning}>
        Statistieken konden niet geladen worden. Er worden geen geschatte omzetbedragen getoond.
      </p>}
      <p className={styles.disclaimer}>
        Bestelwaarde is gebaseerd op QR-bestellingen en sluit annuleringen uit.
        Als betaald geregistreerd is een handmatige managementmarkering, geen kassatransactie.
      </p>
    </div>
    <LiveRefresh />
  </main>;
}
