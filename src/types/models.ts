// Readable aliases for database rows, for use throughout the app.
import type { Tables } from "./database";


export type Restaurant = Tables<"restaurants">;
export type RestaurantTable = Tables<"tables">;
export type QrToken = Tables<"qr_tokens">;
export type MenuSection = Tables<"menu_sections">;
export type MenuItem = Tables<"menu_items">;
export type Reservation = Tables<"reservations">;
