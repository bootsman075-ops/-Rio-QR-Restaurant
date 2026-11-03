"use client";

import { useState } from "react";
import type { CSSProperties } from "react";

import styles from "./management-workspace.module.css";

export type RevenueBucket = {
  period: string;
  label: string;
  orders: number;
  ordered_cents: number;
  paid_cents: number;
};
export type RevenueReport = {
  day: RevenueBucket[];
  month: RevenueBucket[];
  year: RevenueBucket[];
};

const euro = (amount: number) => new Intl.NumberFormat("nl-NL", {
  style: "currency", currency: "EUR",
}).format(amount / 100);

function monthName(date: string) {
  return new Intl.DateTimeFormat("nl-NL", { month: "short", year: "2-digit", timeZone: "UTC" })
    .format(new Date(date + "T12:00:00Z"));
}

function label(bucket: RevenueBucket, kind: keyof RevenueReport) {
  if (kind === "year") return bucket.period.slice(0, 4);
  if (kind === "month") return monthName(bucket.period);
  return bucket.period.slice(8, 10) + " " +
    new Intl.DateTimeFormat("nl-NL", { month: "short", timeZone: "UTC" })
      .format(new Date(bucket.period + "T12:00:00Z"));
}

const views = {
  day: { title: "Per dag", subtitle: "Afgelopen 14 dagen" },
  month: { title: "Per maand", subtitle: "Afgelopen 12 maanden" },
  year: { title: "Per jaar", subtitle: "Afgelopen 5 jaar" },
} as const;

export default function RevenueChart({ report }: { report: RevenueReport }) {
  const [kind, setKind] = useState<keyof RevenueReport>("month");
  const rows = report[kind];
  const maximum = Math.max(1, ...rows.map((r) => Math.max(r.ordered_cents, r.paid_cents)));
  const totalPaid = rows.reduce((sum, r) => sum + r.paid_cents, 0);
  const totalOrdered = rows.reduce((sum, r) => sum + r.ordered_cents, 0);

  return <section className={styles.chartCard} aria-label="Omzetgrafieken">
    <div className={styles.chartHeader}>
      <div>
        <p className={styles.eyebrow}>Omzetanalyse · QR-bestellingen</p>
        <h2>Omzetontwikkeling</h2>
        <p>{views[kind].subtitle} · tijdzone van het restaurant</p>
      </div>
      <div className={styles.switcher} role="group" aria-label="Periode van de omzetgrafiek">
        {(["day", "month", "year"] as const).map((name) =>
          <button key={name} type="button"
            aria-pressed={kind === name}
            className={kind === name ? styles.switchActive : ""}
            onClick={() => setKind(name)}>{views[name].title}</button>)}
      </div>
    </div>

    <div className={styles.chartLegend}>
      <span><i className={styles.orderedSwatch} /> Waarde van bestellingen</span>
      <span><i className={styles.paidSwatch} /> Als betaald geregistreerd</span>
    </div>
    <div className={styles.chartScroll}>
      <div className={styles.graph} role="img" aria-label={
        "Grafiek met " + rows.length + " perioden. Bestelwaarde " + euro(totalOrdered) +
        ", als betaald geregistreerd " + euro(totalPaid)
      }>
        {rows.map((bucket) => {
          const orderedHeight = bucket.ordered_cents > 0 ? Math.max(1.5, 100 * bucket.ordered_cents / maximum) : 0;
          const paidHeight = bucket.paid_cents > 0 ? Math.max(1.5, 100 * bucket.paid_cents / maximum) : 0;
          return <div key={bucket.period} className={styles.graphColumn}
              title={label(bucket, kind) + ": bestellingen " + euro(bucket.ordered_cents) +
                " · betaald " + euro(bucket.paid_cents)}>
            <div className={styles.graphBars}>
              <div className={styles.orderedBar} style={{ height: orderedHeight + "%" } as CSSProperties} />
              <div className={styles.paidBar} style={{ height: paidHeight + "%" } as CSSProperties} />
            </div>
            <span>{label(bucket, kind)}</span>
          </div>;
        })}
      </div>
    </div>
    <div className={styles.chartTotals}>
      <span>Bestelwaarde <strong>{euro(totalOrdered)}</strong></span>
      <span>Geregistreerd betaald <strong>{euro(totalPaid)}</strong></span>
    </div>
    <details className={styles.chartDetails}>
      <summary>Alle bedragen per {kind === "day" ? "dag" : kind === "month" ? "maand" : "jaar"} bekijken</summary>
      <div className={styles.chartTableScroll}>
        <table>
          <thead><tr><th>Periode</th><th>Bestellingen</th><th>Bestelwaarde</th><th>Betaald gemarkeerd</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.period}>
            <th>{label(r,kind)}</th><td>{r.orders}</td><td>{euro(r.ordered_cents)}</td><td>{euro(r.paid_cents)}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </details>
  </section>;
}
