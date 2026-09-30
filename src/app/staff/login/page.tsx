import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  STAFF_COOKIE_NAME,
  getStaffSessionToken,
  isValidStaffPassword,
} from "@/lib/staff-auth";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

async function login(formData: FormData) {
  "use server";

  const password = String(formData.get("password") ?? "");

  if (!isValidStaffPassword(password)) {
    redirect("/staff/login?error=1");
  }

  const token = getStaffSessionToken();

  if (!token) {
    redirect("/staff/login?error=config");
  }

  const cookieStore = await cookies();

  cookieStore.set(STAFF_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  redirect("/staff");
}

export default async function StaffLoginPage({
  searchParams,
}: LoginPageProps) {
  const params = await searchParams;

  const cookieStore = await cookies();
  const token = getStaffSessionToken();

  if (
    token &&
    cookieStore.get(STAFF_COOKIE_NAME)?.value === token
  ) {
    redirect("/staff");
  }

  const wrongPassword = params.error === "1";
  const configurationError = params.error === "config";

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f3efe5;
          color: #171714;
          font-family: Arial, Helvetica, sans-serif;
        }

        .login-page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
        }

        .login-card {
          width: 100%;
          max-width: 470px;
          background: #fffdf8;
          border: 1px solid rgba(23,23,20,.10);
          border-radius: 28px;
          padding: 38px;
          box-shadow: 0 20px 60px rgba(0,0,0,.05);
        }

        .eyebrow {
          margin: 0 0 14px;
          color: #a87c36;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: .16em;
          text-transform: uppercase;
        }

        h1 {
          margin: 0;
          font-size: 44px;
          font-weight: 500;
          letter-spacing: -.04em;
        }

        .subtitle {
          margin: 12px 0 30px;
          color: #777267;
          line-height: 1.5;
        }

        label {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 700;
        }

        input {
          width: 100%;
          height: 52px;
          padding: 0 16px;
          border: 1px solid rgba(23,23,20,.16);
          border-radius: 14px;
          background: white;
          font-size: 16px;
          outline: none;
        }

        input:focus {
          border-color: #a87c36;
        }

        button {
          width: 100%;
          height: 52px;
          margin-top: 16px;
          border: 0;
          border-radius: 14px;
          background: #171714;
          color: white;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
        }

        button:hover {
          opacity: .88;
        }

        .error {
          margin: 16px 0 0;
          padding: 12px 14px;
          border-radius: 12px;
          background: #fff1ef;
          font-size: 14px;
        }
      `}</style>

      <main className="login-page">
        <section className="login-card">
          <p className="eyebrow">R.I.O. Deventer</p>

          <h1>Personeel</h1>

          <p className="subtitle">
            Log in om tafelverzoeken en rekeningaanvragen te bekijken.
          </p>

          <form action={login}>
            <label htmlFor="password">
              Personeelswachtwoord
            </label>

            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              autoFocus
            />

            <button type="submit">
              Inloggen
            </button>
          </form>

          {wrongPassword && (
            <p className="error">
              Het ingevoerde wachtwoord is niet correct.
            </p>
          )}

          {configurationError && (
            <p className="error">
              De personeelslogin is nog niet correct geconfigureerd.
            </p>
          )}
        </section>
      </main>
    </>
  );
}
