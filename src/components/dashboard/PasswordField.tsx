"use client";

import { useState } from "react";

import styles from "./LoginCard.module.css";

export default function PasswordField() {
  const [visible, setVisible] = useState(false);

  return (
    <div className={styles.fieldGroup}>
      <label htmlFor="rio-login-password" className={styles.label}>
        Wachtwoord
      </label>
      <div className={styles.field}>
        <svg className={styles.fieldIcon} aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="10.5" width="16" height="11" rx="2" />
          <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
        </svg>
        <input
          id="rio-login-password"
          name="password"
          type={visible ? "text" : "password"}
          placeholder="Voer je wachtwoord in"
          autoComplete="current-password"
          className={styles.input}
          required
        />
        <button
          className={styles.visibility}
          type="button"
          aria-label={visible ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? (
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3l18 18M10.5 5.2A10.6 10.6 0 0 1 12 5c5.2 0 8.8 5 9.5 6-.3.8-1.5 2.5-3.2 3.8M6.1 6.1C3.8 7.6 2.6 10 2.5 11c.7 1.7 4.3 6 9.5 6 1.1 0 2.1-.2 3.1-.5M9.9 9.9a3 3 0 0 0 4.2 4.2" />
            </svg>
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
