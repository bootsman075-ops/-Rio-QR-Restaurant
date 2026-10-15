import Link from "next/link";
import { redirect } from "next/navigation";

import { logout } from "@/components/dashboard/auth-actions";
import { getStaffContext } from "@/lib/staff-session";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Continue a completed MFA login to the dashboard for the verified account.
 * This is never an authorization shortcut: getStaffContext validates the
 * session's AAL2 assurance and checks the active tenant membership.
 */
export default async function ContinueLoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const context = await getStaffContext();

  if (context) {
    redirect(
      context.role === "platform_admin"
        ? "/platform"
        : context.role === "staff"
          ? "/staff"
          : "/management",
    );
  }

  // The user is signed in, but has no active authorized role. Explicitly
  // explain this instead of silently looping back to the password screen.
  return (
    <main className="min-h-screen bg-[#f3efe5] px-6 py-16 text-[#171714]">
      <section className="mx-auto max-w-md rounded-3xl bg-[#fffdf8] p-8 shadow-lg">
        <p className="text-xs font-bold uppercase tracking-widest text-[#a87c36]">
          Rio QR Restaurant
        </p>
        <h1 className="mt-3 text-3xl font-medium">Ingelogd, maar nog geen toegang</h1>
        <p className="mt-4 text-sm leading-6">
          Je account is aangemeld, maar een actieve restaurant- of platformrol
          kon niet worden bevestigd. Je gegevens blijven afgeschermd.
          Vraag de platformbeheerder om je restaurantkoppeling te controleren.
        </p>
        <Link className="mt-6 inline-block font-semibold underline" href="/security/mfa">
          Mijn accountbeveiliging bekijken
        </Link>
        <form action={logout} className="mt-6">
          <button className="rounded-xl bg-[#171714] px-5 py-3 font-bold text-white">
            Uitloggen
          </button>
        </form>
      </section>
    </main>
  );
}
