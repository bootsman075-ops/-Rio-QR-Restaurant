"use server";

import { createHmac } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { addDays, isValidDate, isValidTime, todayInZone, zonedToIso } from "@/lib/reservations";
import { createAdminClient } from "@/lib/supabase/admin";

export type BookingResult = {
  status: "idle" | "error" | "sent";
  message: string;
};
export const INITIAL_BOOKING_RESULT: BookingResult = { status: "idle", message: "" };

const RIO_SLUG = "rio-deventer";
const TIME_ZONE = "Europe/Amsterdam";

function readText(form: FormData, name: string) {
  const v = form.get(name);
  return typeof v === "string" ? v.trim() : "";
}

export async function requestPublicReservation(
  _previousState: BookingResult,
  formData: FormData,
): Promise<BookingResult> {
  const fail = (message: string): BookingResult => ({ status: "error", message });

  // No user-supplied restaurant ID, table ID, status or permissions are accepted.
  if (readText(formData, "restaurant_slug") !== RIO_SLUG) {
    return fail("Deze reserveringspagina is niet beschikbaar.");
  }
  // Hidden bot-trap: no database mutation for automated spam.
  if (readText(formData, "website")) {
    return fail("Je aanvraag kon niet worden verwerkt.");
  }

  const date = readText(formData, "date");
  const time = readText(formData, "time");
  const partySizeText = readText(formData, "party_size");
  const partySize = Number(partySizeText);
  const guestName = readText(formData, "guest_name");
  const email = readText(formData, "guest_email").toLowerCase();
  const phone = readText(formData, "guest_phone");
  const notes = readText(formData, "notes");
  // Must be expressly checked: first name is visible to anyone scanning the table QR.
  const showNameOnTableQr = formData.get("show_name_on_table_qr") === "on";

  if (!isValidDate(date) || !isValidTime(time)) {
    return fail("Kies een geldige datum en tijd.");
  }
  const today = todayInZone(TIME_ZONE);
  if (date < today || date > addDays(today, 90)) {
    return fail("Kies een datum binnen de komende 90 dagen.");
  }
  const startsAt = zonedToIso(date, time, TIME_ZONE);
  if (!startsAt || new Date(startsAt).getTime() < Date.now() + 60 * 60 * 1000) {
    return fail("Kies een tijdstip dat minimaal één uur in de toekomst ligt.");
  }
  if (!partySizeText || !Number.isInteger(partySize) || partySize < 1 || partySize > 12) {
    return fail("Kies een gezelschap van 1 tot 12 gasten.");
  }
  if (guestName.length < 2 || guestName.length > 120) {
    return fail("Vul je naam in (2 tot 120 tekens).");
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail("Vul een geldig e-mailadres in.");
  }
  if (phone.length < 6 || phone.length > 30 || !/^[+0-9()\s-]+$/.test(phone)) {
    return fail("Vul een geldig telefoonnummer in.");
  }
  if (notes.length > 500) {
    return fail("De toelichting mag maximaal 500 tekens bevatten.");
  }

  try {
    const admin = createAdminClient();
    const { data: restaurant, error: restaurantError } = await admin
      .from("restaurants")
      .select("id, is_active")
      .eq("slug", RIO_SLUG)
      .eq("is_active", true)
      .maybeSingle();
    if (restaurantError || !restaurant) {
      return fail("Reserveringen zijn tijdelijk niet beschikbaar. Probeer later opnieuw.");
    }

    // Prevent accidental double submission for an identical contact/time.
    const { data: duplicate, error: duplicateError } = await admin
      .from("reservations")
      .select("id")
      .eq("restaurant_id", restaurant.id)
      .eq("guest_email", email)
      .eq("starts_at", startsAt)
      .gte("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .limit(1);
    if (duplicateError) {
      return fail("We kunnen je aanvraag nu niet controleren. Probeer later opnieuw.");
    }
    if (duplicate && duplicate.length > 0) {
      return {
        status: "sent",
        message: "We hebben voor dit tijdstip al een recente aanvraag van je ontvangen. Wacht op een reactie van het restaurant.",
      };
    }

    // Vercel overwrites x-forwarded-for, so attackers cannot supply arbitrary
    // client IPs through the public hosting path. Never store the raw IP.
    const requestHeaders = await headers();
    const forwarded = requestHeaders.get("x-vercel-forwarded-for")
      ?? requestHeaders.get("x-forwarded-for");
    const visitorIp = forwarded?.split(",")[0]?.trim();
    const secret = process.env.SUPABASE_SECRET_KEY;
    if (!visitorIp || visitorIp.length > 64 || !secret) {
      return fail("De aanvraag kan tijdelijk niet veilig worden verwerkt.");
    }
    const fingerprint = (kind: string, value: string) =>
      createHmac("sha256", secret)
        .update("rio-booking:" + kind + ":" + value)
        .digest("hex");
    for (const [scope, key, limit] of [
      ["ip", fingerprint("ip", visitorIp), 15],
      ["email", fingerprint("email", email), 3],
    ] as const) {
      const { data: allowed, error: rateError } = await admin.rpc(
        "reserve_guest_booking_quota", {
          p_restaurant_id: restaurant.id,
          p_scope: scope,
          p_fingerprint: key,
          p_limit: limit,
        },
      );
      if (rateError || allowed !== true) {
        return fail("Er zijn te veel reserveringsaanvragen gedaan. Probeer het over een uur opnieuw.");
      }
    }

    const { error: insertError } = await admin.from("reservations").insert({
      restaurant_id: restaurant.id,
      guest_name: guestName,
      show_name_on_table_qr: showNameOnTableQr,
      guest_email: email,
      guest_phone: phone,
      party_size: partySize,
      starts_at: startsAt,
      notes: notes || null,
      table_id: null,
      status: "pending",
    });
    if (insertError) {
      console.error("Rio public reservation insert failed:", insertError.code);
      return fail("Opslaan is niet gelukt. Er is geen reservering bevestigd. Probeer later opnieuw.");
    }

    revalidatePath("/management/reserveringen");
    revalidatePath("/staff/reserveringen");
    return {
      status: "sent",
      message: "Je reserveringsaanvraag is ontvangen. De tafel is pas definitief na bevestiging door R.I.O.",
    };
  } catch {
    return fail("De reserveringsdienst is tijdelijk niet beschikbaar. Probeer later opnieuw.");
  }
}
