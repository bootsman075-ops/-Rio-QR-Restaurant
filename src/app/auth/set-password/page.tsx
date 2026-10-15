import Link from "next/link";
import { setInvitedUserPassword } from "./actions";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ token_hash?: string; type?: string }>;
};

export default async function SetPasswordPage({ searchParams }: Props) {
  const params = await searchParams;
  const tokenHash = params.token_hash ?? "";
  const hasInviteToken =
    params.type === "invite" && /^[A-Za-z0-9_-]{16,512}$/.test(tokenHash);

  return (
    <main className="min-h-screen bg-[#f3efe5] px-6 py-16 text-[#171714]">
      <meta name="referrer" content="no-referrer" />
      <section className="mx-auto w-full max-w-md rounded-3xl bg-[#fffdf8] p-8">
        <h1 className="text-3xl font-medium">Restaurantaccount activeren</h1>
        <p className="mt-3 text-sm">Gebruik de persoonlijke uitnodigingslink uit je e-mail.</p>
        {hasInviteToken ? (
          <form action={setInvitedUserPassword} className="mt-7 space-y-4">
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
              Account activeren
            </button>
          </form>
        ) : (
          <p role="alert" className="mt-6 text-sm">
            De uitnodigingscode ontbreekt of is ongeldig. Vraag een nieuwe uitnodiging aan.
          </p>
        )}
        <Link href="/login" referrerPolicy="no-referrer"
          className="mt-6 inline-block text-sm font-bold underline">
          Terug naar inloggen
        </Link>
      </section>
    </main>
  );
}
