import { redirect } from "next/navigation";

import { logout } from "@/components/dashboard/auth-actions";
import { getStaffContext } from "@/lib/staff-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { inviteRestaurantUser } from "./invite-actions";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ invite?: string }>;
};

const ROLE_LABELS = {
  restaurant_owner: "Eigenaar",
  manager: "Management",
  staff: "Personeel",
} as const;

export default async function PlatformPage({ searchParams }: Props) {
  const context = await getStaffContext();

  if (!context) {
    redirect("/login");
  }

  if (context.role !== "platform_admin") {
    redirect(context.role === "staff" ? "/staff" : "/management");
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const [
    { data: restaurants, error: restaurantsError },
    { data: memberships, error: membershipsError },
    { data: authUsers, error: authUsersError },
  ] = await Promise.all([
    supabase
      .from("restaurants")
      .select("id, name, slug, city, is_active")
      .order("name", { ascending: true }),
    admin
      .from("user_restaurants")
      .select("user_id, restaurant_id, role, active, created_at")
      .order("created_at", { ascending: true }),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  if (restaurantsError) {
    throw new Error(restaurantsError.message);
  }

  if (membershipsError) {
    throw new Error(membershipsError.message);
  }

  if (authUsersError) {
    throw new Error(authUsersError.message);
  }

  const emailByUserId = new Map(
    authUsers.users.map((user) => [user.id, user.email ?? "E-mail onbekend"]),
  );

  const membersByRestaurant = new Map<
    string,
    Array<{
      user_id: string;
      email: string;
      role: "restaurant_owner" | "manager" | "staff";
      active: boolean;
      created_at: string;
    }>
  >();

  for (const membership of memberships ?? []) {
    const entries = membersByRestaurant.get(membership.restaurant_id) ?? [];
    entries.push({
      user_id: membership.user_id,
      email: emailByUserId.get(membership.user_id) ?? "E-mail onbekend",
      role: membership.role,
      active: membership.active,
      created_at: membership.created_at,
    });
    membersByRestaurant.set(membership.restaurant_id, entries);
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
        .wrap { width: 100%; max-width: 1180px; margin: 0 auto; }
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
          padding: 24px;
          border: 1px solid var(--line);
          border-radius: 22px;
          background: var(--paper);
        }
        .card-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
        }
        .card h2 { margin: 0; font-size: 24px; }
        .meta { margin: 8px 0 0; color: var(--muted); line-height: 1.5; }
        .status {
          display: inline-block;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(23,23,20,.08);
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }
        .members {
          margin-top: 20px;
          padding-top: 18px;
          border-top: 1px solid var(--line);
        }
        .members-title {
          margin: 0 0 10px;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: .05em;
          text-transform: uppercase;
        }
        .member {
          display: grid;
          grid-template-columns: minmax(0,1fr) auto auto;
          gap: 10px;
          align-items: center;
          padding: 10px 0;
          border-top: 1px solid rgba(23,23,20,.07);
        }
        .member:first-of-type { border-top: 0; }
        .member-email {
          min-width: 0;
          overflow-wrap: anywhere;
          font-weight: 700;
        }
        .role {
          padding: 5px 8px;
          border-radius: 999px;
          background: rgba(168,124,54,.12);
          font-size: 12px;
          font-weight: 800;
        }
        .member-status {
          font-size: 12px;
          font-weight: 800;
          color: var(--muted);
        }
        .member-status.active { color: #26683b; }
        .no-members {
          margin: 0;
          color: var(--muted);
          font-size: 14px;
        }
        .empty {
          padding: 28px;
          border: 1px solid var(--line);
          border-radius: 22px;
          background: var(--paper);
          color: var(--muted);
        }
        @media (max-width: 900px) {
          .invite-grid { grid-template-columns: 1fr 1fr; }
          .grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 620px) {
          .top { flex-direction: column; }
          .invite-grid { grid-template-columns: 1fr; }
          .member { grid-template-columns: 1fr; }
          .role, .member-status { width: fit-content; }
        }
      `}</style>

      <main className="page">
        <div className="wrap">
          <header className="top">
            <div>
              <p className="eyebrow">vantorstudio Restaurant Platform</p>
              <h1>Platformbeheer</h1>
              <p className="subtitle">
                Centraal overzicht van restaurants, gebruikers en rollen.
              </p>
            </div>
            <form action={logout}>
              <button className="logout" type="submit">Uitloggen</button>
            </form>
          </header>

          <section className="invite">
            <h2>Gebruiker uitnodigen</h2>
            <p>
              De gebruiker ontvangt een persoonlijke activatielink en stelt zelf een wachtwoord in.
            </p>
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
              {restaurants.map((restaurant) => {
                const members = membersByRestaurant.get(restaurant.id) ?? [];

                return (
                  <article className="card" key={restaurant.id}>
                    <div className="card-head">
                      <div>
                        <h2>{restaurant.name}</h2>
                        <p className="meta">
                          {restaurant.city ?? "Plaats niet ingesteld"}<br />
                          {restaurant.slug}
                        </p>
                      </div>
                      <span className="status">
                        {restaurant.is_active ? "Actief" : "Inactief"}
                      </span>
                    </div>

                    <div className="members">
                      <p className="members-title">
                        Gekoppelde accounts ({members.length})
                      </p>

                      {members.length ? (
                        members.map((member) => (
                          <div className="member" key={member.user_id}>
                            <span className="member-email">{member.email}</span>
                            <span className="role">{ROLE_LABELS[member.role]}</span>
                            <span
                              className={`member-status ${member.active ? "active" : ""}`}
                            >
                              {member.active ? "Actief" : "Inactief"}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="no-members">Nog geen gebruikers gekoppeld.</p>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
          ) : (
            <div className="empty">Er zijn nog geen restaurants zichtbaar.</div>
          )}
        </div>
      </main>
    </>
  );
}
