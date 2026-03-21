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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
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
      custom_scenarios: {
        Row: {
          base_scenario_id: number
          company_context: string | null
          created_at: string | null
          focus_dimensions: string[] | null
          id: string
          title: string
          user_id: string
        }
        Insert: {
          base_scenario_id: number
          company_context?: string | null
          created_at?: string | null
          focus_dimensions?: string[] | null
          id?: string
          title: string
          user_id: string
        }
        Update: {
          base_scenario_id?: number
          company_context?: string | null
          created_at?: string | null
          focus_dimensions?: string[] | null
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_scenarios_base_scenario_id_fkey"
            columns: ["base_scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_turns: {
        Row: {
          answered: boolean
          content: string
          created_at: string
          id: string
          session_id: string
          turn_index: number
          turn_type: string
        }
        Insert: {
          answered?: boolean
          content: string
          created_at?: string
          id?: string
          session_id: string
          turn_index: number
          turn_type: string
        }
        Update: {
          answered?: boolean
          content?: string
          created_at?: string
          id?: string
          session_id?: string
          turn_index?: number
          turn_type?: string
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
      question_families: {
        Row: {
          created_at: string | null
          dimension: string
          family_name: string
          id: string
          prompt_guidance: string
        }
        Insert: {
          created_at?: string | null
          dimension: string
          family_name: string
          id: string
          prompt_guidance: string
        }
        Update: {
          created_at?: string | null
          dimension?: string
          family_name?: string
          id?: string
          prompt_guidance?: string
        }
        Relationships: []
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
          level: string | null
          persona: string | null
          prompt: string | null
          role: string | null
          scenario_description: string | null
          scenario_title: string | null
          scenario_type: string | null
          seeded_questions: Json | null
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
          level?: string | null
          persona?: string | null
          prompt?: string | null
          role?: string | null
          scenario_description?: string | null
          scenario_title?: string | null
          scenario_type?: string | null
          seeded_questions?: Json | null
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
          level?: string | null
          persona?: string | null
          prompt?: string | null
          role?: string | null
          scenario_description?: string | null
          scenario_title?: string | null
          scenario_type?: string | null
          seeded_questions?: Json | null
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
          alternative_approaches: string[] | null
          answer_upgrades: Json | null
          clarity: number | null
          confidence_score: number | null
          created_at: string | null
          custom_scenario_id: string | null
          duration_seconds: number | null
          evaluation: Json | null
          evaluation_data: Json | null
          evaluation_depth: string | null
          family_selections: Json | null
          framework_contrast: string | null
          id: string
          improvement_priorities: string[] | null
          key_insight: string | null
          momentum_card: Json | null
          pattern_analysis: string | null
          pdf_url: string | null
          progression_comparison: Json | null
          readiness_assessment: string | null
          recovery: number | null
          replay_comparison: Json | null
          replay_of_session_id: string | null
          risk_projection: string | null
          scenario_id: number | null
          session_type: string | null
          signal_noise: number | null
          status: string | null
          structure: number | null
          transcript: string | null
          user_id: string
        }
        Insert: {
          alternative_approaches?: string[] | null
          answer_upgrades?: Json | null
          clarity?: number | null
          confidence_score?: number | null
          created_at?: string | null
          custom_scenario_id?: string | null
          duration_seconds?: number | null
          evaluation?: Json | null
          evaluation_data?: Json | null
          evaluation_depth?: string | null
          family_selections?: Json | null
          framework_contrast?: string | null
          id?: string
          improvement_priorities?: string[] | null
          key_insight?: string | null
          momentum_card?: Json | null
          pattern_analysis?: string | null
          pdf_url?: string | null
          progression_comparison?: Json | null
          readiness_assessment?: string | null
          recovery?: number | null
          replay_comparison?: Json | null
          replay_of_session_id?: string | null
          risk_projection?: string | null
          scenario_id?: number | null
          session_type?: string | null
          signal_noise?: number | null
          status?: string | null
          structure?: number | null
          transcript?: string | null
          user_id: string
        }
        Update: {
          alternative_approaches?: string[] | null
          answer_upgrades?: Json | null
          clarity?: number | null
          confidence_score?: number | null
          created_at?: string | null
          custom_scenario_id?: string | null
          duration_seconds?: number | null
          evaluation?: Json | null
          evaluation_data?: Json | null
          evaluation_depth?: string | null
          family_selections?: Json | null
          framework_contrast?: string | null
          id?: string
          improvement_priorities?: string[] | null
          key_insight?: string | null
          momentum_card?: Json | null
          pattern_analysis?: string | null
          pdf_url?: string | null
          progression_comparison?: Json | null
          readiness_assessment?: string | null
          recovery?: number | null
          replay_comparison?: Json | null
          replay_of_session_id?: string | null
          risk_projection?: string | null
          scenario_id?: number | null
          session_type?: string | null
          signal_noise?: number | null
          status?: string | null
          structure?: number | null
          transcript?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_custom_scenario_id_fkey"
            columns: ["custom_scenario_id"]
            isOneToOne: false
            referencedRelation: "custom_scenarios"
            referencedColumns: ["id"]
          },
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
      user_family_usage: {
        Row: {
          dimension: string
          family_id: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          dimension: string
          family_id: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          dimension?: string
          family_id?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_family_usage_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "question_families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_family_usage_user_id_fkey"
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
          display_pic_url: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          is_admin: boolean | null
          last_name: string
          negotiation_credits: number | null
          onboarding_complete: boolean | null
          package_tier: string | null
          phone: string | null
          primary_role: string | null
          resume_url: string | null
          total_sessions_used: number | null
        }
        Insert: {
          available_sessions?: number | null
          avatar_url?: string | null
          created_at?: string
          current_company?: string | null
          designation?: string | null
          display_pic_url?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean | null
          last_name?: string
          negotiation_credits?: number | null
          onboarding_complete?: boolean | null
          package_tier?: string | null
          phone?: string | null
          primary_role?: string | null
          resume_url?: string | null
          total_sessions_used?: number | null
        }
        Update: {
          available_sessions?: number | null
          avatar_url?: string | null
          created_at?: string
          current_company?: string | null
          designation?: string | null
          display_pic_url?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          last_name?: string
          negotiation_credits?: number | null
          onboarding_complete?: boolean | null
          package_tier?: string | null
          phone?: string | null
          primary_role?: string | null
          resume_url?: string | null
          total_sessions_used?: number | null
        }
        Relationships: []
      }
      users_pro_plus_backup: {
        Row: {
          available_sessions: number | null
          created_at: string | null
          email: string | null
          id: string | null
          package_tier: string | null
          total_sessions_used: number | null
        }
        Insert: {
          available_sessions?: number | null
          created_at?: string | null
          email?: string | null
          id?: string | null
          package_tier?: string | null
          total_sessions_used?: number | null
        }
        Update: {
          available_sessions?: number | null
          created_at?: string | null
          email?: string | null
          id?: string | null
          package_tier?: string | null
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      notification_channel: ["email", "in_app"],
      notification_status: ["pending", "sent", "failed"],
    },
  },
} as const
