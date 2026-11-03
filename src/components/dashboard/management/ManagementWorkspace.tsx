import Link from "next/link";

import { addDays, zonedToIso } from "@/lib/reservations";
import { createClient } from "@/lib/supabase/server";
import RevenueChart from "./RevenueChart";
import type { RevenueBucket, RevenueReport } from "./RevenueChart";
import styles from "./management-workspace.module.css";

type Overview = {
  pendingService: number;
  pendingBills: number;
  reservationsToday: number;
  guestsToday: number;
  newReservations: number;
  menuItems: number;
  unavailableItems: number;
  hiddenSections: number;
};

const euro = (amount: number) => new Intl.NumberFormat("nl-NL", {
  style: "currency", currency: "EUR",
}).format(amount / 100);

const orderStatus: Record<string,string> = {
  pending: "Nieuw", accepted: "Geaccepteerd", preparing: "In bereiding",
  ready: "Klaar voor bediening", served: "Geserveerd", cancelled: "Geannuleerd",
};

function isBucket(value: unknown): value is RevenueBucket {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const b = value as Partial<RevenueBucket>;
  return typeof b.period === "string" && typeof b.label === "string"
    && typeof b.orders === "number"
    && typeof b.ordered_cents === "number" && Number.isFinite(b.ordered_cents)
    && typeof b.paid_cents === "number" && Number.isFinite(b.paid_cents);
}
function isReport(value: unknown): value is RevenueReport {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const r = value as Partial<RevenueReport>;
  return Array.isArray(r.day) && r.day.length === 14 && r.day.every(isBucket)
    && Array.isArray(r.month) && r.month.length === 12 && r.month.every(isBucket)
    && Array.isArray(r.year) && r.year.length === 5 && r.year.every(isBucket);
}

export default async function ManagementWorkspace({
  restaurantId, today, timezone, overview,
}: {
  restaurantId: string;
  today: string;
  timezone: string;
  overview: Overview | null;
}) {
  const supabase = await createClient();
  const begin = zonedToIso(today, "00:00", timezone)!;
  const end = zonedToIso(addDays(today, 1), "00:00", timezone)!;

  const [revenueResult, ordersResult, tableResult, reservationResult] = await Promise.all([
    supabase.rpc("qr_management_analytics", { p_restaurant_id: restaurantId }),
    supabase.from("qr_orders")
      .select("id, table_id, status, payment_status, total_cents, created_at")
      .eq("restaurant_id", restaurantId).order("created_at", { ascending: false }).limit(8),
    supabase.from("tables").select("id, number, label")
      .eq("restaurant_id", restaurantId).eq("is_active", true),
    supabase.from("reservations")
      .select("id, guest_name, starts_at, party_size, status")
      .eq("restaurant_id", restaurantId)
      .gte("starts_at",begin).lt("starts_at",end)
      .neq("status","cancelled").neq("status","no_show")
      .order("starts_at",{ascending:true}).limit(8),
  ]);
  const report = !revenueResult.error && isReport(revenueResult.data) ? revenueResult.data : null;
  const day = report?.day.at(-1);
  const month = report?.month.at(-1);
  const year = report?.year.at(-1);
  const tableMap = new Map((tableResult.data ?? []).map((t) => [t.id, t]));
  const orders = ordersResult.error ? null : ordersResult.data;
  const reservations = reservationResult.error ? null : reservationResult.data;
  const clock = new Intl.DateTimeFormat("nl-NL", {
    hour: "2-digit", minute: "2-digit", timeZone: timezone,
  });
  const monthTitle = new Intl.DateTimeFormat("nl-NL", {
    month: "long", year: "numeric", timeZone: "UTC",
  }).format(new Date(today + "T12:00:00Z"));

  return <div className={styles.workspace}>
    <div className={styles.welcome}>
      <div>
        <p className={styles.eyebrow}>Management · Live werktafel</p>
        <h1>Goed overzicht. Betere beslissingen.</h1>
        <p>Alles wat vandaag aandacht vraagt, met actuele QR-resultaten en inzicht per maand en per jaar.</p>
      </div>
      <Link className={styles.welcomeAction} href="/management/qr-bestellingen">
        Bestellingen beheren
        <span aria-hidden="true">↗</span>
      </Link>
    </div>

    <section aria-label="Kerncijfers" className={styles.metrics}>
      {report ? <>
        <div className={styles.metricPrimary}>
          <span>QR betaald geregistreerd · vandaag</span>
          <strong>{euro(day!.paid_cents)}</strong>
          <small>Handmatig gemarkeerd, niet geverifieerd door een kassa</small>
        </div>
        <div className={styles.metric}>
          <span>Betaald · {monthTitle}</span>
          <strong>{euro(month!.paid_cents)}</strong>
          <small>Huidige maand tot nu toe</small>
        </div>
        <div className={styles.metric}>
          <span>Betaald · {today.slice(0, 4)}</span>
          <strong>{euro(year!.paid_cents)}</strong>
          <small>Huidig kalenderjaar tot nu toe</small>
        </div>
        <div className={styles.metric}>
          <span>QR-bestelwaarde · vandaag</span>
          <strong>{euro(day!.ordered_cents)}</strong>
          <small>{day!.orders} bestellingen · exclusief annuleringen</small>
        </div>
      </> : <div className={styles.error} role="alert">
        De QR-omzetcijfers kunnen niet worden geladen. Er worden geen geschatte bedragen getoond.
      </div>}
      <div className={styles.metric}>
        <span>Open tafelverzoeken</span>
        <strong>{overview ? overview.pendingService + overview.pendingBills : "—"}</strong>
        <small>Bediening en rekeningaanvragen</small>
      </div>
      <div className={styles.metric}>
        <span>Reserveringen vandaag</span>
        <strong>{overview?.reservationsToday ?? "—"}</strong>
        <small>{overview ? overview.guestsToday + " verwachte gasten" : "Cijfers niet beschikbaar"}</small>
      </div>
      <div className={styles.metric}>
        <span>Reserveringen te bevestigen</span>
        <strong>{overview?.newReservations ?? "—"}</strong>
        <small>Afhandeling in reserveringen</small>
      </div>
      <div className={styles.metric}>
        <span>Niet beschikbare gerechten</span>
        <strong>{overview?.unavailableItems ?? "—"}</strong>
        <small>{overview ? "van " + overview.menuItems + " menu-items" : "Menukaart niet beschikbaar"}</small>
      </div>
    </section>

    {report ? <>
      <RevenueChart report={report} />
      <div className={styles.statsLinkRow}>
        <Link href="/management/statistieken">
          Open alle statistieken, populaire gerechten en tafelinzichten
        </Link>
      </div>
    </> : null}

    <section className={styles.workSection} aria-labelledby="worktitle">
      <div className={styles.sectionHeader}>
        <div><p className={styles.eyebrow}>Operationeel</p><h2 id="worktitle">De werktafel</h2></div>
        <span className={styles.smallNote}>Realtime gegevens · vernieuwt automatisch</span>
      </div>
      <div className={styles.workColumns}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div><h3>Recente QR-bestellingen</h3><p>Tafel, status en bedrag</p></div>
            <Link href="/management/qr-bestellingen">Alle bestellingen</Link>
          </div>
          {orders === null ? <p className={styles.empty}>De bestellingen konden niet worden geladen.</p> :
            orders.length === 0 ? <p className={styles.empty}>Nog geen QR-bestellingen.</p> :
            <div className={styles.workRows}>
              {orders.map((o) => {
                const table = tableMap.get(o.table_id);
                return <div className={styles.workRow} key={o.id}>
                  <div>
                    <strong>{table?.label || (table ? "Tafel " + table.number : "Tafel")}</strong>
                    <small>{clock.format(new Date(o.created_at))} · {orderStatus[o.status] ?? o.status}</small>
                  </div>
                  <div className={styles.workRight}>
                    <strong>{euro(o.total_cents)}</strong>
                    <small>{o.payment_status === "paid" ? "Als betaald gemarkeerd" : "Nog niet betaald"}</small>
                  </div>
                </div>;
              })}
            </div>}
        </section>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div><h3>Reserveringen vandaag</h3><p>Gasten en aankomsttijden</p></div>
            <Link href="/management/reserveringen">Alle reserveringen</Link>
          </div>
          {reservations === null ? <p className={styles.empty}>De reserveringen konden niet worden geladen.</p> :
            reservations.length === 0 ? <p className={styles.empty}>Geen reserveringen voor vandaag.</p> :
            <div className={styles.workRows}>
              {reservations.map((r) => <div className={styles.workRow} key={r.id}>
                <div>
                  <strong>{r.guest_name}</strong>
                  <small>{r.party_size} gasten · {r.status === "pending" ? "Nog te bevestigen" : "Ingepland"}</small>
                </div>
                <time className={styles.reservationTime} dateTime={r.starts_at}>
                  {clock.format(new Date(r.starts_at))}
                </time>
              </div>)}
            </div>}
        </section>
      </div>
    </section>

    <section className={styles.shortcuts} aria-label="Snel naar beheer">
      <Link href="/management/qr-bestellingen"><span>01</span><strong>Bestellingen</strong><small>Orders, betalingen en status</small></Link>
      <Link href="/management/reserveringen"><span>02</span><strong>Reserveringen</strong><small>Planning en aankomst</small></Link>
      <Link href="/management/tafelverzoeken"><span>03</span><strong>Tafelverzoeken</strong><small>Bediening en rekeningen</small></Link>
      <Link href="/management/menu"><span>04</span><strong>Menukaart</strong><small>Prijzen en beschikbaarheid</small></Link>
      <Link href="/management/statistieken"><span>05</span><strong>Statistieken</strong><small>Dag-, maand- en jaarcijfers</small></Link>
    </section>
    <p className={styles.disclaimer}>
      Financiële grafieken bevatten uitsluitend QR-bestellingen. Betaalde bedragen zijn handmatige managementmarkeringen
      op basis van het registratiemoment; kassaverkopen, terugbetalingen en bankafschrijvingen zijn niet gekoppeld.
    </p>
  </div>;
}
