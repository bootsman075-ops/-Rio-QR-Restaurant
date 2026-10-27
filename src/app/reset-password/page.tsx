import Link from "next/link";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { resetPasswordWithRecoveryToken } from "./actions";
import { resetPasswordFromRecoverySession } from "./session-actions";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ token_hash?: string; type?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: Props) {
  const params = await searchParams;
  const tokenHash = params.token_hash ?? "";
  const hasRecoveryToken =
    params.type === "recovery" && /^[A-Za-z0-9_-]{16,512}$/.test(tokenHash);

  const cookieStore = await cookies();
  const hasRecoveryCookie = cookieStore.get("rio_recovery_flow")?.value === "1";

  let hasRecoverySession = false;

  if (!hasRecoveryToken && hasRecoveryCookie) {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    hasRecoverySession = !error && !!user;
  }

  const canReset = hasRecoveryToken || hasRecoverySession;
  const resetAction = hasRecoveryToken
    ? resetPasswordWithRecoveryToken
    : resetPasswordFromRecoverySession;

  return (
    <main className="min-h-screen bg-[#f3efe5] px-6 py-16 text-[#171714]">
      <meta name="referrer" content="no-referrer" />
      <section className="mx-auto w-full max-w-md rounded-[28px] border border-black/10 bg-[#fffdf8] p-8 shadow-lg">
        <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.16em] text-[#a87c36]">
          Rio QR Restaurant
        </p>
        <h1 className="text-3xl font-medium">Nieuw wachtwoord instellen</h1>
        <p className="mt-3 text-sm leading-6 text-[#777267]">
          Kies een sterk nieuw wachtwoord voor je account.
        </p>

        {canReset ? (
          <form action={resetAction} className="mt-6 space-y-4">
            {hasRecoveryToken ? (
              <input type="hidden" name="token_hash" value={tokenHash} />
            ) : null}

            <label htmlFor="password" className="block text-sm font-bold">
              Nieuw wachtwoord (minimaal 12 tekens)
            </label>
            <input
              id="password"
              name="password"
              type="password"
              minLength={12}
              autoComplete="new-password"
              required
              className="h-12 w-full rounded-xl border border-black/15 bg-white px-4"
            />

            <label htmlFor="confirm_password" className="block text-sm font-bold">
              Herhaal wachtwoord
            </label>
            <input
              id="confirm_password"
              name="confirm_password"
              type="password"
              minLength={12}
              autoComplete="new-password"
              required
              className="h-12 w-full rounded-xl border border-black/15 bg-white px-4"
            />

            <button
              type="submit"
              className="h-12 w-full rounded-xl bg-[#171714] font-bold text-white"
            >
              Wachtwoord wijzigen
            </button>
          </form>
        ) : (
          <p role="alert" className="mt-6 rounded-xl bg-[#fff1ef] p-4 text-sm">
            De herstelcode ontbreekt, is verlopen of is al gebruikt. Vraag een nieuwe herstelmail aan.
          </p>
        )}

        <Link
          href="/forgot-password"
          referrerPolicy="no-referrer"
          className="mt-6 inline-block text-sm font-bold underline"
        >
          Nieuwe herstelmail aanvragen
        </Link>
      </section>
    </main>
  );
}
