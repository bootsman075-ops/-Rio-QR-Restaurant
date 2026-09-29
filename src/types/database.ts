// Database types matching supabase/migrations.
// Hand-written for now; once a Supabase project is linked, regenerate with:
//   npx supabase gen types typescript --linked > src/types/database.ts
// Keep these as `type` aliases (not interfaces) so they satisfy supabase-js's
// Record<string, unknown> constraints.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "seated"
  | "completed"
  | "cancelled"
  | "no_show";

type QrTokenRow = {
  id: string;
  restaurant_id: string;
  table_id: string;
  token: string;
  created_at: string;
  revoked_at: string | null;
};

export type Database = {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string;
          slug: string;
          name: string;
          city: string | null;
          timezone: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          city?: string | null;
          timezone?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          city?: string | null;
          timezone?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tables: {
        Row: {
          id: string;
          restaurant_id: string;
          number: number;
          label: string | null;
          seats: number | null;
          area: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          number: number;
          label?: string | null;
          seats?: number | null;
          area?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          number?: number;
          label?: string | null;
          seats?: number | null;
          area?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tables_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      qr_tokens: {
        Row: QrTokenRow;
        Insert: {
          id?: string;
          restaurant_id: string;
          table_id: string;
          token?: string;
          created_at?: string;
          revoked_at?: string | null;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          table_id?: string;
          token?: string;
          created_at?: string;
          revoked_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "qr_tokens_restaurant_id_table_id_fkey";
            columns: ["restaurant_id", "table_id"];
            isOneToOne: false;
            referencedRelation: "tables";
            referencedColumns: ["restaurant_id", "id"];
          },
        ];
      };
      menu_sections: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          description: string | null;
          sort_order: number;
          is_visible: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: string;
          description?: string | null;
          sort_order?: number;
          is_visible?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          name?: string;
          description?: string | null;
          sort_order?: number;
          is_visible?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menu_sections_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      menu_items: {
        Row: {
          id: string;
          restaurant_id: string;
          section_id: string;
          name: string;
          description: string | null;
          price_cents: number;
          allergens: string[];
          tags: string[];
          image_url: string | null;
          sort_order: number;
          is_available: boolean;
          is_visible: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          section_id: string;
          name: string;
          description?: string | null;
          price_cents: number;
          allergens?: string[];
          tags?: string[];
          image_url?: string | null;
          sort_order?: number;
          is_available?: boolean;
          is_visible?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          section_id?: string;
          name?: string;
          description?: string | null;
          price_cents?: number;
          allergens?: string[];
          tags?: string[];
          image_url?: string | null;
          sort_order?: number;
          is_available?: boolean;
          is_visible?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menu_items_restaurant_id_section_id_fkey";
            columns: ["restaurant_id", "section_id"];
            isOneToOne: false;
            referencedRelation: "menu_sections";
            referencedColumns: ["restaurant_id", "id"];
          },
        ];
      };
      reservations: {
        Row: {
          id: string;
          restaurant_id: string;
          table_id: string | null;
          guest_name: string;
          guest_phone: string | null;
          guest_email: string | null;
          party_size: number;
          starts_at: string;
          ends_at: string | null;
          status: ReservationStatus;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          table_id?: string | null;
          guest_name: string;
          guest_phone?: string | null;
          guest_email?: string | null;
          party_size: number;
          starts_at: string;
          ends_at?: string | null;
          status?: ReservationStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          table_id?: string | null;
          guest_name?: string;
          guest_phone?: string | null;
          guest_email?: string | null;
          party_size?: number;
          starts_at?: string;
          ends_at?: string | null;
          status?: ReservationStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reservations_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservations_restaurant_id_table_id_fkey";
            columns: ["restaurant_id", "table_id"];
            isOneToOne: false;
            referencedRelation: "tables";
            referencedColumns: ["restaurant_id", "id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      rotate_qr_token: {
        Args: { p_table_id: string };
        Returns: QrTokenRow;
      };
    };
    Enums: {
      reservation_status: ReservationStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> =
  PublicSchema["Enums"][T];
