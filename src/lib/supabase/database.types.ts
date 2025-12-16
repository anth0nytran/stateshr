export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      pipeline_stages: {
        Row: {
          id: string;
          name: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          sort_order: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          full_name: string | null;
          first_name: string | null;
          last_name: string | null;
          company: string | null;
          title: string | null;
          email: string | null;
          email_normalized?: string | null;
          phone: string | null;
          phone_normalized?: string | null;
          website: string | null;
          address: string | null;
          notes: string | null;
          stage_id: string;
          status?: string;
          card_image_path: string | null;
          dedupe_key?: string | null;
          raw_ocr_text: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          full_name?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          company?: string | null;
          title?: string | null;
          email?: string | null;
          phone?: string | null;
          website?: string | null;
          address?: string | null;
          notes?: string | null;
          stage_id: string;
          status?: string;
          card_image_path?: string | null;
          raw_ocr_text?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          company?: string | null;
          title?: string | null;
          email?: string | null;
          phone?: string | null;
          website?: string | null;
          address?: string | null;
          notes?: string | null;
          stage_id?: string;
          status?: string;
          card_image_path?: string | null;
          raw_ocr_text?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leads_stage_id_fkey";
            columns: ["stage_id"];
            referencedRelation: "pipeline_stages";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      lead_stage_counts: {
        Row: {
          stage_id: string;
          stage_name: string;
          stage_sort_order: number;
          lead_count: number;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
