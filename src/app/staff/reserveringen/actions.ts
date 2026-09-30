"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/permissions";
import {
  PILOT_RESTAURANT_SLUG,
  isReservationStatus,
  isValidDate,
  isValidTime,
  zonedToIso,
} from "@/lib/reservations";
import type { ReservationStatus } from "@/lib/reservations";

const BASE_PATH = "/staff/reserveringen";

export type ReservationFormValues = {
  guest_name: string;
  date: string;
  time: string;
  party_size: string;
  guest_phone: string;
  table_id: string;
  notes: string;
  status: string;
};

export type ReservationFormState = {
  error: string | null;
  values: ReservationFormValues | null;
};

async function assertStaff() {
  await requirePermission("reservations.manage");
}

async function getPilotRestaurant() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("restaurants")
    .select("id, timezone")
    .eq("slug", PILOT_RESTAURANT_SLUG)
    .single();

  if (error || !data) {
    throw new Error("Restaurant niet gevonden.");
  }

  return { supabase, restaurant: data };
}

/** Only allows redirects back into the reservations page. */
function safeReturnPath(value: FormDataEntryValue | null) {
  const path = typeof value === "string" ? value : "";

  return path === BASE_PATH || path.startsWith(`${BASE_PATH}?`)
    ? path
    : BASE_PATH;
}

function readValues(formData: FormData): ReservationFormValues {
  const text = (name: string) => String(formData.get(name) ?? "").trim();

  return {
    guest_name: text("guest_name"),
    date: text("date"),
    time: text("time"),
    party_size: text("party_size"),
    guest_phone: text("guest_phone"),
    table_id: text("table_id"),
    notes: text("notes"),
    status: text("status") || "pending",
  };
}

function validate(values: ReservationFormValues) {
  if (!values.guest_name) {
    return "Vul de naam van de gast in.";
  }

  if (values.guest_name.length > 120) {
    return "De naam is te lang (maximaal 120 tekens).";
  }

  if (!isValidDate(values.date)) {
    return "Kies een geldige datum.";
  }

  if (!isValidTime(values.time)) {
    return "Kies een geldige tijd.";
  }

  const partySize = Number(values.party_size);

  if (!Number.isInteger(partySize) || partySize < 1 || partySize > 100) {
    return "Het aantal personen moet tussen 1 en 100 liggen.";
  }

  if (
    values.guest_phone &&
    (values.guest_phone.length > 30 || !/^[0-9+()\-\s]+$/.test(values.guest_phone))
  ) {
    return "Het telefoonnummer is ongeldig.";
  }

  if (values.notes.length > 1000) {
    return "De opmerking is te lang (maximaal 1000 tekens).";
  }

  if (!isReservationStatus(values.status)) {
    return "Kies een geldige status.";
  }

  return null;
}

async function saveReservation(
  reservationId: string | null,
  formData: FormData,
): Promise<ReservationFormState> {
  await assertStaff();

  const values = readValues(formData);
  const validationError = validate(values);

  if (validationError) {
    return { error: validationError, values };
  }

  const { supabase, restaurant } = await getPilotRestaurant();

  if (values.table_id) {
    const { data: table } = await supabase
      .from("tables")
      .select("id")
      .eq("restaurant_id", restaurant.id)
      .eq("id", values.table_id)
      .maybeSingle();

    if (!table) {
      return { error: "De gekozen tafel bestaat niet.", values };
    }
  }

  const startsAt = zonedToIso(values.date, values.time, restaurant.timezone);

  if (!startsAt) {
    return { error: "Kies een geldige datum en tijd.", values };
  }

  const record = {
    guest_name: values.guest_name,
    guest_phone: values.guest_phone || null,
    party_size: Number(values.party_size),
    starts_at: startsAt,
    table_id: values.table_id || null,
    notes: values.notes || null,
    status: values.status as ReservationStatus,
  };

  if (reservationId) {
    const { data, error } = await supabase
      .from("reservations")
      .update(record)
      .eq("id", reservationId)
      .eq("restaurant_id", restaurant.id)
      .select("id");

    if (error) {
      console.error(error);
      return { error: "Opslaan is mislukt. Probeer het opnieuw.", values };
    }

    if (!data || data.length === 0) {
      return { error: "Deze reservering bestaat niet meer.", values };
    }
  } else {
    const { error } = await supabase
      .from("reservations")
      .insert({ ...record, restaurant_id: restaurant.id });

    if (error) {
      console.error(error);
      return { error: "Opslaan is mislukt. Probeer het opnieuw.", values };
    }
  }

  revalidatePath(BASE_PATH);
  redirect(
    `${BASE_PATH}?datum=${values.date}&ok=${reservationId ? "gewijzigd" : "toegevoegd"}`,
  );
}

export async function createReservation(
  _previous: ReservationFormState,
  formData: FormData,
) {
  return saveReservation(null, formData);
}

export async function updateReservation(
  _previous: ReservationFormState,
  formData: FormData,
) {
  const reservationId = String(formData.get("reservation_id") ?? "");

  if (!reservationId) {
    return { error: "Onbekende reservering.", values: readValues(formData) };
  }

  return saveReservation(reservationId, formData);
}

export async function setReservationStatus(formData: FormData) {
  await assertStaff();

  const reservationId = String(formData.get("reservation_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const returnPath = safeReturnPath(formData.get("return_to"));

  if (!reservationId || !isReservationStatus(status)) {
    redirect(returnPath);
  }

  const { supabase, restaurant } = await getPilotRestaurant();

  const { error } = await supabase
    .from("reservations")
    .update({ status })
    .eq("id", reservationId)
    .eq("restaurant_id", restaurant.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(BASE_PATH);
  redirect(returnPath);
}

/** Management only; only cancelled reservations can be deleted. */
export async function deleteReservation(formData: FormData) {
  const returnPath = safeReturnPath(formData.get("return_to"));

  await requirePermission("reservations.delete", returnPath);

  const reservationId = String(formData.get("reservation_id") ?? "");

  if (!reservationId) {
    redirect(returnPath);
  }

  const { supabase, restaurant } = await getPilotRestaurant();

  const { error } = await supabase
    .from("reservations")
    .delete()
    .eq("id", reservationId)
    .eq("restaurant_id", restaurant.id)
    .eq("status", "cancelled");

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(BASE_PATH);
  redirect(returnPath);
}
