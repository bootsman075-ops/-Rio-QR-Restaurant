/** Supabase Storage bucket for menu photos (see migration menu_images_bucket). */
export const MENU_IMAGES_BUCKET = "menu-images";

export const MENU_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Server Action bodies are capped at 1 MB; the browser resizes before upload. */
export const MENU_IMAGE_MAX_BYTES = 950 * 1024;

export function formatPrice(priceCents: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(priceCents / 100);
}

/** Price as shown in an input, e.g. 1250 → "12,50". */
export function priceToInput(priceCents: number) {
  return (priceCents / 100).toFixed(2).replace(".", ",");
}

/** Parses "12,50", "12.5" or "12" into cents; null when invalid. */
export function parsePrice(value: string) {
  const match = /^(\d{1,5})(?:[.,](\d{1,2}))?$/.exec(value.trim().replace(/^€\s*/, ""));

  if (!match) {
    return null;
  }

  return Number(match[1]) * 100 + Number((match[2] ?? "0").padEnd(2, "0"));
}

/** Storage path of an image in our bucket, or null for any other URL. */
export function storagePathFromUrl(url: string | null) {
  if (!url) {
    return null;
  }

  const marker = `/storage/v1/object/public/${MENU_IMAGES_BUCKET}/`;
  const index = url.indexOf(marker);

  return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length));
}
