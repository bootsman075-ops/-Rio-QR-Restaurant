import Link from "next/link";
import { redirect } from "next/navigation";

import { logout } from "@/components/dashboard/auth-actions";
import { getStaffContext } from "@/lib/staff-session";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PlatformPage() {
  const context = await getStaffContext();

  if (!context) {
    redirect("/login");
  }

  if (context.role !== "platform_admin") {
    redirect(context.role === "staff" ? "/staff" : "/management");
  }

  const supabase = await createClient();
  const { data: restaurants, error } = await supabase
    .from("restaurants")
    .select("id, name, slug, city, is_active")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

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
        * { box-sizing: border-box; }
        body {
          margin: 0;
          background: var(--bg);
          color: var(--ink);
          font-family: Arial, Helvetica, sans-serif;
        }
        .page { min-height: 100vh; padding: 44px 20px 80px; }
        .wrap { width: 100%; max-width: 1050px; margin: 0 auto; }
        .top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
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
        .subtitle { margin: 10px 0 0; color: var(--muted); }
        .logout {
          padding: 10px 16px;
          border: 1px solid rgba(23,23,20,.16);
          border-radius: 999px;
          background: transparent;
          font-weight: 800;
          cursor: pointer;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0,1fr));
          gap: 14px;
        }
        .card {
          display: block;
          padding: 24px;
          border: 1px solid var(--line);
          border-radius: 22px;
          background: var(--paper);
          color: inherit;
          text-decoration: none;
        }
        .card h2 { margin: 0; font-size: 24px; }
        .meta { margin: 8px 0 0; color: var(--muted); line-height: 1.5; }
        .status {
          display: inline-block;
          margin-top: 16px;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(23,23,20,.08);
          font-size: 12px;
          font-weight: 800;
        }
        .empty {
          padding: 28px;
          border: 1px solid var(--line);
          border-radius: 22px;
          background: var(--paper);
          color: var(--muted);
        }
        @media (max-width: 700px) {
          .top { flex-direction: column; }
          .grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <main className="page">
        <div className="wrap">
          <header className="top">
            <div>
              <p className="eyebrow">vantorstudio Restaurant Platform</p>
              <h1>Platformbeheer</h1>
              <p className="subtitle">Centraal overzicht van aangesloten restaurants.</p>
            </div>
            <form action={logout}>
              <button className="logout" type="submit">Uitloggen</button>
            </form>
          </header>

          {restaurants?.length ? (
            <section className="grid">
              {restaurants.map((restaurant) => (
                <article className="card" key={restaurant.id}>
                  <h2>{restaurant.name}</h2>
                  <p className="meta">
                    {restaurant.city ?? "Plaats niet ingesteld"}<br />
                    {restaurant.slug}
                  </p>
                  <span className="status">
                    {restaurant.is_active ? "Actief" : "Inactief"}
                  </span>
                </article>
              ))}
            </section>
          ) : (
            <div className="empty">Er zijn nog geen restaurants zichtbaar.</div>
          )}
        </div>
      </main>
    </>
  );
}
