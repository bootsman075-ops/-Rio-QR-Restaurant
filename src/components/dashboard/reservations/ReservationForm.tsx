"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  createReservation,
  updateReservation,
} from "./actions";
import type {
  ReservationFormState,
  ReservationFormValues,
} from "./actions";
import {
  RESERVATION_STATUSES,
  RESERVATION_STATUS_LABELS,
} from "@/lib/reservations";

type TableOption = {
  id: string;
  number: number;
  label: string | null;
};

type ReservationFormProps = {
  reservationId: string | null;
  initialValues: ReservationFormValues;
  tables: TableOption[];
  cancelHref: string;
};

const initialState: ReservationFormState = { error: null, values: null };

export default function ReservationForm({
  reservationId,
  initialValues,
  tables,
  cancelHref,
}: ReservationFormProps) {
  const [state, formAction, pending] = useActionState(
    reservationId ? updateReservation : createReservation,
    initialState,
  );

  // After a failed submit, show what the user entered instead of the originals.
  const values = state.values ?? initialValues;
  const isEdit = reservationId !== null;

  return (
    <form action={formAction} className="res-form" key={JSON.stringify(values)}>
      <div className="res-form-head">
        <h2>{isEdit ? "Reservering wijzigen" : "Nieuwe reservering"}</h2>
        <Link href={cancelHref} className="link-button">
          Sluiten
        </Link>
      </div>

      {reservationId && (
        <input type="hidden" name="reservation_id" value={reservationId} />
      )}

      <div className="field-grid">
        <label className="field field-wide">
          <span>Naam gast *</span>
          <input
            name="guest_name"
            defaultValue={values.guest_name}
            required
            maxLength={120}
            autoComplete="off"
          />
        </label>

        <label className="field">
          <span>Datum *</span>
          <input type="date" name="date" defaultValue={values.date} required />
        </label>

        <label className="field">
          <span>Tijd *</span>
          <input
            type="time"
            name="time"
            defaultValue={values.time}
            step={300}
            required
          />
        </label>

        <label className="field">
          <span>Aantal personen *</span>
          <input
            type="number"
            name="party_size"
            defaultValue={values.party_size}
            min={1}
            max={100}
            required
          />
        </label>

        <label className="field">
          <span>Telefoonnummer</span>
          <input
            type="tel"
            name="guest_phone"
            defaultValue={values.guest_phone}
            maxLength={30}
            autoComplete="off"
          />
        </label>

        <label className="field">
          <span>Tafel</span>
          <select name="table_id" defaultValue={values.table_id}>
            <option value="">Nog geen tafel</option>
            {tables.map((table) => (
              <option key={table.id} value={table.id}>
                {table.label
                  ? `${table.label} (tafel ${table.number})`
                  : `Tafel ${table.number}`}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Status</span>
          <select name="status" defaultValue={values.status}>
            {RESERVATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {RESERVATION_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>

        <label className="field field-wide">
          <span>Opmerking</span>
          <textarea
            name="notes"
            defaultValue={values.notes}
            maxLength={1000}
            rows={3}
          />
        </label>
      </div>

      {state.error && <p className="form-error">{state.error}</p>}

      <div className="form-actions">
        <button type="submit" className="primary-button" disabled={pending}>
          {pending
            ? "Opslaan…"
            : isEdit
              ? "Wijzigingen opslaan"
              : "Reservering toevoegen"}
        </button>
      </div>
    </form>
  );
}
