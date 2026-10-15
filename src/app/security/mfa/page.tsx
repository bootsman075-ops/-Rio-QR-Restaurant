"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type Factor = { id: string; friendly_name?: string | null };
type Enrollment = { id: string; qrCode: string; secret: string };

const RECOVERY_CODES_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_RECOVERY_CODES === "true";

export default function SecurityMfaPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loaded, setLoaded] = useState(false);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [factorId, setFactorId] = useState("");
  const [aal2, setAal2] = useState(false);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      window.location.replace("/login");
      return;
    }

    const [factorResult, assuranceResult] = await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);

    if (factorResult.error || assuranceResult.error) {
      setMessage("Beveiligingsgegevens konden niet worden geladen. Probeer het opnieuw.");
      setLoaded(true);
      return;
    }

    const verified = factorResult.data.totp.map((factor) => ({
      id: factor.id,
      friendly_name: factor.friendly_name,
    }));

    setFactors(verified);
    setFactorId((previous) =>
      verified.some((factor) => factor.id === previous)
        ? previous
        : (verified[0]?.id ?? ""),
    );
    setAal2(assuranceResult.data.currentLevel === "aal2");
    setLoaded(true);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  async function verifyTotp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const targetId = enrollment?.id ?? factorId;
    if (!targetId || !/^\d{6}$/.test(code.trim())) {
      setMessage("Vul de zes cijfers uit je authenticator-app in.");
      return;
    }

    setBusy(true);
    setMessage("");
    const result = await supabase.auth.mfa.challengeAndVerify({
      factorId: targetId,
      code: code.trim(),
    });
    setBusy(false);
    if (result.error) {
      setMessage("De code is niet geldig of verlopen. Gebruik een nieuwe code.");
      return;
    }

    setCode("");
    setEnrollment(null);
    setMessage("Tweestapsverificatie gelukt. Je account is nu beveiligd.");
    await load();
  }

  async function startEnrollment() {
    if (factors.length > 0 && !aal2) {
      setMessage("Bevestig eerst je bestaande authenticator voordat je een nieuwe toevoegt.");
      return;
    }

    setBusy(true);
    setMessage("");
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: factors.length ? "Rio QR reserve-authenticator" : "Rio QR authenticator",
    });
    setBusy(false);

    if (error || !data?.totp) {
      setMessage("Instellen van de authenticator is mislukt. Probeer het opnieuw.");
      return;
    }

    setEnrollment({
      id: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    });
    setCode("");
  }

  async function useRecoveryCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!RECOVERY_CODES_ENABLED) return;

    setBusy(true);
    setMessage("");
    const result = await supabase.auth.mfa.recoveryCodes.verify({
      code: recoveryCode.trim(),
    });
    setBusy(false);

    if (result.error) {
      setMessage("Herstelcode ongeldig of al gebruikt.");
      return;
    }

    setRecoveryCode("");
    setShowRecovery(false);
    setMessage("Herstelcode geaccepteerd. Deze code kan niet opnieuw worden gebruikt.");
    await load();
  }

  async function generateRecoveryCodes() {
    if (!RECOVERY_CODES_ENABLED || !aal2) return;

    setBusy(true);
    setMessage("");
    const { data, error } = await supabase.auth.mfa.recoveryCodes.generate();
    setBusy(false);

    if (error || !data?.codes) {
      setMessage("Herstelcodes zijn niet beschikbaar op deze server. Gebruik een reserve-authenticator.");
      return;
    }

    // Plaintext codes exist in memory only and disappear when leaving this page.
    setRecoveryCodes(data.codes);
    setMessage("Bewaar deze codes nu veilig. Je kunt ze later niet opnieuw bekijken.");
  }

  const canEnroll = factors.length === 0 || aal2;
  const showVerification = !!enrollment || (!aal2 && factors.length > 0);

  return (
    <main className="min-h-screen bg-[#f3efe5] px-5 py-12 text-[#171714]">
      <section className="mx-auto w-full max-w-lg rounded-3xl border border-black/10 bg-[#fffdf8] p-7 shadow-lg">
        <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-[#a87c36]">
          Rio QR Restaurant
        </p>
        <h1 className="text-3xl font-semibold">Accountbeveiliging</h1>
        <p className="mt-3 text-sm leading-6 text-[#6b675e]">
          Voor alle platform- en restaurantaccounts is een authenticator-app verplicht.
          Logins zonder tweede factor krijgen geen toegang tot beheergegevens.
        </p>

        {!loaded ? <p className="mt-5">Beveiliging controleren...</p> : null}

        {loaded && aal2 ? (
          <p className="mt-5 rounded-xl bg-[#edf6ed] p-3 text-sm">
            Tweestapsverificatie bevestigd. <Link href="/login" className="font-bold underline">Naar je dashboard</Link>
          </p>
        ) : null}

        {loaded && canEnroll && !enrollment ? (
          <div className="mt-5">
            <button
              type="button"
              onClick={startEnrollment}
              disabled={busy}
              className="w-full rounded-xl bg-[#171714] px-4 py-3 font-semibold text-white disabled:opacity-50"
            >
              {factors.length ? "Reserve-authenticator toevoegen" : "Authenticator instellen"}
            </button>
            <p className="mt-2 text-xs text-[#6b675e]">
              Gebruik een authenticator-app. Bewaar je tweede factor op een ander apparaat.
            </p>
          </div>
        ) : null}

        {enrollment ? (
          <div className="mt-5 space-y-3">
            <h2 className="text-lg font-bold">Scan deze QR-code</h2>
            {/* Auth levert deze QR rechtstreeks aan de ingelogde gebruiker. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={enrollment.qrCode} alt="QR-code voor authenticator" className="h-44 w-44" />
            <p className="text-xs">Lukt scannen niet? Voeg deze sleutel handmatig toe:</p>
            <code className="block break-all rounded-lg bg-[#f3efe5] p-3 text-sm">{enrollment.secret}</code>
          </div>
        ) : null}

        {loaded && showVerification ? (
          <form onSubmit={verifyTotp} className="mt-6 space-y-3">
            {factors.length > 1 && !enrollment ? (
              <label className="block text-sm font-semibold">
                Authenticator kiezen
                <select
                  className="mt-2 w-full rounded-xl border p-3"
                  value={factorId}
                  onChange={(event) => setFactorId(event.target.value)}
                >
                  {factors.map((factor, index) => (
                    <option key={factor.id} value={factor.id}>
                      {factor.friendly_name || `Authenticator ${index + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="block text-sm font-semibold">
              Zescijferige code
              <input
                inputMode="numeric"
                pattern="[0-9]{6}"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="mt-2 w-full rounded-xl border border-black/20 bg-white p-3"
                required
              />
            </label>
            <button type="submit" disabled={busy} className="w-full rounded-xl bg-[#171714] p-3 font-bold text-white disabled:opacity-50">
              Code controleren
            </button>
          </form>
        ) : null}

        {loaded && !aal2 && factors.length > 0 && RECOVERY_CODES_ENABLED ? (
          <div className="mt-5">
            <button type="button" className="text-sm font-bold underline" onClick={() => setShowRecovery(!showRecovery)}>
              Ik heb een eenmalige herstelcode
            </button>
            {showRecovery ? (
              <form className="mt-3 space-y-3" onSubmit={useRecoveryCode}>
                <label className="block text-sm">
                  Herstelcode
                  <input
                    autoComplete="off"
                    value={recoveryCode}
                    onChange={(event) => setRecoveryCode(event.target.value)}
                    className="mt-2 w-full rounded-xl border p-3"
                    required
                  />
                </label>
                <button type="submit" disabled={busy} className="w-full rounded-xl bg-[#171714] p-3 text-white">
                  Eenmalige code gebruiken
                </button>
              </form>
            ) : null}
          </div>
        ) : null}

        {loaded && aal2 && RECOVERY_CODES_ENABLED ? (
          <div className="mt-6 border-t border-black/10 pt-5">
            <h2 className="text-lg font-bold">Eenmalige herstelcodes</h2>
            <p className="mt-1 text-sm">Een nieuwe set vervangt eventueel eerder gemaakte codes.</p>
            <button type="button" disabled={busy} onClick={generateRecoveryCodes} className="mt-3 rounded-xl border border-black/25 px-4 py-3 font-semibold">
              Nieuwe herstelcodes maken
            </button>
            {recoveryCodes ? (
              <div className="mt-4 rounded-xl bg-[#f3efe5] p-4">
                <strong className="text-sm">Sla ze nu op in een wachtwoordkluis:</strong>
                <ul className="mt-2 space-y-1 font-mono text-sm">
                  {recoveryCodes.map((value, index) => (
                    <li key={index}>{value}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {message ? <p role="status" className="mt-5 rounded-xl bg-[#f3efe5] p-3 text-sm">{message}</p> : null}
        <p className="mt-7 text-xs text-[#6b675e]">
          Beveiligingscodes zijn persoonlijk. Deel ze nooit via WhatsApp of e-mail.
        </p>
      </section>
    </main>
  );
}
