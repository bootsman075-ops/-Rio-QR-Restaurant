"use client";

import Link from "next/link";
import { useActionState } from "react";

import { saveSection } from "./actions";
import type { SectionFormState, SectionFormValues } from "./actions";

type SectionFormProps = {
  sectionId: string | null;
  initialValues: SectionFormValues;
  cancelHref: string;
};

const initialState: SectionFormState = { error: null, values: null };

export default function SectionForm({ sectionId, initialValues, cancelHref }: SectionFormProps) {
  const [state, formAction, pending] = useActionState(saveSection, initialState);
  const values = state.values ?? initialValues;

  return (
    <form action={formAction} className="edit-panel" key={JSON.stringify(values)}>
      <div className="edit-panel-head">
        <h2>{sectionId ? "Categorie wijzigen" : "Nieuwe categorie"}</h2>
        <Link href={cancelHref} className="link-button">
          Sluiten
        </Link>
      </div>

      {sectionId && <input type="hidden" name="section_id" value={sectionId} />}

      <div className="field-grid">
        <label className="field field-wide">
          <span>Naam *</span>
          <input name="name" defaultValue={values.name} required maxLength={80} autoComplete="off" />
        </label>

        <label className="field field-wide">
          <span>Omschrijving</span>
          <textarea name="description" defaultValue={values.description} maxLength={300} rows={2} />
        </label>
      </div>

      {state.error && <p className="form-error">{state.error}</p>}

      <div className="form-actions">
        <button type="submit" className="primary-button" disabled={pending}>
          {pending ? "Opslaan…" : sectionId ? "Wijzigingen opslaan" : "Categorie toevoegen"}
        </button>
      </div>
    </form>
  );
}
