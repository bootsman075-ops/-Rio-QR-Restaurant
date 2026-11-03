import Link from "next/link";
import { redirect } from "next/navigation";

import DashboardNav from "@/components/dashboard/DashboardNav";
import RioDashboardBrand from "@/components/dashboard/RioDashboardBrand";
import { requirePermissionContext } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import styles from "./payments.module.css";

export const dynamic = "force-dynamic";

const euro = (amountCents: number) => new Intl.NumberFormat("nl-NL", {
  style: "currency", currency: "EUR",
}).format(amountCents / 100);

const attemptStatus: Record<string, string> = {
  created: "Aangemaakt",
  pending: "Wacht op betaalbevestiging",
  succeeded: "Door provider bevestigd",
  failed: "Mislukt",
  cancelled: "Geannuleerd",
  expired: "Verlopen",
  refunded: "Terugbetaald",
  partially_refunded: "Gedeeltelijk terugbetaald",
};

export default async function ManagementPayments() {
  const context = await requirePermissionContext("management.access");
  if (context.restaurantSlug !== "rio-deventer" || !context.restaurantId) {
    redirect("/management");
  }

  const supabase = await createClient();
  const [settingsResult, attemptResult] = await Promise.all([
    supabase.from("qr_payment_settings")
      .select("provider_code, environment, checkout_enabled, webhook_verified_at, currency")
      .eq("restaurant_id", context.restaurantId)
      .maybeSingle(),
    supabase.from("qr_payment_attempts")
      .select("id, order_id, provider_code, status, amount_cents, currency, created_at")
      .eq("restaurant_id", context.restaurantId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const dataError = Boolean(settingsResult.error || attemptResult.error);
  const settings = settingsResult.data;
  const attempts = attemptResult.data ?? [];
  const provider = settings?.provider_code ?? null;
  const ready = Boolean(settings?.checkout_enabled && provider && settings.webhook_verified_at);
  const date = new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "short", timeStyle: "short", timeZone: "Europe/Amsterdam",
  });

  return <main className={"staff-page rio-management " + styles.page}>
    <div className={"wrap " + styles.container}>
      <RioDashboardBrand area="management" />
      <DashboardNav area="management" current="payments" />
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>RIO · Management</p>
          <h1>Online betalingen</h1>
          <p>De betaalomgeving voor QR-bestellingen staat technisch klaar voor een toekomstige koppeling.</p>
        </div>
        <Link className={styles.back} href="/management">Terug naar management</Link>
      </header>

      <section className={styles.banner} aria-label="Status online betalen">
        <span className={styles.status}>{ready ? "Configuratie actief" : "Nog niet actief"}</span>
        <h2>{ready ? "Betaalconfiguratie beschikbaar" : "Klaar om een betaalprovider te koppelen"}</h2>
        <p>
          {ready
            ? "Een provider is geconfigureerd. Controleer de daadwerkelijke checkout- en webhookkoppeling voordat gasten online betalen."
            : "Gasten bestellen via hun tafel-QR, maar betalen nog steeds via het restaurant. Er wordt geen betaling gestart, geïncasseerd of automatisch als betaald gemarkeerd."}
        </p>
      </section>

      {dataError && <p role="alert" className={styles.error}>
        De betaalinstellingen of betaalpogingen konden niet worden geladen.
        De online betaalfunctie blijft uitgeschakeld.
      </p>}

      <section aria-label="Betaalkoppeling overzicht" className={styles.grid}>
        <div className={styles.tile}>
          <span>Betaalprovider</span>
          <strong>{provider ?? "Nog niet gekozen"}</strong>
          <small>Provider-onafhankelijke koppeling voorbereid</small>
        </div>
        <div className={styles.tile}>
          <span>Betaalmethode via QR</span>
          <strong>{ready ? "Geconfigureerd" : "Uitgeschakeld"}</strong>
          <small>Geen betaalpagina of betaalverzoek actief</small>
        </div>
        <div className={styles.tile}>
          <span>Omgeving</span>
          <strong>{settings?.environment === "live" ? "Live" : "Testomgeving"}</strong>
          <small>Geen API-sleutels of webhooks aangesloten</small>
        </div>
        <div className={styles.tile}>
          <span>Betaalregistratie</span>
          <strong>{attempts.length === 0 ? "Nog geen pogingen" : attempts.length + " recent"}</strong>
          <small>Online betaalpogingen, los van handmatige betaalmarkeringen</small>
        </div>
      </section>

      <section className={styles.panel} aria-labelledby="steps-title">
        <div className={styles.panelHeading}>
          <div><p className={styles.eyebrow}>Implementatiestatus</p><h2 id="steps-title">Van QR-bestelling naar betaling</h2></div>
          <span className={styles.tag}>Voorbereid</span>
        </div>
        <ol className={styles.steps}>
          <li><span className={styles.done}>1</span><div><strong>Technische basis</strong><p>Bestellingen, bedragen, betaalpogingen en webhookregistratie zijn voorbereid in Supabase.</p></div><b>Gereed</b></li>
          <li><span>2</span><div><strong>Betaalprovider kiezen</strong><p>Kies later de aanbieder en de gewenste betaalmethoden, bijvoorbeeld iDEAL of kaart.</p></div><b>Open</b></li>
          <li><span>3</span><div><strong>Beveiligde koppeling en webhooks</strong><p>API-sleutels, controle van handtekeningen en server-side betaalbevestiging aansluiten.</p></div><b>Open</b></li>
          <li><span>4</span><div><strong>Testbetaling en activering</strong><p>Pas na geslaagde tests en jouw toestemming kan online betalen aan de gastpagina worden toegevoegd.</p></div><b>Open</b></li>
        </ol>
      </section>

      <section className={styles.panel} aria-label="Online betaalpogingen">
        <div className={styles.panelHeading}>
          <div><p className={styles.eyebrow}>Betalingslogboek</p><h2>Recente online betaalpogingen</h2></div>
          <Link href="/management/qr-bestellingen">Bekijk QR-bestellingen</Link>
        </div>
        {!dataError && attempts.length === 0 ? <p className={styles.empty}>
          Nog geen online betaalpogingen. Zodra een provider veilig gekoppeld en geactiveerd is,
          kunnen de betalingsstatussen hier verschijnen.
        </p> : attempts.length > 0 ? <div className={styles.tableScroll}>
          <table>
            <thead><tr><th>Datum</th><th>Bestelling</th><th>Bedrag</th><th>Provider</th><th>Status</th></tr></thead>
            <tbody>{attempts.map((a) => <tr key={a.id}>
              <td>{date.format(new Date(a.created_at))}</td>
              <td><code>{a.order_id.slice(0,8)}…</code></td>
              <td>{euro(a.amount_cents)}</td>
              <td>{a.provider_code}</td>
              <td>{attemptStatus[a.status] ?? "Onbekend"}</td>
            </tr>)}</tbody>
          </table>
        </div> : null}
      </section>

      <p className={styles.disclaimer}>
        Dit is een voorbereide betaalomgeving, geen werkende betaalprovider.
        De bestaande handmatige betaalstatus van QR-bestellingen blijft ongewijzigd.
        Er worden geen kaartgegevens of API-sleutels in dit dashboard opgeslagen.
      </p>
    </div>
  </main>;
}
