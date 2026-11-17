"use client";

import { useActionState, useRef, useState } from "react";
import type { FormEvent } from "react";

import { INITIAL_BOOKING_RESULT, requestPublicReservation } from "./actions";

type Props = {
  restaurantSlug: string;
  today: string;
  tomorrow: string;
  maxDate: string;
  bookingEnabled: boolean;
  heroImageUrl: string | null;
};

function CalendarIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="15" rx="2"/><path d="M7.5 3v5M16.5 3v5M3.5 10h17"/></svg>;
}
function ClockIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>;
}
function GuestsIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 14c2 .6 3 2.1 3 4v2"/></svg>;
}

export default function BookingExperience({
  restaurantSlug, today, tomorrow, maxDate, bookingEnabled, heroImageUrl,
}: Props) {
  const [result, submitAction, isPending] = useActionState(
    requestPublicReservation, INITIAL_BOOKING_RESULT,
  );
  const [step, setStep] = useState(1);
  const [date, setDate] = useState(tomorrow);
  const [time, setTime] = useState("19:00");
  const [guests, setGuests] = useState("2");
  const formRef = useRef<HTMLFormElement>(null);
  const safeImage = heroImageUrl || "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1100&q=85";

  function goToContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formRef.current?.reportValidity()) return;
    setStep(2);
  }

  return (
    <main className="rio-booking">
      <div className="rio-booking-scene">
        <div className="rio-booking-shell">
          <div className="rio-booking-hero" style={{
            backgroundImage: "linear-gradient(180deg, rgba(22,13,8,.16) 0%, rgba(23,13,7,.36) 31%, rgba(18,11,7,.96) 100%), url(" + JSON.stringify(safeImage) + ")",
          }}>
            <div className="rio-booking-brand">
              <span className="rio-booking-brand-line" />
              <span className="rio-booking-logo">R.I.O.</span>
              <span className="rio-booking-brand-line" />
            </div>
            <div className="rio-booking-hero-copy">
              <p className="rio-booking-eyebrow">Een avond om van te genieten</p>
              <h1>Reserveer<br />een tafel</h1>
              <div className="rio-booking-title-rule" />
              <p>Geniet van verfijnde gerechten, warme gastvrijheid en een sfeervolle avond aan de IJssel.</p>
            </div>
          </div>

          <div className="rio-booking-panel">
            {result.status === "sent" ? (
              <div className="rio-booking-result" role="status">
                <div className="rio-booking-result-symbol" aria-hidden="true">✓</div>
                <h2>Aanvraag ontvangen</h2>
                <p>{result.message}</p>
                <p className="rio-booking-fine">Bewaar de gekozen datum en tijd. Er is nog geen tafel gegarandeerd.</p>
                <a className="rio-booking-back" href="/reserveren/rio-deventer">Terug naar reserveren</a>
              </div>
            ) : (
              <>
                <div className="rio-booking-progress" aria-label="Reserveringsstappen">
                  <span className={step === 1 ? "active" : "complete"}>01 <strong>Tafel kiezen</strong></span>
                  <span className="rio-booking-progress-rule" />
                  <span className={step === 2 ? "active" : ""}>02 <strong>Gegevens</strong></span>
                </div>
                {!bookingEnabled ? (
                  <p className="rio-booking-offline" role="alert">
                    Online reserveren is tijdelijk niet beschikbaar. Probeer het later opnieuw.
                  </p>
                ) : null}
                <form
                  ref={formRef}
                  action={submitAction}
                  onSubmit={step === 1 ? goToContact : undefined}
                  className="rio-booking-form"
                >
                  <input type="hidden" name="restaurant_slug" value={restaurantSlug} />
                  <div className="rio-booking-honeypot" aria-hidden="true">
                    <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
                  </div>
                  {step === 1 ? (
                    <>
                      <label className="rio-booking-field rio-booking-wide">
                        <span>Datum</span>
                        <span className="rio-booking-control">
                          <CalendarIcon />
                          <input aria-label="Datum" required type="date" name="date" min={today} max={maxDate} value={date} onChange={(e) => setDate(e.target.value)} />
                        </span>
                      </label>
                      <div className="rio-booking-fields-row">
                        <label className="rio-booking-field">
                          <span>Tijd</span>
                          <span className="rio-booking-control">
                            <ClockIcon />
                            <input aria-label="Tijd" required type="time" name="time" min="12:00" max="22:30" step={1800} value={time} onChange={(e) => setTime(e.target.value)} />
                          </span>
                        </label>
                        <label className="rio-booking-field">
                          <span>Aantal gasten</span>
                          <span className="rio-booking-control">
                            <GuestsIcon />
                            <select aria-label="Aantal gasten" name="party_size" value={guests} onChange={(e) => setGuests(e.target.value)}>
                              {Array.from({ length: 12 }, (_, i) => i + 1).map((count) => (
                                <option key={count} value={count}>{count} {count === 1 ? "gast" : "gasten"}</option>
                              ))}
                            </select>
                          </span>
                        </label>
                      </div>
                      <button className="rio-booking-primary" disabled={!bookingEnabled} type="submit">
                        Verder met reserveren <span aria-hidden="true">→</span>
                      </button>
                      <p className="rio-booking-fine">Het gekozen tijdstip is een voorkeur, geen gegarandeerde beschikbaarheid.</p>
                    </>
                  ) : (
                    <>
                      <input type="hidden" name="date" value={date} />
                      <input type="hidden" name="time" value={time} />
                      <input type="hidden" name="party_size" value={guests} />
                      <p className="rio-booking-selection">
                        <span>Je aanvraag</span>
                        <strong>{new Intl.DateTimeFormat("nl-NL", { dateStyle: "long", timeZone: "UTC" }).format(new Date(date + "T12:00:00Z"))} · {time} · {guests} {guests === "1" ? "gast" : "gasten"}</strong>
                      </p>
                      <label className="rio-booking-field rio-booking-wide">
                        <span>Naam</span>
                        <input className="rio-booking-text-input" name="guest_name" maxLength={120} minLength={2} autoComplete="name" placeholder="Voor- en achternaam" required />
                      </label>
                      <label className="rio-booking-field rio-booking-wide">
                        <span>E-mailadres</span>
                        <input className="rio-booking-text-input" name="guest_email" type="email" maxLength={254} autoComplete="email" placeholder="naam@voorbeeld.nl" required />
                      </label>
                      <label className="rio-booking-field rio-booking-wide">
                        <span>Telefoonnummer</span>
                        <input className="rio-booking-text-input" name="guest_phone" type="tel" maxLength={30} autoComplete="tel" placeholder="+31 6 ..." required />
                      </label>
                      <label className="rio-booking-field rio-booking-wide">
                        <span>Opmerking <em>(optioneel)</em></span>
                        <textarea className="rio-booking-text-input" name="notes" rows={2} maxLength={500} placeholder="Bijzonderheden of wensen" />
                      </label>
                      <button className="rio-booking-primary" type="submit" disabled={!bookingEnabled || isPending}>
                        {isPending ? "Aanvraag versturen…" : "Reserveringsaanvraag versturen"}
                        <span aria-hidden="true">→</span>
                      </button>
                      <button className="rio-booking-secondary" type="button" onClick={() => setStep(1)}>← Terug naar datum en tijd</button>
                      <p className="rio-booking-fine">De aanvraag wordt zichtbaar voor het restaurant. Bevestiging volgt afzonderlijk.</p>
                    </>
                  )}
                  {result.status === "error" && (
                    <p className="rio-booking-error" role="alert">{result.message}</p>
                  )}
                </form>
              </>
            )}
          </div>
          <footer className="rio-booking-footer">
            <span>R.I.O. · Deventer</span>
            <span>Reserveringen via Rio QR</span>
          </footer>
        </div>
      </div>
    </main>
  );
}
