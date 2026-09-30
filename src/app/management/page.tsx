import Link from "next/link";

import DashboardNav from "@/components/dashboard/DashboardNav";
import LiveRefresh from "@/components/dashboard/LiveRefresh";
import { DASHBOARD_PATHS } from "@/components/dashboard/areas";
import { requirePermission } from "@/lib/permissions";
import {
  PILOT_RESTAURANT_SLUG,
  addDays,
  formatLongDate,
  todayInZone,
  zonedToIso,
} from "@/lib/reservations";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

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

async function loadOverview(): Promise<{ today: string; data: Overview | null }> {
  const fallbackToday = todayInZone("Europe/Amsterdam");

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    return { today: fallbackToday, data: null };
  }

  const supabase = createAdminClient();
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, timezone")
    .eq("slug", PILOT_RESTAURANT_SLUG)
    .maybeSingle();

  if (!restaurant) {
    return { today: fallbackToday, data: null };
  }

  const today = todayInZone(restaurant.timezone);

  const [requests, reservations, items, sections] = await Promise.all([
    supabase
      .from("service_requests")
      .select("request_type")
      .eq("restaurant_id", restaurant.id)
      .eq("status", "pending"),
    supabase
      .from("reservations")
      .select("party_size, status")
      .eq("restaurant_id", restaurant.id)
      .gte("starts_at", zonedToIso(today, "00:00", restaurant.timezone)!)
      .lt("starts_at", zonedToIso(addDays(today, 1), "00:00", restaurant.timezone)!),
    supabase.from("menu_items").select("is_available").eq("restaurant_id", restaurant.id),
    supabase.from("menu_sections").select("is_visible").eq("restaurant_id", restaurant.id),
  ]);

  if (requests.error || reservations.error || items.error || sections.error) {
    console.error(requests.error ?? reservations.error ?? items.error ?? sections.error);
    return { today, data: null };
  }

  const active = reservations.data.filter(
    (reservation) => reservation.status !== "cancelled" && reservation.status !== "no_show",
  );

  return {
    today,
    data: {
      pendingService: requests.data.filter((request) => request.request_type === "service").length,
      pendingBills: requests.data.filter((request) => request.request_type === "bill").length,
      reservationsToday: active.length,
      guestsToday: active.reduce((total, reservation) => total + reservation.party_size, 0),
      newReservations: reservations.data.filter((reservation) => reservation.status === "pending").length,
      menuItems: items.data.length,
      unavailableItems: items.data.filter((item) => !item.is_available).length,
      hiddenSections: sections.data.filter((section) => !section.is_visible).length,
    },
  };
}

export default async function ManagementPage() {
  await requirePermission("management.access");

  const { today, data } = await loadOverview();
  const paths = DASHBOARD_PATHS.management;

  const modules = [
    {
      href: paths.requests,
      title: "Tafelverzoeken",
      text: "Bediening en rekeningen die vanaf de tafels zijn aangevraagd.",
      stat: data ? `${data.pendingService + data.pendingBills} open` : null,
    },
    {
      href: paths.reservations,
      title: "Reserveringen",
      text: "Bekijken, toevoegen, wijzigen, annuleren en verwijderen.",
      stat: data ? `${data.reservationsToday} vandaag` : null,
    },
    {
      href: paths.menu,
      title: "Menu beheren",
      text: "Gerechten, prijzen, foto's, allergenen, kenmerken en categorieën.",
      stat: data ? `${data.menuItems} items` : null,
    },
  ];

  return (
    <>
      <style>{`
        :root {
          --bg: #f3efe5;
          --ink: #171714;
          --muted: #777267;
          --gold: #a87c36;
          --paper: #fffdf8;
          --line: rgba(23,23,20,.10);
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: var(--bg);
          color: var(--ink);
          font-family: Arial, Helvetica, sans-serif;
        }

        .staff-page {
          min-height: 100vh;
          padding: 42px 20px 80px;
        }

        .wrap {
          width: 100%;
          max-width: 1050px;
          margin: 0 auto;
        }

        .top {
          margin-bottom: 34px;
        }

        .eyebrow {
          margin: 0 0 8px;
          color: var(--gold);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: .16em;
          text-transform: uppercase;
        }

        h1 {
          margin: 0;
          font-size: clamp(38px, 7vw, 64px);
          letter-spacing: -.05em;
          font-weight: 500;
        }

        .subtitle {
          margin: 10px 0 0;
          color: var(--muted);
        }

        .section-title {
          margin: 0 0 14px;
          color: var(--muted);
          font-size: 13px;
          font-weight: 800;
          letter-spacing: .12em;
          text-transform: uppercase;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 36px;
        }

        .stat {
          padding: 20px;
          background: rgba(255,255,255,.55);
          border: 1px solid var(--line);
          border-radius: 20px;
        }

        .stat-label {
          color: var(--muted);
          font-size: 13px;
        }

        .stat-value {
          margin-top: 8px;
          font-size: 32px;
          font-weight: 700;
        }

        .stat-note {
          margin-top: 4px;
          color: var(--muted);
          font-size: 12px;
        }

        .modules {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 36px;
        }

        .module {
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-height: 190px;
          padding: 24px;
          background: var(--paper);
          border: 1px solid var(--line);
          border-radius: 22px;
          color: var(--ink);
          text-decoration: none;
          transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
        }

        .module:hover {
          transform: translateY(-2px);
          border-color: rgba(168,124,54,.4);
          box-shadow: 0 16px 36px rgba(42,32,17,.06);
        }

        .module-title {
          margin: 0;
          font-size: 24px;
          font-weight: 500;
          letter-spacing: -.03em;
        }

        .module-text {
          margin: 0;
          color: var(--muted);
          font-size: 14px;
          line-height: 1.55;
        }

        .module-foot {
          margin-top: auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          font-weight: 800;
        }

        .module-stat {
          color: var(--gold);
        }

        .future {
          padding: 22px 24px;
          border: 1px dashed rgba(23,23,20,.18);
          border-radius: 22px;
          color: var(--muted);
          font-size: 14px;
          line-height: 1.55;
        }

        .future strong {
          display: block;
          margin-bottom: 4px;
          color: var(--ink);
        }

        .warning {
          margin-bottom: 28px;
          padding: 22px;
          border-radius: 18px;
          background: var(--paper);
          border: 1px solid rgba(168,124,54,.35);
        }

        @media (max-width: 800px) {
          .stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .modules {
            grid-template-columns: 1fr;
          }

          .module {
            min-height: 0;
          }
        }
      `}</style>

      <main className="staff-page">
        <div className="wrap">
          <DashboardNav area="management" current="overview" />

          <header className="top">
            <p className="eyebrow">R.I.O. Deventer</p>
            <h1>Management</h1>
            <p className="subtitle">Overzicht van {formatLongDate(today)}.</p>
          </header>

          {data ? (
            <>
              <p className="section-title">Vandaag</p>
              <section className="stats">
                <div className="stat">
                  <div className="stat-label">Open tafelverzoeken</div>
                  <div className="stat-value">{data.pendingService + data.pendingBills}</div>
                  <div className="stat-note">
                    {data.pendingService} bediening · {data.pendingBills} rekening
                  </div>
                </div>

                <div className="stat">
                  <div className="stat-label">Reserveringen</div>
                  <div className="stat-value">{data.reservationsToday}</div>
                  <div className="stat-note">{data.guestsToday} gasten</div>
                </div>

                <div className="stat">
                  <div className="stat-label">Nog te bevestigen</div>
                  <div className="stat-value">{data.newReservations}</div>
                  <div className="stat-note">reserveringen met status Nieuw</div>
                </div>

                <div className="stat">
                  <div className="stat-label">Niet beschikbaar</div>
                  <div className="stat-value">{data.unavailableItems}</div>
                  <div className="stat-note">
                    van {data.menuItems} menu-items · {data.hiddenSections} categorieën verborgen
                  </div>
                </div>
              </section>
            </>
          ) : (
            <div className="warning">
              De cijfers konden niet worden geladen. Controleer de serverconfiguratie.
            </div>
          )}

          <p className="section-title">Beheer</p>
          <section className="modules">
            {modules.map((module) => (
              <Link key={module.href} href={module.href} className="module">
                <h2 className="module-title">{module.title}</h2>
                <p className="module-text">{module.text}</p>
                <div className="module-foot">
                  <span className="module-stat">{module.stat}</span>
                  <span aria-hidden="true">→</span>
                </div>
              </Link>
            ))}
          </section>

          <div className="future">
            <strong>Meer beheerfuncties</strong>
            Nieuwe beheeronderdelen verschijnen hier en in het menu bovenaan. Ze zijn
            automatisch alleen toegankelijk voor Management.
          </div>
        </div>

        <LiveRefresh />
      </main>
    </>
  );
}
