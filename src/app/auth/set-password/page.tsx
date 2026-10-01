import { redirect } from "next/navigation";

import { setInvitedUserPassword } from "./actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function SetPasswordPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login?error=invite");
  }

  const params = searchParams ? await searchParams : {};
  const error =
    params.error === "password"
      ? "Gebruik minimaal 12 tekens en vul twee keer hetzelfde wachtwoord in."
      : params.error === "update"
        ? "Het wachtwoord kon niet worden opgeslagen. Probeer het opnieuw."
        : null;

  return (
    <>
      <style>{`
        body {
          margin: 0;
          background: #f3efe5;
          color: #171714;
          font-family: Arial, Helvetica, sans-serif;
        }
        .page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
        }
        .card {
          width: min(100%, 480px);
          padding: 32px;
          border: 1px solid rgba(23,23,20,.10);
          border-radius: 24px;
          background: #fffdf8;
        }
        h1 { margin: 0 0 8px; font-size: 34px; }
        p { color: #777267; line-height: 1.55; }
        label { display: block; margin-top: 18px; font-weight: 800; }
        input {
          width: 100%;
          margin-top: 8px;
          padding: 13px 14px;
          border: 1px solid rgba(23,23,20,.18);
          border-radius: 12px;
          font: inherit;
        }
        button {
          width: 100%;
          margin-top: 22px;
          padding: 13px 16px;
          border: 0;
          border-radius: 999px;
          background: #171714;
          color: white;
          font-weight: 800;
          cursor: pointer;
        }
        .error {
          padding: 12px 14px;
          border-radius: 12px;
          background: #fbe9e7;
          color: #8a2f24;
        }
      `}</style>
      <main className="page">
        <section className="card">
          <h1>Account activeren</h1>
          <p>Stel een eigen wachtwoord in om je restaurantaccount te activeren.</p>
          {error ? <p className="error">{error}</p> : null}
          <form action={setInvitedUserPassword}>
            <label htmlFor="password">Nieuw wachtwoord</label>
            <input id="password" name="password" type="password" minLength={12} required />

            <label htmlFor="confirm_password">Herhaal wachtwoord</label>
            <input
              id="confirm_password"
              name="confirm_password"
              type="password"
              minLength={12}
              required
            />

            <button type="submit">Account activeren</button>
          </form>
        </section>
      </main>
    </>
  );
}
