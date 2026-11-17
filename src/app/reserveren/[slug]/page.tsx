import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { addDays, todayInZone } from "@/lib/reservations";
import { createClient } from "@/lib/supabase/server";
import BookingExperience from "./BookingExperience";
import "./booking.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export const metadata: Metadata = {
  title: "Tafel reserveren bij R.I.O.",
  description: "Vraag eenvoudig een tafel aan bij R.I.O. in Deventer. Het restaurant bevestigt je aanvraag.",
  robots: { index: false, follow: false },
};

// Rio is de pilot. Andere restaurant-tenants krijgen niet onbedoeld deze vormgeving.
const RIO_SLUG = "rio-deventer";

export default async function ReserveerPage({ params }: Props) {
  const { slug } = await params;
  if (slug !== RIO_SLUG) notFound();

  const today = todayInZone("Europe/Amsterdam");
  let bookingEnabled = false;
  let heroImageUrl: string | null = null;

  // Wanneer Supabase tijdelijk offline is, blijft de pagina zichtbaar maar
  // kan een gast GEEN schijnreservering indienen.
  try {
    const supabase = await createClient();
    const { data: restaurant, error } = await supabase
      .from("restaurants")
      .select("id")
      .eq("slug", RIO_SLUG)
      .eq("is_active", true)
      .maybeSingle();

    if (!error && restaurant) {
      bookingEnabled = true;
      const { data: dishes } = await supabase
        .from("menu_items")
        .select("image_url")
        .eq("restaurant_id", restaurant.id)
        .eq("is_visible", true)
        .eq("is_available", true)
        .not("image_url", "is", null)
        .limit(6);

      const image = dishes?.find((item) => {
        if (!item.image_url) return false;
        try { return new URL(item.image_url).protocol === "https:"; }
        catch { return false; }
      });
      heroImageUrl = image?.image_url ?? null;
    }
  } catch {
    // Database onbereikbaar: expliciete, veilige onderhoudsmodus hieronder.
  }

  return (
    <BookingExperience
      restaurantSlug={RIO_SLUG}
      today={today}
      tomorrow={addDays(today, 1)}
      maxDate={addDays(today, 90)}
      bookingEnabled={bookingEnabled}
      heroImageUrl={heroImageUrl}
    />
  );
}
