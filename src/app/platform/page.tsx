import { redirect } from "next/navigation";

import { logout } from "@/components/dashboard/auth-actions";
import { getStaffContext } from "@/lib/staff-session";
import { createClient } from "@/lib/supabase/server";
import { inviteRestaurantUser } from "./invite-actions";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ invite?: string }>;
};

export default async function PlatformPage({ searchParams }: Props) {
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

  const params = searchParams ? await searchParams : {};
  const inviteMessage =
    params.invite === "sent"
      ? "Uitnodiging verstuurd. De gebruiker kan via de e-mail het account activeren."
      : params.invite === "invalid"
        ? "Controleer het e-mailadres, restaurant en de gekozen rol."
        : params.invite === "restaurant"
          ? "Het gekozen restaurant bestaat niet of is niet actief."
          : params.invite === "auth"
            ? "De uitnodiging kon niet door Supabase Auth worden verstuurd."
            : params.invite === "membership"
              ? "De restaurantkoppeling kon niet worden opgeslagen; de aangemaakte Auth-gebruiker is teruggedraaid."
              : null;

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
        .invite {
          margin-bottom: 26px;
          padding: 24px;
          border: 1px solid var(--line);
          border-radius: 22px;
          background: var(--paper);
        }
        .invite h2 { margin: 0 0 6px; font-size: 24px; }
        .invite p { margin: 0 0 18px; color: var(--muted); }
        .invite-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr 1fr auto;
          gap: 10px;
          align-items: end;
        }
        .field label {
          display: block;
          margin-bottom: 7px;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .06em;
        }
        .field input,
        .field select {
          width: 100%;
          min-height: 44px;
          padding: 10px 12px;
          border: 1px solid rgba(23,23,20,.16);
          border-radius: 12px;
          background: white;
          font: inherit;
        }
        .invite-button {
          min-height: 44px;
          padding: 10px 18px;
          border: 0;
          border-radius: 999px;
          background: var(--ink);
          color: white;
          font-weight: 800;
          cursor: pointer;
        }
        .notice {
          margin: 0 0 18px;
          padding: 12px 14px;
          border-radius: 12px;
          background: rgba(168,124,54,.12);
          color: var(--ink);
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
        @media (max-width: 800px) {
          .invite-grid { grid-template-columns: 1fr; }
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

          <section className="invite">
            <h2>Gebruiker uitnodigen</h2>
            <p>De gebruiker ontvangt een persoonlijke activatielink en stelt zelf een wachtwoord in.</p>
            {inviteMessage ? <div className="notice">{inviteMessage}</div> : null}
            <form className="invite-grid" action={inviteRestaurantUser}>
              <div className="field">
                <label htmlFor="email">E-mailadres</label>
                <input id="email" name="email" type="email" required />
              </div>
              <div className="field">
                <label htmlFor="restaurant_id">Restaurant</label>
                <select id="restaurant_id" name="restaurant_id" required>
                  <option value="">Kies restaurant</option>
                  {(restaurants ?? [])
                    .filter((restaurant) => restaurant.is_active)
                    .map((restaurant) => (
                      <option key={restaurant.id} value={restaurant.id}>
                        {restaurant.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="role">Rol</label>
                <select id="role" name="role" defaultValue="staff" required>
                  <option value="restaurant_owner">Eigenaar</option>
                  <option value="manager">Management</option>
                  <option value="staff">Personeel</option>
                </select>
              </div>
              <button className="invite-button" type="submit">Uitnodigen</button>
            </form>
          </section>

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
