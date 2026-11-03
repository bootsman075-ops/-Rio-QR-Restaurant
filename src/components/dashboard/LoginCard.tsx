import Image from "next/image";
import Link from "next/link";

import PasswordField from "./PasswordField";
import styles from "./LoginCard.module.css";

type LoginCardProps = {
  title: string;
  subtitle: string;
  action: (formData: FormData) => Promise<void>;
  error?: string;
  note?: string;
};

export default function LoginCard({
  title,
  subtitle,
  action,
  error,
  note = "Beveiligde toegang voor geregistreerde medewerkers.",
}: LoginCardProps) {
  const wrongCredentials = error === "credentials";
  const noAccess = error === "access";

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="rio-login-title">
        <header className={styles.brand}>
          <Image
            src="/rio-logo.png"
            width={267}
            height={127}
            priority
            alt="Rio Deventer — ESTA 2025"
            className={styles.logo}
          />
        </header>

        <div className={styles.content}>
          <div className={styles.eyebrow}>
            <span aria-hidden="true" className={styles.eyebrowLine} />
            <span>Vantor Studio Restaurant Platform</span>
            <span aria-hidden="true" className={styles.eyebrowLine} />
          </div>

          <h1 id="rio-login-title" className={styles.heading}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>

          <form action={action} className={styles.form}>
            <div className={styles.fieldGroup}>
              <label htmlFor="rio-login-email" className={styles.label}>E-mailadres</label>
              <div className={styles.field}>
                <svg className={styles.fieldIcon} aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2.5" y="5" width="19" height="14" rx="2.4" />
                  <path d="m3.5 7 8.5 6 8.5-6" />
                </svg>
                <input
                  id="rio-login-email"
                  name="email"
                  type="email"
                  placeholder="e-mailadres@restaurant.nl"
                  autoComplete="email"
                  inputMode="email"
                  spellCheck={false}
                  autoCapitalize="none"
                  required
                  className={styles.input}
                />
              </div>
            </div>

            <PasswordField />

            <button type="submit" className={styles.submit}>
              Inloggen
            </button>
          </form>

          <Link href="/forgot-password" className={styles.forgot}>
            Wachtwoord vergeten?
          </Link>

          {(wrongCredentials || noAccess) && (
            <p role="alert" className={styles.error}>
              {wrongCredentials
                ? "Inloggen is niet gelukt. Controleer je gegevens en probeer het opnieuw."
                : "Dit account heeft geen toegang tot deze omgeving. Neem contact op met de beheerder."}
            </p>
          )}

          <div className={styles.footer}>
            <div className={styles.footerRule}>
              <span aria-hidden="true" />
              <svg aria-hidden="true" viewBox="0 0 40 28" width="35" height="25" fill="none" stroke="currentColor" strokeWidth="1.3">
                <path d="M4 21h32M9 19a11 11 0 0 1 22 0H9ZM20 6V4m-3 0h6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span aria-hidden="true" />
            </div>
            <p>{note}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
