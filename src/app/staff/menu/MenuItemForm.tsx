"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import type { ChangeEvent } from "react";

import { saveMenuItem } from "./actions";
import type { MenuItemFormState, MenuItemFormValues } from "./actions";
import { MENU_IMAGE_MAX_BYTES } from "@/lib/menu";

type SectionOption = {
  id: string;
  name: string;
  is_visible: boolean;
};

type MenuItemFormProps = {
  itemId: string | null;
  initialValues: MenuItemFormValues;
  imageUrl: string | null;
  sections: SectionOption[];
  cancelHref: string;
};

const initialState: MenuItemFormState = { error: null, values: null };
const MAX_DIMENSION = 1600;

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Scales the photo down and re-encodes it so it fits the upload limit. */
async function resizeImage(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");

  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  for (const type of ["image/webp", "image/jpeg"]) {
    for (const quality of [0.85, 0.72, 0.6]) {
      const blob = await canvasToBlob(canvas, type, quality);

      // Browsers that cannot encode a type silently fall back to PNG.
      if (blob && blob.type === type && blob.size <= MENU_IMAGE_MAX_BYTES) {
        return new File([blob], type === "image/webp" ? "foto.webp" : "foto.jpg", { type });
      }
    }
  }

  throw new Error("Image too large");
}

export default function MenuItemForm({
  itemId,
  initialValues,
  imageUrl,
  sections,
  cancelHref,
}: MenuItemFormProps) {
  const [state, formAction, pending] = useActionState(saveMenuItem, initialState);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const values = state.values ?? initialValues;
  const isEdit = itemId !== null;

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    setImageError(null);
    setPreview(null);

    if (!file) {
      return;
    }

    setProcessing(true);

    try {
      const resized = await resizeImage(file);
      const transfer = new DataTransfer();

      transfer.items.add(resized);
      input.files = transfer.files;
      setPreview(URL.createObjectURL(resized));
    } catch {
      input.value = "";
      setImageError("Deze afbeelding kan niet worden gebruikt. Kies een JPG-, PNG- of WebP-foto.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <form action={formAction} className="edit-panel" key={JSON.stringify(values)}>
      <div className="edit-panel-head">
        <h2>{isEdit ? "Gerecht wijzigen" : "Nieuw gerecht of drankje"}</h2>
        <Link href={cancelHref} className="link-button">
          Sluiten
        </Link>
      </div>

      {itemId && <input type="hidden" name="item_id" value={itemId} />}

      <div className="field-grid">
        <label className="field field-wide">
          <span>Naam *</span>
          <input name="name" defaultValue={values.name} required maxLength={120} autoComplete="off" />
        </label>

        <label className="field field-wide">
          <span>Omschrijving</span>
          <textarea name="description" defaultValue={values.description} maxLength={500} rows={3} />
        </label>

        <label className="field">
          <span>Prijs (€) *</span>
          <input
            name="price"
            defaultValue={values.price}
            inputMode="decimal"
            placeholder="12,50"
            pattern="^\s*(€\s*)?\d{1,5}([.,]\d{1,2})?\s*$"
            title="Bijvoorbeeld 12,50"
            required
          />
        </label>

        <label className="field">
          <span>Categorie *</span>
          <select name="section_id" defaultValue={values.section_id} required>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
                {section.is_visible ? "" : " (verborgen)"}
              </option>
            ))}
          </select>
        </label>

        <div className="field field-wide">
          <span>Afbeelding</span>

          <div className="image-row">
            {(preview ?? imageUrl) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview ?? imageUrl ?? ""} alt="" className="image-preview" />
            )}

            <div className="image-controls">
              <input
                type="file"
                name="image"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
              />

              {imageUrl && !preview && (
                <label className="checkbox">
                  <input type="checkbox" name="remove_image" value="1" />
                  Huidige afbeelding verwijderen
                </label>
              )}

              {processing && <p className="hint">Afbeelding wordt verkleind…</p>}
              {imageError && <p className="form-error">{imageError}</p>}
            </div>
          </div>
        </div>
      </div>

      {state.error && <p className="form-error">{state.error}</p>}

      <div className="form-actions">
        <button type="submit" className="primary-button" disabled={pending || processing}>
          {pending ? "Opslaan…" : isEdit ? "Wijzigingen opslaan" : "Gerecht toevoegen"}
        </button>
      </div>
    </form>
  );
}
