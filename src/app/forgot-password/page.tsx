"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setMessage("");

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/reset-password` },
    );

    setSending(false);

    if (error) {
      setMessage(
        error.status === 429
          ? "Er zijn te veel verzoeken verstuurd. Wacht een paar minuten en probeer het daarna opnieuw."
          : "De resetmail kon niet worden verstuurd. Probeer het opnieuw.",
      );
      return;
    }

    setMessage(
      "De resetmail is verstuurd. Open alleen de nieuwste e-mail en klik één keer op de resetlink.",
    );
  }

  return (
    <main className="min-h-screen bg-[#f3efe5] px-6 py-16 text-[#171714]">
      <section className="mx-auto w-full max-w-md rounded-[28px] border border-black/10 bg-[#fffdf8] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.05)]">
        <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.16em] text-[#a87c36]">
          vantorstudio Restaurant Platform
        </p>
        <h1 className="text-4xl font-medium tracking-[-0.04em]">
          Wachtwoord vergeten
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#777267]">
          Vul je e-mailadres in. Je ontvangt een nieuwe, eenmalige resetlink.
        </p>

        <form onSubmit={handleSubmit} className="mt-7">
          <label htmlFor="email" className="mb-2 block text-sm font-bold">
            E-mailadres
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-13 w-full rounded-xl border border-black/15 bg-white px-4 text-base outline-none focus:border-[#a87c36]"
          />

          {message && (
            <p className="mt-4 rounded-xl bg-[#f6f0e4] px-4 py-3 text-sm">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={sending}
            className="mt-5 h-13 w-full rounded-xl bg-[#171714] font-extrabold text-white disabled:opacity-60"
          >
            {sending ? "Versturen..." : "Resetmail versturen"}
          </button>
        </form>

        <Link
          href="/login"
          className="mt-5 inline-flex w-full items-center justify-center text-sm font-bold underline underline-offset-4"
        >
          Terug naar inloggen
        </Link>
      </section>
    </main>
  );
}
