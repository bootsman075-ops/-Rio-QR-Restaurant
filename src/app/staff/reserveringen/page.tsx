import Link from "next/link";

import LiveRefresh from "../LiveRefresh";
import StaffNav from "../StaffNav";
import ReservationForm from "./ReservationForm";
import { deleteReservation, setReservationStatus } from "./actions";
import type { ReservationFormValues } from "./actions";
import ConfirmSubmitButton from "@/components/ui/ConfirmSubmitButton";
import { can, requirePermission } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  PILOT_RESTAURANT_SLUG,
  RESERVATION_STATUSES,
  RESERVATION_STATUS_LABELS,
  addDays,
  formatLongDate,
  isReservationStatus,
  isValidDate,
  isoToZoned,
  todayInZone,
  zonedToIso,
} from "@/lib/reservations";
import type { ReservationStatus } from "@/lib/reservations";

export const dynamic = "force-dynamic";

const BASE_PATH = "/staff/reserveringen";

type ReservationsPageProps = {
  searchParams: Promise<{
    datum?: string;
    status?: string;
    nieuw?: string;
    bewerk?: string;
    ok?: string;
  }>;
};

type ReservationRow = {
  id: string;
  guest_name: string;
  guest_phone: string | null;
  party_size: number;
  starts_at: string;
  status: ReservationStatus;
  notes: string | null;
  table_id: string | null;
  tables: { number: number; label: string | null } | null;
};

const SUCCESS_MESSAGES: Record<string, string> = {
  toegevoegd: "De reservering is toegevoegd.",
  gewijzigd: "De reservering is gewijzigd.",
};

function buildHref(params: Record<string, string | null | undefined>) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) {
      query.set(key, value);
    }
  }

  const text = query.toString();

  return text ? `${BASE_PATH}?${text}` : BASE_PATH;
}

function tableName(table: ReservationRow["tables"]) {
  if (!table) {
    return null;
  }

  return table.label ?? `Tafel ${table.number}`;
}

export default async function ReservationsPage({
  searchParams,
}: ReservationsPageProps) {
  const role = await requirePermission("reservations.manage");
  const canDelete = can(role, "reservations.delete");

  const params = await searchParams;

  const supabaseConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SECRET_KEY;

  const statusFilter =
    params.status && isReservationStatus(params.status) ? params.status : "";

  let restaurant: { id: string; timezone: string } | null = null;
  let reservations: ReservationRow[] = [];
  let tables: { id: string; number: number; label: string | null }[] = [];
  let editing: ReservationRow | null = null;
  let loadError = false;

  const supabase = supabaseConfigured ? createAdminClient() : null;

  if (supabase) {
    const { data, error } = await supabase
      .from("restaurants")
      .select("id, timezone")
      .eq("slug", PILOT_RESTAURANT_SLUG)
      .maybeSingle();

    if (error || !data) {
      console.error(error);
      loadError = true;
    } else {
      restaurant = data;
    }
  }

  const timeZone = restaurant?.timezone ?? "Europe/Amsterdam";
  const today = todayInZone(timeZone);

  // No "datum" param → today; an empty "datum" (from the filter form) → all dates.
  const dateFilter =
    params.datum === undefined
      ? today
      : isValidDate(params.datum)
        ? params.datum
        : "";

  const filters = { datum: dateFilter, status: statusFilter || null };
  const listHref = buildHref(filters);

  if (supabase && restaurant) {
    let query = supabase
      .from("reservations")
      .select(
        "id, guest_name, guest_phone, party_size, starts_at, status, notes, table_id, tables (number, label)",
      )
      .eq("restaurant_id", restaurant.id)
      .order("starts_at", { ascending: true })
      .limit(500);

    if (dateFilter) {
      query = query
        .gte("starts_at", zonedToIso(dateFilter, "00:00", timeZone)!)
        .lt("starts_at", zonedToIso(addDays(dateFilter, 1), "00:00", timeZone)!);
    }

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    const [reservationsResult, tablesResult] = await Promise.all([
      query,
      supabase
        .from("tables")
        .select("id, number, label")
        .eq("restaurant_id", restaurant.id)
        .eq("is_active", true)
        .order("number", { ascending: true }),
    ]);

    if (reservationsResult.error || tablesResult.error) {
      console.error(reservationsResult.error ?? tablesResult.error);
      loadError = true;
    } else {
      reservations = reservationsResult.data as ReservationRow[];
      tables = tablesResult.data;
    }

    if (params.bewerk) {
      const { data } = await supabase
        .from("reservations")
        .select(
          "id, guest_name, guest_phone, party_size, starts_at, status, notes, table_id, tables (number, label)",
        )
        .eq("restaurant_id", restaurant.id)
        .eq("id", params.bewerk)
        .maybeSingle();

      editing = (data as ReservationRow | null) ?? null;
    }
  }

  const showNewForm = params.nieuw === "1" && !editing;

  let formValues: ReservationFormValues | null = null;

  if (editing) {
    const local = isoToZoned(editing.starts_at, timeZone);

    formValues = {
      guest_name: editing.guest_name,
      date: local.date,
      time: local.time,
      party_size: String(editing.party_size),
      guest_phone: editing.guest_phone ?? "",
      table_id: editing.table_id ?? "",
      notes: editing.notes ?? "",
      status: editing.status,
    };
  } else if (showNewForm) {
    formValues = {
      guest_name: "",
      date: dateFilter || today,
      time: "18:00",
      party_size: "2",
      guest_phone: "",
      table_id: "",
      notes: "",
      status: "pending",
    };
  }

  const activeReservations = reservations.filter(
    (reservation) =>
      reservation.status !== "cancelled" && reservation.status !== "no_show",
  );
  const guestCount = activeReservations.reduce(
    (total, reservation) => total + reservation.party_size,
    0,
  );
  const newCount = reservations.filter(
    (reservation) => reservation.status === "pending",
  ).length;

  const successMessage = params.ok ? SUCCESS_MESSAGES[params.ok] : undefined;

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
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
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

        .stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 28px;
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

        .primary-button,
        .link-button,
        .small-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 999px;
          font-weight: 800;
          cursor: pointer;
          text-decoration: none;
          white-space: nowrap;
        }

        .primary-button {
          padding: 12px 20px;
          background: var(--ink);
          color: #fff;
          font-size: 14px;
        }

        .primary-button:disabled {
          opacity: .6;
          cursor: wait;
        }

        .link-button {
          padding: 10px 16px;
          background: transparent;
          border: 1px solid rgba(23,23,20,.16);
          color: var(--ink);
          font-size: 13px;
        }

        .small-button {
          padding: 9px 14px;
          background: var(--ink);
          color: #fff;
          font-size: 13px;
        }

        .small-button.danger {
          background: transparent;
          border: 1px solid rgba(160,50,40,.35);
          color: #a03228;
        }

        .primary-button:hover,
        .small-button:hover,
        .link-button:hover {
          opacity: .82;
        }

        .toolbar {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: flex-end;
          gap: 14px;
          margin-bottom: 20px;
          padding: 18px;
          background: var(--paper);
          border: 1px solid var(--line);
          border-radius: 22px;
        }

        .filters {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-end;
          gap: 10px;
        }

        .field {
          display: grid;
          gap: 6px;
          font-size: 13px;
          font-weight: 700;
        }

        .field input,
        .field select,
        .field textarea {
          width: 100%;
          min-height: 44px;
          padding: 0 12px;
          border: 1px solid rgba(23,23,20,.16);
          border-radius: 12px;
          background: #fff;
          color: var(--ink);
          font: inherit;
          font-weight: 400;
          font-size: 15px;
        }

        .field textarea {
          padding: 10px 12px;
          resize: vertical;
        }

        .field input:focus,
        .field select:focus,
        .field textarea:focus {
          outline: none;
          border-color: var(--gold);
        }

        .day-nav {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .day-heading {
          margin: 0 0 14px;
          font-size: 15px;
          color: var(--muted);
        }

        .res-form {
          margin-bottom: 24px;
          padding: 24px;
          background: var(--paper);
          border: 1px solid rgba(168,124,54,.35);
          border-radius: 22px;
        }

        .res-form-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
        }

        .res-form h2 {
          margin: 0;
          font-size: 22px;
        }

        .field-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }

        .field-wide {
          grid-column: 1 / -1;
        }

        .form-error {
          margin: 16px 0 0;
          padding: 12px 14px;
          border-radius: 12px;
          background: #fff1ef;
          font-size: 14px;
        }

        .form-actions {
          margin-top: 18px;
        }

        .notice {
          margin-bottom: 20px;
          padding: 14px 18px;
          border-radius: 16px;
          background: #eef6ee;
          border: 1px solid rgba(60,130,70,.25);
          font-size: 14px;
          font-weight: 700;
        }

        .reservations {
          display: grid;
          gap: 14px;
        }

        .reservation {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 18px;
          align-items: center;
          padding: 22px;
          background: var(--paper);
          border: 1px solid var(--line);
          border-radius: 22px;
        }

        .reservation.is-cancelled {
          opacity: .6;
        }

        .time-block {
          min-width: 72px;
          padding: 12px 10px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          background: var(--ink);
          color: #fff;
          font-size: 19px;
          font-weight: 800;
        }

        .time-block small {
          margin-top: 2px;
          font-size: 11px;
          font-weight: 700;
          opacity: .7;
        }

        .reservation-title {
          margin: 0;
          font-size: 19px;
          font-weight: 800;
        }

        .reservation-meta {
          margin: 6px 0 0;
          color: var(--muted);
          font-size: 14px;
          line-height: 1.5;
        }

        .reservation-note {
          margin: 8px 0 0;
          padding: 8px 12px;
          border-radius: 10px;
          background: rgba(168,124,54,.10);
          font-size: 14px;
        }

        .badge {
          display: inline-block;
          margin-left: 8px;
          padding: 3px 10px;
          border-radius: 999px;
          background: rgba(23,23,20,.08);
          font-size: 12px;
          font-weight: 800;
          vertical-align: middle;
        }

        .badge-pending { background: #fff1d6; color: #7a5310; }
        .badge-confirmed { background: #e3eefc; color: #1f4f8a; }
        .badge-seated { background: #e4f4e6; color: #256b33; }
        .badge-completed { background: rgba(23,23,20,.08); color: var(--muted); }
        .badge-cancelled,
        .badge-no_show { background: #fbe6e3; color: #a03228; }

        .reservation-actions {
          display: grid;
          gap: 8px;
          justify-items: end;
        }

        .status-form {
          display: flex;
          gap: 6px;
        }

        .status-form select {
          min-height: 38px;
          padding: 0 10px;
          border: 1px solid rgba(23,23,20,.16);
          border-radius: 999px;
          background: #fff;
          font: inherit;
          font-size: 13px;
        }

        .row-buttons {
          display: flex;
          gap: 6px;
        }

        .empty,
        .warning {
          padding: 28px;
          border-radius: 22px;
          background: var(--paper);
          border: 1px solid var(--line);
        }

        .warning {
          border-color: rgba(168,124,54,.35);
        }

        .warning strong {
          display: block;
          margin-bottom: 8px;
        }

        @media (max-width: 700px) {
          .top {
            align-items: flex-start;
            flex-direction: column;
          }

          .stats,
          .field-grid {
            grid-template-columns: 1fr;
          }

          .reservation {
            grid-template-columns: auto 1fr;
          }

          .reservation-actions {
            grid-column: 1 / -1;
            justify-items: start;
          }
        }
      `}</style>

      <main className="staff-page">
        <div className="wrap">
          <StaffNav current="reservations" />

          <header className="top">
            <div>
              <p className="eyebrow">R.I.O. Deventer</p>
              <h1>Reserveringen</h1>
              <p className="subtitle">
                Bekijk, voeg toe en wijzig reserveringen.
              </p>
            </div>

            {!showNewForm && !editing && (
              <Link
                href={buildHref({ ...filters, nieuw: "1" })}
                className="primary-button"
              >
                + Nieuwe reservering
              </Link>
            )}
          </header>

          {!supabaseConfigured ? (
            <div className="warning">
              <strong>Reserveringen zijn nog niet gekoppeld.</strong>
              Voeg de Supabase-gegevens toe aan .env.local.
            </div>
          ) : loadError || !restaurant ? (
            <div className="warning">
              <strong>De reserveringen konden niet worden geladen.</strong>
              Controleer de serverconfiguratie.
            </div>
          ) : (
            <>
              {successMessage && (
                <div className="notice">{successMessage}</div>
              )}

              {formValues && (
                <ReservationForm
                  reservationId={editing?.id ?? null}
                  initialValues={formValues}
                  tables={tables}
                  cancelHref={listHref}
                />
              )}

              {params.bewerk && !editing && (
                <div className="warning" style={{ marginBottom: 20 }}>
                  <strong>Reservering niet gevonden.</strong>
                  Mogelijk is deze verwijderd.
                </div>
              )}

              <section className="stats">
                <div className="stat">
                  <div className="stat-label">Reserveringen</div>
                  <div className="stat-value">{activeReservations.length}</div>
                </div>

                <div className="stat">
                  <div className="stat-label">Gasten</div>
                  <div className="stat-value">{guestCount}</div>
                </div>

                <div className="stat">
                  <div className="stat-label">Nieuw (nog bevestigen)</div>
                  <div className="stat-value">{newCount}</div>
                </div>
              </section>

              <section className="toolbar">
                <form className="filters" action={BASE_PATH} method="get">
                  <label className="field">
                    <span>Datum</span>
                    <input type="date" name="datum" defaultValue={dateFilter} />
                  </label>

                  <label className="field">
                    <span>Status</span>
                    <select name="status" defaultValue={statusFilter}>
                      <option value="">Alle statussen</option>
                      {RESERVATION_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {RESERVATION_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button type="submit" className="primary-button">
                    Filteren
                  </button>
                </form>

                <div className="day-nav">
                  {dateFilter && (
                    <Link
                      href={buildHref({ ...filters, datum: addDays(dateFilter, -1) })}
                      className="link-button"
                    >
                      ← Vorige dag
                    </Link>
                  )}
                  <Link
                    href={buildHref({ ...filters, datum: today })}
                    className="link-button"
                  >
                    Vandaag
                  </Link>
                  {dateFilter && (
                    <Link
                      href={buildHref({ ...filters, datum: addDays(dateFilter, 1) })}
                      className="link-button"
                    >
                      Volgende dag →
                    </Link>
                  )}
                  <Link
                    href={buildHref({ ...filters, datum: "" })}
                    className="link-button"
                  >
                    Alle datums
                  </Link>
                </div>
              </section>

              <p className="day-heading">
                {dateFilter ? formatLongDate(dateFilter) : "Alle datums"}
                {statusFilter
                  ? ` · ${RESERVATION_STATUS_LABELS[statusFilter]}`
                  : ""}
              </p>

              {reservations.length === 0 ? (
                <div className="empty">
                  Geen reserveringen gevonden voor dit filter.
                </div>
              ) : (
                <div className="reservations">
                  {reservations.map((reservation) => {
                    const local = isoToZoned(reservation.starts_at, timeZone);
                    const table = tableName(reservation.tables);
                    const isCancelled = reservation.status === "cancelled";

                    return (
                      <article
                        key={reservation.id}
                        className={`reservation${isCancelled ? " is-cancelled" : ""}`}
                      >
                        <div className="time-block">
                          {local.time}
                          {!dateFilter && (
                            <small>
                              {local.date.slice(8, 10)}-{local.date.slice(5, 7)}
                            </small>
                          )}
                        </div>

                        <div>
                          <p className="reservation-title">
                            {reservation.guest_name}
                            <span className={`badge badge-${reservation.status}`}>
                              {RESERVATION_STATUS_LABELS[reservation.status]}
                            </span>
                          </p>

                          <p className="reservation-meta">
                            {reservation.party_size}{" "}
                            {reservation.party_size === 1 ? "persoon" : "personen"}
                            {" · "}
                            {table ?? "Geen tafel"}
                            {reservation.guest_phone && (
                              <>
                                {" · "}
                                <a href={`tel:${reservation.guest_phone}`}>
                                  {reservation.guest_phone}
                                </a>
                              </>
                            )}
                            {!dateFilter && ` · ${formatLongDate(local.date)}`}
                          </p>

                          {reservation.notes && (
                            <p className="reservation-note">{reservation.notes}</p>
                          )}
                        </div>

                        <div className="reservation-actions">
                          <form action={setReservationStatus} className="status-form">
                            <input type="hidden" name="reservation_id" value={reservation.id} />
                            <input type="hidden" name="return_to" value={listHref} />
                            <select
                              key={reservation.status}
                              name="status"
                              defaultValue={reservation.status}
                              aria-label="Status"
                            >
                              {RESERVATION_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                  {RESERVATION_STATUS_LABELS[status]}
                                </option>
                              ))}
                            </select>
                            <button type="submit" className="small-button">
                              Status opslaan
                            </button>
                          </form>

                          <div className="row-buttons">
                            <Link
                              href={buildHref({ ...filters, bewerk: reservation.id })}
                              className="link-button"
                            >
                              Wijzigen
                            </Link>

                            {!isCancelled && (
                              <form action={setReservationStatus}>
                                <input type="hidden" name="reservation_id" value={reservation.id} />
                                <input type="hidden" name="return_to" value={listHref} />
                                <input type="hidden" name="status" value="cancelled" />
                                <button type="submit" className="small-button danger">
                                  Annuleren
                                </button>
                              </form>
                            )}

                            {isCancelled && canDelete && (
                              <form action={deleteReservation}>
                                <input type="hidden" name="reservation_id" value={reservation.id} />
                                <input type="hidden" name="return_to" value={listHref} />
                                <ConfirmSubmitButton
                                  className="small-button danger"
                                  message={`Reservering van ${reservation.guest_name} definitief verwijderen?`}
                                >
                                  Verwijderen
                                </ConfirmSubmitButton>
                              </form>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <LiveRefresh />
      </main>
    </>
  );
}
