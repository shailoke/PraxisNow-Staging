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
      admin_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string | null
          details: Json | null
          id: string
          target_id: string | null
          target_resource: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
          target_resource: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
          target_resource?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_turns: {
        Row: {
          answered: boolean
          content: string
          created_at: string
          dimension: string | null
          id: string
          session_id: string
          turn_index: number
          turn_type: string
          turns_in_dimension: number | null
          user_answer: string | null
          user_answer_captured_at: string | null
          user_answer_word_count: number | null
        }
        Insert: {
          answered?: boolean
          content: string
          created_at?: string
          dimension?: string | null
          id?: string
          session_id: string
          turn_index: number
          turn_type: string
          turns_in_dimension?: number | null
          user_answer?: string | null
          user_answer_captured_at?: string | null
          user_answer_word_count?: number | null
        }
        Update: {
          answered?: boolean
          content?: string
          created_at?: string
          dimension?: string | null
          id?: string
          session_id?: string
          turn_index?: number
          turn_type?: string
          turns_in_dimension?: number | null
          user_answer?: string | null
          user_answer_captured_at?: string | null
          user_answer_word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_turns_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          id: string
          metadata: Json | null
          status: Database["public"]["Enums"]["notification_status"]
          type: string
          user_id: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          metadata?: Json | null
          status?: Database["public"]["Enums"]["notification_status"]
          type: string
          user_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          metadata?: Json | null
          status?: Database["public"]["Enums"]["notification_status"]
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          amount: number
          created_at: string | null
          id: number
          order_id: string
          sessions_added: number | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: number
          order_id: string
          sessions_added?: number | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: number
          order_id?: string
          sessions_added?: number | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      scenarios: {
        Row: {
          applicant_context: string | null
          base_system_prompt: string | null
          company_context: string | null
          created_at: string | null
          created_by: string | null
          difficulty: string | null
          duration_minutes: number | null
          evaluation_dimensions: string[] | null
          id: number
          interviewer_persona: Json | null
          is_active: boolean | null
          persona: string | null
          prompt: string | null
          role: string | null
          round: number | null
          round_title: string | null
          scenario_description: string | null
          scenario_title: string | null
          scenario_type: string | null
          system_prompt: string | null
        }
        Insert: {
          applicant_context?: string | null
          base_system_prompt?: string | null
          company_context?: string | null
          created_at?: string | null
          created_by?: string | null
          difficulty?: string | null
          duration_minutes?: number | null
          evaluation_dimensions?: string[] | null
          id?: number
          interviewer_persona?: Json | null
          is_active?: boolean | null
          persona?: string | null
          prompt?: string | null
          role?: string | null
          round?: number | null
          round_title?: string | null
          scenario_description?: string | null
          scenario_title?: string | null
          scenario_type?: string | null
          system_prompt?: string | null
        }
        Update: {
          applicant_context?: string | null
          base_system_prompt?: string | null
          company_context?: string | null
          created_at?: string | null
          created_by?: string | null
          difficulty?: string | null
          duration_minutes?: number | null
          evaluation_dimensions?: string[] | null
          id?: number
          interviewer_persona?: Json | null
          is_active?: boolean | null
          persona?: string | null
          prompt?: string | null
          role?: string | null
          round?: number | null
          round_title?: string | null
          scenario_description?: string | null
          scenario_title?: string | null
          scenario_type?: string | null
          system_prompt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scenarios_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string | null
          custom_scenario_id: string | null
          duration_seconds: number | null
          evaluation_data: Json | null
          evaluation_depth: string | null
          id: string
          momentum_card: Json | null
          pdf_url: string | null
          replay_of_session_id: string | null
          round: number | null
          scenario_id: number | null
          session_type: string | null
          status: string | null
          transcript: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          custom_scenario_id?: string | null
          duration_seconds?: number | null
          evaluation_data?: Json | null
          evaluation_depth?: string | null
          id?: string
          momentum_card?: Json | null
          pdf_url?: string | null
          replay_of_session_id?: string | null
          round?: number | null
          scenario_id?: number | null
          session_type?: string | null
          status?: string | null
          transcript?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          custom_scenario_id?: string | null
          duration_seconds?: number | null
          evaluation_data?: Json | null
          evaluation_depth?: string | null
          id?: string
          momentum_card?: Json | null
          pdf_url?: string | null
          replay_of_session_id?: string | null
          round?: number | null
          scenario_id?: number | null
          session_type?: string | null
          status?: string | null
          transcript?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      support_issues: {
        Row: {
          browser_info: string | null
          created_at: string | null
          description: string | null
          id: string
          issue_type: string
          session_id: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          browser_info?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          issue_type: string
          session_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          browser_info?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          issue_type?: string
          session_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      system_errors: {
        Row: {
          category: string
          created_at: string | null
          details: Json | null
          id: string
          message: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          details?: Json | null
          id?: string
          message?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          message?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_errors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_question_history: {
        Row: {
          created_at: string | null
          id: string
          level: string
          question_text: string
          role: string
          session_id: string
          turn_index: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          level: string
          question_text: string
          role: string
          session_id: string
          turn_index: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          level?: string
          question_text?: string
          role?: string
          session_id?: string
          turn_index?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_question_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_question_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          available_sessions: number | null
          avatar_url: string | null
          created_at: string
          current_company: string | null
          designation: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          is_admin: boolean | null
          last_name: string
          onboarding_complete: boolean | null
          package_tier: string | null
          phone: string | null
          primary_role: string | null
          total_sessions_used: number | null
        }
        Insert: {
          available_sessions?: number | null
          avatar_url?: string | null
          created_at?: string
          current_company?: string | null
          designation?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean | null
          last_name?: string
          onboarding_complete?: boolean | null
          package_tier?: string | null
          phone?: string | null
          primary_role?: string | null
          total_sessions_used?: number | null
        }
        Update: {
          available_sessions?: number | null
          avatar_url?: string | null
          created_at?: string
          current_company?: string | null
          designation?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          last_name?: string
          onboarding_complete?: boolean | null
          package_tier?: string | null
          phone?: string | null
          primary_role?: string | null
          total_sessions_used?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_session_limit: { Args: { user_id: string }; Returns: boolean }
      make_admin: { Args: { user_email: string }; Returns: undefined }
    }
    Enums: {
      notification_channel: "email" | "in_app"
      notification_status: "pending" | "sent" | "failed"
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
    Enums: {
      notification_channel: ["email", "in_app"],
      notification_status: ["pending", "sent", "failed"],
    },
  },
} as const
