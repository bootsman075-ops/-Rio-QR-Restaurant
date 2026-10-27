import Link from "next/link";
import { redirect } from "next/navigation";

import { getStaffContext } from "@/lib/staff-session";
import { updatePlatformAdminEmail } from "./actions";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ ok?: string; error?: string }>;
};

export default async function PlatformAccountPage({ searchParams }: Props) {
  const context = await getStaffContext();

  if (!context) {
    redirect("/login");
  }

  if (context.role !== "platform_admin") {
    redirect(context.role === "staff" ? "/staff" : "/management");
  }

  const params = searchParams ? await searchParams : {};
  const message =
    params.ok === "changed"
      ? "Het platform-admin e-mailadres is gewijzigd. Gebruik voortaan het nieuwe adres om in te loggen."
      : params.error === "email"
        ? "Vul een geldig e-mailadres in."
        : params.error === "update"
          ? "Het e-mailadres kon niet worden gewijzigd. Mogelijk is het adres al in gebruik."
          : null;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body {
          margin: 0;
          background: #f3efe5;
          color: #171714;
          font-family: Arial, Helvetica, sans-serif;
        }
        .page { min-height: 100vh; padding: 44px 20px 80px; }
        .wrap { width: 100%; max-width: 720px; margin: 0 auto; }
        .back {
          display: inline-block;
          margin-bottom: 28px;
          color: #5f5a50;
          font-weight: 800;
          text-decoration: none;
        }
        .card {
          padding: 30px;
          border: 1px solid rgba(23,23,20,.10);
          border-radius: 24px;
          background: #fffdf8;
        }
        .eyebrow {
          margin: 0 0 8px;
          color: #a87c36;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: .16em;
          text-transform: uppercase;
        }
        h1 {
          margin: 0;
          font-size: clamp(36px, 7vw, 54px);
          letter-spacing: -.05em;
          font-weight: 500;
        }
        .intro { color: #777267; line-height: 1.6; }
        label {
          display: block;
          margin: 24px 0 8px;
          font-size: 13px;
          font-weight: 800;
        }
        input {
          width: 100%;
          min-height: 50px;
          padding: 12px 14px;
          border: 1px solid rgba(23,23,20,.16);
          border-radius: 12px;
          background: white;
          font: inherit;
        }
        button {
          margin-top: 18px;
          min-height: 48px;
          padding: 11px 18px;
          border: 0;
          border-radius: 999px;
          background: #171714;
          color: white;
          font-weight: 800;
          cursor: pointer;
        }
        .notice {
          margin: 20px 0 0;
          padding: 12px 14px;
          border-radius: 12px;
          background: rgba(168,124,54,.12);
          line-height: 1.5;
        }
      `}</style>

      <main className="page">
        <div className="wrap">
          <Link className="back" href="/platform">← Terug naar platformbeheer</Link>

          <section className="card">
            <p className="eyebrow">vantorstudio Restaurant Platform</p>
            <h1>Adminaccount</h1>
            <p className="intro">
              Wijzig hier het e-mailadres van het centrale platform-adminaccount.
              De platformrechten blijven aan hetzelfde account gekoppeld.
            </p>

            {message ? <div className="notice">{message}</div> : null}

            <form action={updatePlatformAdminEmail}>
              <label htmlFor="email">Platform-admin e-mailadres</label>
              <input
                id="email"
                name="email"
                type="email"
                defaultValue={context.email ?? ""}
                autoComplete="email"
                required
              />

              <button type="submit">E-mailadres wijzigen</button>
            </form>
          </section>
        </div>
      </main>
    </>
  );
}
