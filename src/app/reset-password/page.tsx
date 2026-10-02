"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type Status = "loading" | "ready" | "saving" | "success" | "error";

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    let active = true;

    async function prepareRecoverySession() {
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);

      const errorDescription = params.get("error_description");
      if (errorDescription) {
        if (active) {
          setMessage(errorDescription.replaceAll("+", " "));
          setStatus("error");
        }
        return;
      }

      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          if (active) {
            setMessage("Deze resetlink is ongeldig of verlopen. Vraag een nieuwe resetmail aan.");
            setStatus("error");
          }
          return;
        }

        window.history.replaceState({}, document.title, "/reset-password");
        if (active) setStatus("ready");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        if (active) setStatus("ready");
      } else if (active) {
        setMessage("Deze resetlink is ongeldig of verlopen. Vraag een nieuwe resetmail aan.");
        setStatus("error");
      }
    }

    prepareRecoverySession();

    return () => {
      active = false;
    };
  }, [supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 8) {
      setMessage("Gebruik minimaal 8 tekens voor je nieuwe wachtwoord.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("De twee wachtwoorden zijn niet gelijk.");
      return;
    }

    setStatus("saving");
    setMessage("");

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage(error.message || "Het wachtwoord kon niet worden gewijzigd.");
      setStatus("ready");
      return;
    }

    await supabase.auth.signOut();
    setStatus("success");
  }

  return (
    <main className="min-h-screen bg-[#f3efe5] px-6 py-16 text-[#171714]">
      <section className="mx-auto w-full max-w-md rounded-[28px] border border-black/10 bg-[#fffdf8] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.05)]">
        <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.16em] text-[#a87c36]">
          vantorstudio Restaurant Platform
        </p>
        <h1 className="text-4xl font-medium tracking-[-0.04em]">
          Nieuw wachtwoord
        </h1>

        {status === "loading" && (
          <p className="mt-5 text-sm leading-6 text-[#777267]">
            Resetlink controleren...
          </p>
        )}

        {status === "error" && (
          <div className="mt-6">
            <p className="rounded-xl bg-[#fff1ef] px-4 py-3 text-sm">
              {message}
            </p>
            <Link
              href="/login"
              className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#171714] font-bold text-white"
            >
              Terug naar inloggen
            </Link>
          </div>
        )}

        {(status === "ready" || status === "saving") && (
          <form onSubmit={handleSubmit} className="mt-7">
            <label htmlFor="password" className="mb-2 block text-sm font-bold">
              Nieuw wachtwoord
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              className="h-13 w-full rounded-xl border border-black/15 bg-white px-4 text-base outline-none focus:border-[#a87c36]"
            />

            <label htmlFor="confirmPassword" className="mb-2 mt-4 block text-sm font-bold">
              Herhaal wachtwoord
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={8}
              className="h-13 w-full rounded-xl border border-black/15 bg-white px-4 text-base outline-none focus:border-[#a87c36]"
            />

            {message && (
              <p className="mt-4 rounded-xl bg-[#fff1ef] px-4 py-3 text-sm">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "saving"}
              className="mt-5 h-13 w-full rounded-xl bg-[#171714] font-extrabold text-white disabled:opacity-60"
            >
              {status === "saving" ? "Opslaan..." : "Wachtwoord wijzigen"}
            </button>
          </form>
        )}

        {status === "success" && (
          <div className="mt-6">
            <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm">
              Je wachtwoord is gewijzigd. Je kunt nu opnieuw inloggen.
            </p>
            <Link
              href="/login"
              className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#171714] font-bold text-white"
            >
              Naar inloggen
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
