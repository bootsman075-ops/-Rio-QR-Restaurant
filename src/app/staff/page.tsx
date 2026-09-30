import LiveRefresh from "./LiveRefresh";
import StaffNav from "./StaffNav";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  STAFF_COOKIE_NAME,
  getStaffSessionToken,
} from "@/lib/staff-auth";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

async function markRequestHandled(formData: FormData) {
  "use server";

  const requestId = String(formData.get("request_id") ?? "");

  if (!requestId) {
    return;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !secretKey) {
    throw new Error("Supabase serverconfiguratie ontbreekt.");
  }

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { error } = await supabase
    .from("service_requests")
    .update({
      status: "handled",
      handled_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "pending");

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/staff");
}


type ServiceRequest = {
  id: string;
  request_type: "service" | "bill";
  status: string;
  created_at: string;
  tables:
    | {
        number: number;
        label: string | null;
      }
    | {
        number: number;
        label: string | null;
      }[]
    | null;
};

function getTableInfo(request: ServiceRequest) {
  if (Array.isArray(request.tables)) {
    return request.tables[0] ?? null;
  }

  return request.tables;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function StaffPage() {
  const cookieStore = await cookies();
  const expectedSession = getStaffSessionToken();

  if (
    !expectedSession ||
    cookieStore.get(STAFF_COOKIE_NAME)?.value !== expectedSession
  ) {
    redirect("/staff/login");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  let requests: ServiceRequest[] = [];
  let configurationMissing = false;
  let loadError = false;

  if (!supabaseUrl || !secretKey) {
    configurationMissing = true;
  } else {
    const supabase = createClient(supabaseUrl, secretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await supabase
      .from("service_requests")
      .select(`
        id,
        request_type,
        status,
        created_at,
        tables (
          number,
          label
        )
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      loadError = true;
    } else {
      requests = (data ?? []) as ServiceRequest[];
    }
  }

  const serviceCount = requests.filter(
    (request) => request.request_type === "service"
  ).length;

  const billCount = requests.filter(
    (request) => request.request_type === "bill"
  ).length;

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

        .live {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: var(--ink);
          color: white;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 700;
        }

        .live-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #61c779;
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

        .requests {
          display: grid;
          gap: 14px;
        }

        .request {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 18px;
          align-items: center;
          padding: 22px;
          background: var(--paper);
          border: 1px solid var(--line);
          border-radius: 22px;
        }

        .icon {
          width: 52px;
          height: 52px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          background: var(--ink);
          color: white;
          font-size: 22px;
        }

        .request-title {
          margin: 0;
          font-size: 19px;
          font-weight: 800;
        }

        .request-meta {
          margin: 6px 0 0;
          color: var(--muted);
          font-size: 14px;
        }


        .request-actions {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .handled-button {
          border: 0;
          border-radius: 999px;
          padding: 11px 16px;
          background: #171714;
          color: #fff;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }

        .handled-button:hover {
          opacity: .82;
        }

        .time {
          color: var(--muted);
          font-size: 13px;
          white-space: nowrap;
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

          .stats {
            grid-template-columns: 1fr;
          }

          .request {
            grid-template-columns: auto 1fr;
          }


        .request-actions {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .handled-button {
          border: 0;
          border-radius: 999px;
          padding: 11px 16px;
          background: #171714;
          color: #fff;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }

        .handled-button:hover {
          opacity: .82;
        }

        .time {
            grid-column: 2;
          }
        }
      `}</style>

      <main className="staff-page">
        <div className="wrap">
          <StaffNav current="requests" />

          <header className="top">
            <div>
              <p className="eyebrow">R.I.O. Deventer</p>
              <h1>Personeel</h1>
              <p className="subtitle">
                Openstaande verzoeken vanaf de tafels.
              </p>
            </div>

            <div className="live">
              <span className="live-dot" />
              Live dashboard
            </div>
          </header>

          <section className="stats">
            <div className="stat">
              <div className="stat-label">Openstaand</div>
              <div className="stat-value">{requests.length}</div>
            </div>

            <div className="stat">
              <div className="stat-label">Bediening</div>
              <div className="stat-value">{serviceCount}</div>
            </div>

            <div className="stat">
              <div className="stat-label">Rekeningen</div>
              <div className="stat-value">{billCount}</div>
            </div>
          </section>

          {configurationMissing ? (
            <div className="warning">
              <strong>Dashboard is klaar, maar nog niet gekoppeld.</strong>
              Voeg straks de SUPABASE_SECRET_KEY toe aan .env.local.
            </div>
          ) : loadError ? (
            <div className="warning">
              <strong>De meldingen konden niet worden geladen.</strong>
              Controleer de serverconfiguratie.
            </div>
          ) : requests.length === 0 ? (
            <div className="empty">
              Er zijn momenteel geen openstaande tafelverzoeken.
            </div>
          ) : (
            <div className="requests">
              {requests.map((request) => {
                const table = getTableInfo(request);
                const tableName =
                  table?.label ?? `Tafel ${table?.number ?? "?"}`;

                const isBill = request.request_type === "bill";

                return (
                  <article className="request" key={request.id}>
                    <div className="icon">
                      {isBill ? "€" : "!"}
                    </div>

                    <div>
                      <p className="request-title">
                        {tableName} ·{" "}
                        {isBill
                          ? "Rekening gevraagd"
                          : "Bediening gevraagd"}
                      </p>

                      <p className="request-meta">
                        Status: openstaand
                      </p>
                    </div>

                    <div className="request-actions">
                      <div className="time">
                        {formatTime(request.created_at)}
                      </div>

                      <form action={markRequestHandled}>
                        <input
                          type="hidden"
                          name="request_id"
                          value={request.id}
                        />

                        <button
                          className="handled-button"
                          type="submit"
                        >
                          Afgehandeld
                        </button>
                      </form>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
            <LiveRefresh />
    </main>
    </>
  );
}
