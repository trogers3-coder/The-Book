export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      attachments: {
        Row: {
          created_at: string
          extracted_text: string | null
          filename: string | null
          gmail_attachment_id: string | null
          id: string
          message_id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string | null
        }
        Insert: {
          created_at?: string
          extracted_text?: string | null
          filename?: string | null
          gmail_attachment_id?: string | null
          id?: string
          message_id: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string | null
        }
        Update: {
          created_at?: string
          extracted_text?: string | null
          filename?: string | null
          gmail_attachment_id?: string | null
          id?: string
          message_id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      call_sheets: {
        Row: {
          account_id: string
          agency: string | null
          agent_email: string | null
          agent_name: string | null
          agent_phone: string | null
          brand: string | null
          call_time: string | null
          client: string | null
          confidence: number | null
          contacts: Json
          created_at: string
          day_rate: number | null
          id: string
          location_address: string | null
          location_name: string | null
          message_id: string
          notes: string | null
          photographer: string | null
          project_name: string | null
          rate_currency: string | null
          rate_unit: string | null
          raw_extraction: Json | null
          role: string | null
          search_text: string | null
          search_vector: unknown
          shoot_date: string | null
          shoot_end_date: string | null
          source_attachment_id: string | null
          tags: string[]
          updated_at: string
          usage_terms: string | null
          wardrobe_notes: string | null
          wrap_time: string | null
        }
        Insert: {
          account_id: string
          agency?: string | null
          agent_email?: string | null
          agent_name?: string | null
          agent_phone?: string | null
          brand?: string | null
          call_time?: string | null
          client?: string | null
          confidence?: number | null
          contacts?: Json
          created_at?: string
          day_rate?: number | null
          id?: string
          location_address?: string | null
          location_name?: string | null
          message_id: string
          notes?: string | null
          photographer?: string | null
          project_name?: string | null
          rate_currency?: string | null
          rate_unit?: string | null
          raw_extraction?: Json | null
          role?: string | null
          search_text?: string | null
          search_vector?: unknown
          shoot_date?: string | null
          shoot_end_date?: string | null
          source_attachment_id?: string | null
          tags?: string[]
          updated_at?: string
          usage_terms?: string | null
          wardrobe_notes?: string | null
          wrap_time?: string | null
        }
        Update: {
          account_id?: string
          agency?: string | null
          agent_email?: string | null
          agent_name?: string | null
          agent_phone?: string | null
          brand?: string | null
          call_time?: string | null
          client?: string | null
          confidence?: number | null
          contacts?: Json
          created_at?: string
          day_rate?: number | null
          id?: string
          location_address?: string | null
          location_name?: string | null
          message_id?: string
          notes?: string | null
          photographer?: string | null
          project_name?: string | null
          rate_currency?: string | null
          rate_unit?: string | null
          raw_extraction?: Json | null
          role?: string | null
          search_text?: string | null
          search_vector?: unknown
          shoot_date?: string | null
          shoot_end_date?: string | null
          source_attachment_id?: string | null
          tags?: string[]
          updated_at?: string
          usage_terms?: string | null
          wardrobe_notes?: string | null
          wrap_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_sheets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "gmail_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_sheets_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_sheets_source_attachment_id_fkey"
            columns: ["source_attachment_id"]
            isOneToOne: false
            referencedRelation: "attachments"
            referencedColumns: ["id"]
          },
        ]
      }
      creators: {
        Row: {
          bio: string | null
          created_at: string
          display_name: string | null
          follower_count: number | null
          handle: string | null
          id: string
          location: string | null
          niche_tags: string[]
          outreach_status: string
          platform: string
          profile_url: string
          raw_summary: string | null
          source: string
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          display_name?: string | null
          follower_count?: number | null
          handle?: string | null
          id?: string
          location?: string | null
          niche_tags?: string[]
          outreach_status?: string
          platform: string
          profile_url: string
          raw_summary?: string | null
          source?: string
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          display_name?: string | null
          follower_count?: number | null
          handle?: string | null
          id?: string
          location?: string | null
          niche_tags?: string[]
          outreach_status?: string
          platform?: string
          profile_url?: string
          raw_summary?: string | null
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      gmail_accounts: {
        Row: {
          access_token_encrypted: string | null
          created_at: string
          display_name: string | null
          email: string
          history_id: string | null
          id: string
          last_synced_at: string | null
          refresh_token_encrypted: string
          token_expiry: string | null
        }
        Insert: {
          access_token_encrypted?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          history_id?: string | null
          id?: string
          last_synced_at?: string | null
          refresh_token_encrypted: string
          token_expiry?: string | null
        }
        Update: {
          access_token_encrypted?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          history_id?: string | null
          id?: string
          last_synced_at?: string | null
          refresh_token_encrypted?: string
          token_expiry?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          account_id: string
          body_html: string | null
          body_text: string | null
          from_address: string | null
          from_name: string | null
          gmail_message_id: string
          gmail_thread_id: string | null
          has_attachments: boolean
          id: string
          message_date: string | null
          snippet: string | null
          subject: string | null
          synced_at: string
          to_addresses: string[]
        }
        Insert: {
          account_id: string
          body_html?: string | null
          body_text?: string | null
          from_address?: string | null
          from_name?: string | null
          gmail_message_id: string
          gmail_thread_id?: string | null
          has_attachments?: boolean
          id?: string
          message_date?: string | null
          snippet?: string | null
          subject?: string | null
          synced_at?: string
          to_addresses?: string[]
        }
        Update: {
          account_id?: string
          body_html?: string | null
          body_text?: string | null
          from_address?: string | null
          from_name?: string | null
          gmail_message_id?: string
          gmail_thread_id?: string | null
          has_attachments?: boolean
          id?: string
          message_date?: string | null
          snippet?: string | null
          subject?: string | null
          synced_at?: string
          to_addresses?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "messages_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "gmail_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_runs: {
        Row: {
          account_id: string
          call_sheets_extracted: number
          error: string | null
          finished_at: string | null
          id: string
          messages_found: number
          messages_processed: number
          started_at: string
          status: string
        }
        Insert: {
          account_id: string
          call_sheets_extracted?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          messages_found?: number
          messages_processed?: number
          started_at?: string
          status?: string
        }
        Update: {
          account_id?: string
          call_sheets_extracted?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          messages_found?: number
          messages_processed?: number
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_runs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "gmail_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
