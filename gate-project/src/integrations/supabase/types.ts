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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string | null
          id: string
          ip: string | null
          metadata: Json | null
          target_id: string | null
          target_table: string | null
          timestamp: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          id?: string
          ip?: string | null
          metadata?: Json | null
          target_id?: string | null
          target_table?: string | null
          timestamp?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          id?: string
          ip?: string | null
          metadata?: Json | null
          target_id?: string | null
          target_table?: string | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_sensitive: boolean | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string
        }
        Insert: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_sensitive?: boolean | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_sensitive?: boolean | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          account_holder_type: string | null
          account_type: string | null
          bank_last4: string | null
          bank_name: string | null
          card_brand: string | null
          card_exp_month: number | null
          card_exp_year: number | null
          card_last4: string | null
          created_at: string | null
          customer_id: string
          id: string
          is_default: boolean | null
          routing_number: string | null
          stripe_payment_method_id: string
          type: string
        }
        Insert: {
          account_holder_type?: string | null
          account_type?: string | null
          bank_last4?: string | null
          bank_name?: string | null
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          is_default?: boolean | null
          routing_number?: string | null
          stripe_payment_method_id: string
          type: string
        }
        Update: {
          account_holder_type?: string | null
          account_type?: string | null
          bank_last4?: string | null
          bank_name?: string | null
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          is_default?: boolean | null
          routing_number?: string | null
          stripe_payment_method_id?: string
          type?: string
        }
        Relationships: []
      }
      public_demo_activity: {
        Row: {
          bot_type: string
          id: string
          risk_score: number | null
          status: string
          timestamp: string | null
        }
        Insert: {
          bot_type: string
          id?: string
          risk_score?: number | null
          status: string
          timestamp?: string | null
        }
        Update: {
          bot_type?: string
          id?: string
          risk_score?: number | null
          status?: string
          timestamp?: string | null
        }
        Relationships: []
      }
      request_logs: {
        Row: {
          created_at: string | null
          customer_id: string | null
          decision_reason: string | null
          detection_data: Json | null
          fingerprint: Json | null
          id: string
          ip: string | null
          page: string | null
          risk_score: number | null
          site_id: string | null
          status: string | null
          timestamp: string | null
          type: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          decision_reason?: string | null
          detection_data?: Json | null
          fingerprint?: Json | null
          id?: string
          ip?: string | null
          page?: string | null
          risk_score?: number | null
          site_id?: string | null
          status?: string | null
          timestamp?: string | null
          type?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          decision_reason?: string | null
          detection_data?: Json | null
          fingerprint?: Json | null
          id?: string
          ip?: string | null
          page?: string | null
          risk_score?: number | null
          site_id?: string | null
          status?: string | null
          timestamp?: string | null
          type?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "request_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_logs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          details: Json | null
          event_type: string
          id: string
          ip: string | null
          severity: string | null
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          details?: Json | null
          event_type: string
          id?: string
          ip?: string | null
          severity?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          details?: Json | null
          event_type?: string
          id?: string
          ip?: string | null
          severity?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      simulations: {
        Row: {
          allowed_count: number | null
          blocked_count: number | null
          completed_at: string | null
          config: Json
          created_at: string | null
          id: string
          launched_by: string | null
          results: Json | null
          site_id: string | null
          status: string | null
          total_requests: number | null
        }
        Insert: {
          allowed_count?: number | null
          blocked_count?: number | null
          completed_at?: string | null
          config: Json
          created_at?: string | null
          id?: string
          launched_by?: string | null
          results?: Json | null
          site_id?: string | null
          status?: string | null
          total_requests?: number | null
        }
        Update: {
          allowed_count?: number | null
          blocked_count?: number | null
          completed_at?: string | null
          config?: Json
          created_at?: string | null
          id?: string
          launched_by?: string | null
          results?: Json | null
          site_id?: string | null
          status?: string | null
          total_requests?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "simulations_launched_by_fkey"
            columns: ["launched_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulations_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          api_key: string | null
          config: Json | null
          created_at: string | null
          customer_id: string | null
          domain: string
          id: string
          name: string
          site_id: string | null
          stats: Json | null
          status: string | null
          stripe_account_id: string | null
          stripe_connected: boolean | null
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          config?: Json | null
          created_at?: string | null
          customer_id?: string | null
          domain: string
          id?: string
          name: string
          site_id?: string | null
          stats?: Json | null
          status?: string | null
          stripe_account_id?: string | null
          stripe_connected?: boolean | null
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          config?: Json | null
          created_at?: string | null
          customer_id?: string | null
          domain?: string
          id?: string
          name?: string
          site_id?: string | null
          stats?: Json | null
          status?: string | null
          stripe_account_id?: string | null
          stripe_connected?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      test_logs: {
        Row: {
          bot_name: string | null
          id: string
          result: Json | null
          site_id: string | null
          status: string | null
          test_type: string | null
          timestamp: string | null
        }
        Insert: {
          bot_name?: string | null
          id?: string
          result?: Json | null
          site_id?: string | null
          status?: string | null
          test_type?: string | null
          timestamp?: string | null
        }
        Update: {
          bot_name?: string | null
          id?: string
          result?: Json | null
          site_id?: string | null
          status?: string | null
          test_type?: string | null
          timestamp?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string | null
          role: string | null
          stripe_account_id: string | null
          stripe_connected: boolean | null
          stripe_customer_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          name?: string | null
          role?: string | null
          stripe_account_id?: string | null
          stripe_connected?: boolean | null
          stripe_customer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          role?: string | null
          stripe_account_id?: string | null
          stripe_connected?: boolean | null
          stripe_customer_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      recent_request_logs: {
        Row: {
          customer_id: string | null
          decision_reason: string | null
          id: string | null
          ip: string | null
          page: string | null
          site_id: string | null
          status: string | null
          timestamp: string | null
          type: string | null
          user_agent: string | null
        }
        Relationships: [
          {
            foreignKeyName: "request_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_logs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_search_customers: {
        Args: { search_term: string }
        Returns: {
          created_at: string
          email: string
          id: string
          name: string
          role: string
          stripe_customer_id: string
          subscription_status: string
          subscription_tier: string
        }[]
      }
      cleanup_old_demo_activity: { Args: never; Returns: undefined }
      cleanup_old_logs: { Args: never; Returns: number }
      cleanup_test_logs: { Args: never; Returns: number }
      is_admin: { Args: never; Returns: boolean }
      user_owns_site: { Args: { _site_id: string }; Returns: boolean }
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
