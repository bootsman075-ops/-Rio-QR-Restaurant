import Link from "next/link";

import type { DashboardArea } from "@/components/dashboard/areas";
import { requirePermissionContext } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { todayInZone } from "@/lib/reservations";
import styles from "./summary.module.css";

type TableStat = {
  table_id: string; number: number; label: string | null;
  count: number; total_cents: number; last_at: string;
};
type TopItem = { name: string; quantity: number; total_cents: number };
type Report = {
  count: number;
  order_value_cents: number;
  paid_value_cents: number;
  tables_with_orders: number;
  pending_count: number;
  ready_count: number;
  average_cents: number;
  by_table: TableStat[];
  top_items: TopItem[];
};
const euro = (cents: number) => new Intl.NumberFormat("nl-NL", {
  style: "currency", currency: "EUR",
}).format(cents / 100);

function isReport(value: unknown): value is Report {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const data = value as Partial<Report>;
  return typeof data.count === "number"
    && typeof data.order_value_cents === "number"
    && typeof data.paid_value_cents === "number"
    && typeof data.average_cents === "number"
    && Array.isArray(data.by_table) && Array.isArray(data.top_items);
}

export default async function QrDashboardSummary({ area }: {
  area: DashboardArea;
}) {
  const context = await requirePermissionContext("requests.handle");
  if (!context.restaurantId) return null;
  const supabase = await createClient();
  const { data: restaurant } = await supabase.from("restaurants")
    .select("timezone").eq("id", context.restaurantId).maybeSingle();
  const today = todayInZone(restaurant?.timezone ?? "Europe/Amsterdam");
  const { data, error } = await supabase.rpc("qr_order_report", {
    p_restaurant_id: context.restaurantId,
    p_day: today,
  });
  if (error || !isReport(data)) return <div role="status" className={styles.disabled}>
    QR-bestellingen zijn nog niet geactiveerd. Het dashboard toont daarom geen verzonnen bestel- of omzetcijfers.
  </div>;
  const href = area === "management" ? "/management/qr-bestellingen" : "/staff/qr-bestellingen";
  return <section aria-label="Live QR-bestellingen" className={styles.section}>
    <div className={styles.sectionTop}>
      <div><p className={styles.overline}>Vandaag · Live vanuit QR-tafels</p>
        <h2>QR-bestellingen</h2></div>
      <Link href={href} className={styles.link}>Bekijk alle bestellingen</Link>
    </div>
    <div className={styles.kpis}>
      <div className={styles.kpi}><span>Bestellingen</span><strong>{data.count}</strong></div>
      <div className={styles.kpi}><span>Tafels met bestellingen</span><strong>{data.tables_with_orders}</strong></div>
      <div className={styles.kpi}><span>Nieuwe bestellingen</span><strong>{data.pending_count}</strong></div>
      <div className={styles.kpi}><span>Gereed voor bediening</span><strong>{data.ready_count}</strong></div>
      {area === "management" && <>
        <div className={styles.kpi}><span>Waarde QR-bestellingen</span><strong>{euro(data.order_value_cents)}</strong></div>
        <div className={styles.kpi}><span>Als betaald gemarkeerd</span><strong>{euro(data.paid_value_cents)}</strong></div>
        <div className={styles.kpi}><span>Gem. bestelwaarde</span><strong>{euro(data.average_cents)}</strong></div>
      </>}
    </div>
    <div className={styles.columns}>
      <div className={styles.panel}>
        <h3>Bestellingen per tafel</h3>
        {data.by_table.length === 0 ? <p>Er zijn vandaag nog geen bestellingen.</p> :
          <ul>{data.by_table.map((row) => <li key={row.table_id}>
            <strong>{row.label || "Tafel " + row.number}</strong>
            <span>{row.count} bestellingen</span>
            {area === "management" && <b>{euro(row.total_cents)}</b>}
          </li>)}</ul>}
      </div>
      {area === "management" && <div className={styles.panel}>
        <h3>Populaire gerechten</h3>
        {data.top_items.length === 0 ? <p>Er zijn nog geen bestelgegevens.</p> :
          <ul>{data.top_items.map((row) => <li key={row.name}>
            <strong>{row.name}</strong><span>{row.quantity} verkocht</span>
            <b>{euro(row.total_cents)}</b>
          </li>)}</ul>}
      </div>}
    </div>
    {area === "management" && <p className={styles.disclaimer}>
      Betaald = handmatig gemarkeerd door management; er is nog geen kassakoppeling of automatische afschrijving.
    </p>}
  </section>;
}
