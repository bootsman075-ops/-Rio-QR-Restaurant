import Link from "next/link";

import { resetPasswordWithRecoveryToken } from "./actions";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ token_hash?: string; type?: string }>;
};

// A normal signed-in session is NOT proof of account recovery.
// The token is validated and consumed by the server action upon submission.
export default async function ResetPasswordPage({ searchParams }: Props) {
  const params = await searchParams;
  const tokenHash = params.token_hash ?? "";
  const hasRecoveryToken =
    params.type === "recovery" && /^[A-Za-z0-9_-]{16,512}$/.test(tokenHash);

  return (
    <main className="min-h-screen bg-[#f3efe5] px-6 py-16 text-[#171714]">
      <meta name="referrer" content="no-referrer" />
      <section className="mx-auto w-full max-w-md rounded-[28px] border border-black/10 bg-[#fffdf8] p-8 shadow-lg">
        <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.16em] text-[#a87c36]">
          Rio QR Restaurant
        </p>
        <h1 className="text-3xl font-medium">Nieuw wachtwoord instellen</h1>
        <p className="mt-3 text-sm leading-6 text-[#777267]">
          Je kunt je wachtwoord uitsluitend wijzigen via je persoonlijke herstelmail.
        </p>
        {hasRecoveryToken ? (
          <form action={resetPasswordWithRecoveryToken} className="mt-6 space-y-4">
            <input type="hidden" name="token_hash" value={tokenHash} />
            <label htmlFor="password" className="block text-sm font-bold">
              Nieuw wachtwoord (minimaal 12 tekens)
            </label>
            <input id="password" name="password" type="password" minLength={12}
              autoComplete="new-password" required
              className="h-12 w-full rounded-xl border border-black/15 bg-white px-4" />
            <label htmlFor="confirm_password" className="block text-sm font-bold">
              Herhaal wachtwoord
            </label>
            <input id="confirm_password" name="confirm_password" type="password"
              minLength={12} autoComplete="new-password" required
              className="h-12 w-full rounded-xl border border-black/15 bg-white px-4" />
            <button type="submit"
              className="h-12 w-full rounded-xl bg-[#171714] font-bold text-white">
              Wachtwoord wijzigen
            </button>
          </form>
        ) : (
          <p role="alert" className="mt-6 text-sm">
            De herstelcode ontbreekt of is ongeldig. Vraag een nieuwe herstelmail aan.
          </p>
        )}
        <Link href="/forgot-password" referrerPolicy="no-referrer"
          className="mt-6 inline-block text-sm font-bold underline">
          Nieuwe herstelmail aanvragen
        </Link>
      </section>
    </main>
  );
}
