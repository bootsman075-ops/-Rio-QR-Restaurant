type LoginCardProps = {
  title: string;
  subtitle: string;
  action: (formData: FormData) => Promise<void>;
  error?: string;
};

export default function LoginCard({
  title,
  subtitle,
  action,
  error,
}: LoginCardProps) {
  const wrongCredentials = error === "credentials";
  const noAccess = error === "access";

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
          margin: 14px 0 8px;
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
          margin-top: 20px;
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
          <p className="eyebrow">vantorstudio Restaurant Platform</p>

          <h1>{title}</h1>

          <p className="subtitle">{subtitle}</p>

          <form action={action}>
            <label htmlFor="email">E-mailadres</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              autoFocus
            />

            <label htmlFor="password">Wachtwoord</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />

            <button type="submit">Inloggen</button>
          </form>

          {wrongCredentials && (
            <p className="error">E-mailadres of wachtwoord is niet correct.</p>
          )}

          {noAccess && (
            <p className="error">
              Dit account is nog niet aan een restaurant of platformrol gekoppeld.
            </p>
          )}
        </section>
      </main>
    </>
  );
}
