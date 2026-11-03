import Link from "next/link";

import DashboardNav from "@/components/dashboard/DashboardNav";
import RioDashboardBrand from "@/components/dashboard/RioDashboardBrand";
import LiveRefresh from "@/components/dashboard/LiveRefresh";
import type { DashboardArea } from "@/components/dashboard/areas";
import { requirePermissionContext } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { updateOrderAction } from "./actions";
import styles from "./orders.module.css";

const label: Record<string, string> = {
  pending: "Nieuw", accepted: "Geaccepteerd", preparing: "In bereiding",
  ready: "Klaar", served: "Geserveerd", cancelled: "Geannuleerd",
};
const next: Record<string, { code: string; title: string } | null> = {
  pending: { code: "accept", title: "Accepteren" },
  accepted: { code: "prepare", title: "Bereiden" },
  preparing: { code: "ready", title: "Markeren als klaar" },
  ready: { code: "serve", title: "Geserveerd" },
  served: null, cancelled: null,
};
const euros = (cents: number) => new Intl.NumberFormat("nl-NL", {
  style: "currency", currency: "EUR",
}).format(cents / 100);

export default async function OrdersView({ area, error }: {
  area: DashboardArea; error?: string;
}) {
  const context = await requirePermissionContext("requests.handle");
  const isRio = context.restaurantSlug === "rio-deventer";
  const supabase = await createClient();
  const restaurantId = context.restaurantId;
  const base = area === "staff" ? "/staff/qr-bestellingen" : "/management/qr-bestellingen";
  if (!restaurantId) {
    return <p>Geen restaurant geselecteerd.</p>;
  }
  const { data, error: ordersError } = await supabase
    .from("qr_orders")
    .select("id, table_id, total_cents, status, payment_status, created_at")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(100);
  const orders = data ?? [];
  const ids = orders.map((row) => row.id);
  const [tablesResult, itemsResult] = await Promise.all([
    supabase.from("tables").select("id, number, label")
      .eq("restaurant_id", restaurantId),
    ids.length > 0
      ? supabase.from("qr_order_items")
          .select("order_id, item_name, quantity, line_total_cents")
          .eq("restaurant_id", restaurantId).in("order_id", ids)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const tableMap = new Map((tablesResult.data ?? []).map((row) => [row.id, row]));
  const itemMap = new Map<string, Array<{
    item_name: string; quantity: number; line_total_cents: number;
  }>>();
  for (const item of itemsResult.data ?? []) {
    itemMap.set(item.order_id, [
      ...(itemMap.get(item.order_id) ?? []), item,
    ]);
  }
  const loadError = Boolean(ordersError || tablesResult.error || itemsResult.error);
  return <main className={"staff-page" + (isRio ? " rio-management" : "")}>
    <div className="wrap">
      {isRio && <RioDashboardBrand area={area} />}
      <DashboardNav area={area} current="orders" />
      <section className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Restaurant · Tafelservice</p>
          <h1 className={styles.heading}>QR-bestellingen</h1>
          <p className={styles.subline}>Bestellingen zijn direct gekoppeld aan hun QR-tafel.</p>
        </div>
        <Link className={styles.back} href={area === "staff" ? "/staff" : "/management"}>
          Naar dashboard
        </Link>
      </section>
      {error && <p role="alert" className={styles.warning}>Wijziging kon niet worden uitgevoerd. Vernieuw de pagina.</p>}
      {loadError ? <p role="alert" className={styles.warning}>
        Bestellingen konden niet geladen worden. Controleer of de bestelmodule is geactiveerd.
      </p> : orders.length === 0 ? <section className={styles.empty}>
        Er zijn nog geen QR-bestellingen geplaatst. Zodra een gast via de tafelcode bestelt, verschijnt de bestelling hier.
      </section> : <>
        <p className={styles.count}>Laatste {orders.length} bestellingen · nieuwste eerst</p>
        <section className={styles.list}>
          {orders.map((order) => {
            const table = tableMap.get(order.table_id);
            const items = itemMap.get(order.id) ?? [];
            return <article className={styles.order} key={order.id}>
              <div className={styles.orderHead}>
                <div>
                  <h2>{table?.label || (table ? "Tafel " + table.number : "Tafel")}</h2>
                  <p>{new Intl.DateTimeFormat("nl-NL", {
                    dateStyle: "short", timeStyle: "short", timeZone: "Europe/Amsterdam",
                  }).format(new Date(order.created_at))}</p>
                </div>
                <div className={styles.orderTotal}>
                  <strong>{euros(order.total_cents)}</strong>
                  <span>{label[order.status] ?? order.status}</span>
                  <small>{order.payment_status === "paid" ? "Gemarkeerd betaald" : "Nog niet betaald"}</small>
                </div>
              </div>
              <ul className={styles.items}>
                {items.map((item, index) => <li key={index}>
                  <span>{item.quantity} × {item.item_name}</span>
                  <strong>{euros(item.line_total_cents)}</strong>
                </li>)}
              </ul>
              <div className={styles.actions}>
                {next[order.status] && <form action={updateOrderAction}>
                  <input type="hidden" name="id" value={order.id} />
                  <input type="hidden" name="area" value={area} />
                  <input type="hidden" name="action" value={next[order.status]!.code} />
                  <button type="submit" className={styles.primary}>
                    {next[order.status]!.title}
                  </button>
                </form>}
                {order.status !== "cancelled" && order.status !== "served" &&
                  order.payment_status === "unpaid" && <form action={updateOrderAction}>
                    <input type="hidden" name="id" value={order.id} />
                    <input type="hidden" name="area" value={area} />
                    <input type="hidden" name="action" value="cancel" />
                    <button type="submit" className={styles.secondary}>Annuleren</button>
                  </form>}
                {area === "management" && order.status !== "cancelled" &&
                  <form action={updateOrderAction}>
                    <input type="hidden" name="id" value={order.id} />
                    <input type="hidden" name="area" value={area} />
                    <input type="hidden" name="action" value={order.payment_status === "paid"
                      ? "mark_unpaid" : "mark_paid"} />
                    <button type="submit" className={styles.secondary}>
                      {order.payment_status === "paid" ? "Betaalmarkering terugdraaien" : "Markeer als betaald"}
                    </button>
                  </form>}
              </div>
            </article>;
          })}
        </section>
      </>}
    </div>
    <LiveRefresh />
  </main>;
}
