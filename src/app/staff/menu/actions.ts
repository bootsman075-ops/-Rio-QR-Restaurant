"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/permissions";
import { PILOT_RESTAURANT_SLUG } from "@/lib/reservations";
import {
  MENU_ALLERGENS,
  MENU_IMAGES_BUCKET,
  MENU_IMAGE_MAX_BYTES,
  MENU_IMAGE_TYPES,
  MENU_TAGS,
  parsePrice,
  storagePathFromUrl,
} from "@/lib/menu";

const BASE_PATH = "/staff/menu";

export type MenuItemFormValues = {
  name: string;
  description: string;
  price: string;
  section_id: string;
  allergens: string[];
  tags: string[];
  is_visible: boolean;
};

export type MenuItemFormState = {
  error: string | null;
  values: MenuItemFormValues | null;
};

export type SectionFormValues = {
  name: string;
  description: string;
};

export type SectionFormState = {
  error: string | null;
  values: SectionFormValues | null;
};

/** Every menu change requires the management permission. */
async function requireMenuPermission() {
  await requirePermission("menu.manage", BASE_PATH);
}

async function getPilotRestaurant() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("restaurants")
    .select("id")
    .eq("slug", PILOT_RESTAURANT_SLUG)
    .single();

  if (error || !data) {
    throw new Error("Restaurant niet gevonden.");
  }

  return { supabase, restaurantId: data.id };
}

type Supabase = ReturnType<typeof createAdminClient>;

function revalidateMenu() {
  revalidatePath(BASE_PATH);
  // Guest menu pages read the same tables.
  revalidatePath("/qr/[token]", "page");
}

async function nextItemSortOrder(
  supabase: Supabase,
  restaurantId: string,
  sectionId: string,
) {
  const { data } = await supabase
    .from("menu_items")
    .select("sort_order")
    .eq("restaurant_id", restaurantId)
    .eq("section_id", sectionId)
    .order("sort_order", { ascending: false })
    .limit(1);

  return (data?.[0]?.sort_order ?? 0) + 1;
}

async function removeStoredImage(supabase: Supabase, imageUrl: string | null) {
  const path = storagePathFromUrl(imageUrl);

  if (path) {
    const { error } = await supabase.storage.from(MENU_IMAGES_BUCKET).remove([path]);

    if (error) {
      console.error(error);
    }
  }
}

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

/* ------------------------------------------------------------------ */
/* Menu items                                                          */
/* ------------------------------------------------------------------ */

export async function saveMenuItem(
  _previous: MenuItemFormState,
  formData: FormData,
): Promise<MenuItemFormState> {
  await requireMenuPermission();

  const itemId = text(formData, "item_id");
  const values: MenuItemFormValues = {
    name: text(formData, "name"),
    description: text(formData, "description"),
    price: text(formData, "price"),
    section_id: text(formData, "section_id"),
    allergens: formData.getAll("allergens").map(String).filter((code) => code in MENU_ALLERGENS),
    tags: formData.getAll("tags").map(String).filter((code) => code in MENU_TAGS),
    is_visible: formData.get("is_visible") === "1",
  };
  const fail = (error: string) => ({ error, values });

  if (!values.name) {
    return fail("Vul een naam in.");
  }

  if (values.name.length > 120) {
    return fail("De naam is te lang (maximaal 120 tekens).");
  }

  if (values.description.length > 500) {
    return fail("De omschrijving is te lang (maximaal 500 tekens).");
  }

  const priceCents = parsePrice(values.price);

  if (priceCents === null) {
    return fail("Vul een geldige prijs in, bijvoorbeeld 12,50.");
  }

  const image = formData.get("image");
  const hasNewImage = image instanceof File && image.size > 0;

  if (hasNewImage) {
    if (!MENU_IMAGE_TYPES.includes(image.type)) {
      return fail("Gebruik een JPG-, PNG- of WebP-afbeelding.");
    }

    if (image.size > MENU_IMAGE_MAX_BYTES) {
      return fail("De afbeelding is te groot (maximaal 950 KB).");
    }
  }

  const { supabase, restaurantId } = await getPilotRestaurant();

  const { data: section } = await supabase
    .from("menu_sections")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("id", values.section_id)
    .maybeSingle();

  if (!section) {
    return fail("Kies een geldige categorie.");
  }

  let existing: { section_id: string; image_url: string | null } | null = null;

  if (itemId) {
    const { data } = await supabase
      .from("menu_items")
      .select("section_id, image_url")
      .eq("restaurant_id", restaurantId)
      .eq("id", itemId)
      .maybeSingle();

    if (!data) {
      return fail("Dit gerecht bestaat niet meer.");
    }

    existing = data;
  }

  const id = itemId || randomUUID();
  let imageUrl = formData.get("remove_image") === "1" ? null : (existing?.image_url ?? null);
  let uploadedPath: string | null = null;

  if (hasNewImage) {
    const extension = image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg";
    uploadedPath = `${restaurantId}/${id}-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(MENU_IMAGES_BUCKET)
      .upload(uploadedPath, image, { contentType: image.type, upsert: false });

    if (uploadError) {
      console.error(uploadError);
      return fail(
        "De afbeelding kon niet worden opgeslagen. Is de afbeeldingsopslag (migratie menu_images_bucket) al ingericht?",
      );
    }

    imageUrl = supabase.storage.from(MENU_IMAGES_BUCKET).getPublicUrl(uploadedPath).data.publicUrl;
  }

  const record = {
    name: values.name,
    description: values.description || null,
    price_cents: priceCents,
    section_id: values.section_id,
    image_url: imageUrl,
    allergens: values.allergens,
    tags: values.tags,
    is_visible: values.is_visible,
  };

  const moved = !existing || existing.section_id !== values.section_id;
  const sortOrder = moved
    ? await nextItemSortOrder(supabase, restaurantId, values.section_id)
    : undefined;

  const { error } = existing
    ? await supabase
        .from("menu_items")
        .update(sortOrder === undefined ? record : { ...record, sort_order: sortOrder })
        .eq("restaurant_id", restaurantId)
        .eq("id", id)
    : await supabase
        .from("menu_items")
        .insert({ ...record, id, restaurant_id: restaurantId, sort_order: sortOrder ?? 1 });

  if (error) {
    console.error(error);

    if (uploadedPath) {
      await supabase.storage.from(MENU_IMAGES_BUCKET).remove([uploadedPath]);
    }

    return fail("Opslaan is mislukt. Probeer het opnieuw.");
  }

  if (existing?.image_url && existing.image_url !== imageUrl) {
    await removeStoredImage(supabase, existing.image_url);
  }

  revalidateMenu();
  redirect(`${BASE_PATH}?ok=${existing ? "gerecht-gewijzigd" : "gerecht-toegevoegd"}#cat-${values.section_id}`);
}

export async function setMenuItemAvailability(formData: FormData) {
  await requireMenuPermission();

  const itemId = text(formData, "item_id");
  const available = formData.get("available") === "1";
  const { supabase, restaurantId } = await getPilotRestaurant();

  const { data, error } = await supabase
    .from("menu_items")
    .update({ is_available: available })
    .eq("restaurant_id", restaurantId)
    .eq("id", itemId)
    .select("section_id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  revalidateMenu();
  redirect(`${BASE_PATH}${data ? `#cat-${data.section_id}` : ""}`);
}

export async function moveMenuItem(formData: FormData) {
  await requireMenuPermission();

  const itemId = text(formData, "item_id");
  const direction = text(formData, "direction") === "up" ? -1 : 1;
  const { supabase, restaurantId } = await getPilotRestaurant();

  const { data: item } = await supabase
    .from("menu_items")
    .select("section_id")
    .eq("restaurant_id", restaurantId)
    .eq("id", itemId)
    .maybeSingle();

  if (!item) {
    redirect(BASE_PATH);
  }

  const { data: siblings, error } = await supabase
    .from("menu_items")
    .select("id, sort_order")
    .eq("restaurant_id", restaurantId)
    .eq("section_id", item.section_id)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error || !siblings) {
    throw new Error(error?.message ?? "Volgorde laden mislukt.");
  }

  const index = siblings.findIndex((sibling) => sibling.id === itemId);
  const target = index + direction;

  if (index !== -1 && target >= 0 && target < siblings.length) {
    const ordered = [...siblings];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];

    // Renumber 1..n so duplicates or gaps from older data disappear.
    const updates = ordered
      .map((sibling, position) => ({ id: sibling.id, sort_order: position + 1, old: sibling.sort_order }))
      .filter((sibling) => sibling.sort_order !== sibling.old);

    for (const update of updates) {
      const { error: updateError } = await supabase
        .from("menu_items")
        .update({ sort_order: update.sort_order })
        .eq("restaurant_id", restaurantId)
        .eq("id", update.id);

      if (updateError) {
        throw new Error(updateError.message);
      }
    }
  }

  revalidateMenu();
  redirect(`${BASE_PATH}#cat-${item.section_id}`);
}

export async function deleteMenuItem(formData: FormData) {
  await requireMenuPermission();

  const itemId = text(formData, "item_id");
  const { supabase, restaurantId } = await getPilotRestaurant();

  const { data, error } = await supabase
    .from("menu_items")
    .delete()
    .eq("restaurant_id", restaurantId)
    .eq("id", itemId)
    .select("section_id, image_url")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data) {
    await removeStoredImage(supabase, data.image_url);
  }

  revalidateMenu();
  redirect(`${BASE_PATH}?ok=gerecht-verwijderd${data ? `#cat-${data.section_id}` : ""}`);
}

/* ------------------------------------------------------------------ */
/* Sections (categories) — manager only                                */
/* ------------------------------------------------------------------ */

export async function saveSection(
  _previous: SectionFormState,
  formData: FormData,
): Promise<SectionFormState> {
  await requireMenuPermission();

  const sectionId = text(formData, "section_id");
  const values: SectionFormValues = {
    name: text(formData, "name"),
    description: text(formData, "description"),
  };
  const fail = (error: string) => ({ error, values });

  if (!values.name) {
    return fail("Vul een categorienaam in.");
  }

  if (values.name.length > 80) {
    return fail("De naam is te lang (maximaal 80 tekens).");
  }

  if (values.description.length > 300) {
    return fail("De omschrijving is te lang (maximaal 300 tekens).");
  }

  const { supabase, restaurantId } = await getPilotRestaurant();
  const record = { name: values.name, description: values.description || null };
  let id = sectionId;

  if (sectionId) {
    const { data, error } = await supabase
      .from("menu_sections")
      .update(record)
      .eq("restaurant_id", restaurantId)
      .eq("id", sectionId)
      .select("id");

    if (error) {
      console.error(error);
      return fail("Opslaan is mislukt. Probeer het opnieuw.");
    }

    if (!data?.length) {
      return fail("Deze categorie bestaat niet meer.");
    }
  } else {
    const { data: last } = await supabase
      .from("menu_sections")
      .select("sort_order")
      .eq("restaurant_id", restaurantId)
      .order("sort_order", { ascending: false })
      .limit(1);

    const { data, error } = await supabase
      .from("menu_sections")
      .insert({
        ...record,
        restaurant_id: restaurantId,
        sort_order: (last?.[0]?.sort_order ?? 0) + 1,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error(error);
      return fail("Opslaan is mislukt. Probeer het opnieuw.");
    }

    id = data.id;
  }

  revalidateMenu();
  redirect(`${BASE_PATH}?ok=${sectionId ? "categorie-gewijzigd" : "categorie-toegevoegd"}#cat-${id}`);
}

export async function setSectionVisibility(formData: FormData) {
  await requireMenuPermission();

  const sectionId = text(formData, "section_id");
  const visible = formData.get("visible") === "1";
  const { supabase, restaurantId } = await getPilotRestaurant();

  const { error } = await supabase
    .from("menu_sections")
    .update({ is_visible: visible })
    .eq("restaurant_id", restaurantId)
    .eq("id", sectionId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateMenu();
  redirect(`${BASE_PATH}#cat-${sectionId}`);
}

export async function deleteSection(formData: FormData) {
  await requireMenuPermission();

  const sectionId = text(formData, "section_id");
  const { supabase, restaurantId } = await getPilotRestaurant();

  // Deleting a section cascades to its items, so only empty sections may go.
  const { count, error: countError } = await supabase
    .from("menu_items")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .eq("section_id", sectionId);

  if (countError) {
    throw new Error(countError.message);
  }

  if ((count ?? 0) > 0) {
    redirect(`${BASE_PATH}?fout=categorie-niet-leeg#cat-${sectionId}`);
  }

  const { error } = await supabase
    .from("menu_sections")
    .delete()
    .eq("restaurant_id", restaurantId)
    .eq("id", sectionId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateMenu();
  redirect(`${BASE_PATH}?ok=categorie-verwijderd`);
}
