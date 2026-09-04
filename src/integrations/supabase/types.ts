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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ai_api_keys: {
        Row: {
          api_key: string
          created_at: string
          id: string
          is_active: boolean
          key_prefix: string
          label: string
          last_error_at: string | null
          last_error_message: string | null
          last_used_at: string | null
          priority: number
          status: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          api_key: string
          created_at?: string
          id?: string
          is_active?: boolean
          key_prefix: string
          label?: string
          last_error_at?: string | null
          last_error_message?: string | null
          last_used_at?: string | null
          priority?: number
          status?: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          is_active?: boolean
          key_prefix?: string
          label?: string
          last_error_at?: string | null
          last_error_message?: string | null
          last_used_at?: string | null
          priority?: number
          status?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: []
      }
      ai_settings: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          model_coach: string
          model_compatibility: string
          model_icebreaker: string
          model_kyc: string
          model_match: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          model_coach?: string
          model_compatibility?: string
          model_icebreaker?: string
          model_kyc?: string
          model_match?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          model_coach?: string
          model_compatibility?: string
          model_icebreaker?: string
          model_kyc?: string
          model_match?: string
          updated_at?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          badge_type: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_type: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_type?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      boosts: {
        Row: {
          expires_at: string
          id: string
          started_at: string
          user_id: string
        }
        Insert: {
          expires_at?: string
          id?: string
          started_at?: string
          user_id: string
        }
        Update: {
          expires_at?: string
          id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      call_signals: {
        Row: {
          callee_id: string
          caller_id: string
          created_at: string
          id: string
          signal_data: Json
          signal_type: string
        }
        Insert: {
          callee_id: string
          caller_id: string
          created_at?: string
          id?: string
          signal_data: Json
          signal_type: string
        }
        Update: {
          callee_id?: string
          caller_id?: string
          created_at?: string
          id?: string
          signal_data?: Json
          signal_type?: string
        }
        Relationships: []
      }
      event_attendees: {
        Row: {
          event_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          event_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          event_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          city: string
          created_at: string
          creator_id: string
          description: string | null
          event_date: string
          id: string
          image_url: string | null
          max_attendees: number | null
          title: string
        }
        Insert: {
          city: string
          created_at?: string
          creator_id: string
          description?: string | null
          event_date: string
          id?: string
          image_url?: string | null
          max_attendees?: number | null
          title: string
        }
        Update: {
          city?: string
          created_at?: string
          creator_id?: string
          description?: string | null
          event_date?: string
          id?: string
          image_url?: string | null
          max_attendees?: number | null
          title?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          is_super: boolean
          to_user_id: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          is_super?: boolean
          to_user_id: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          is_super?: boolean
          to_user_id?: string
        }
        Relationships: []
      }
      profile_passes: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          to_user_id: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          to_user_id: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          to_user_id?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          audio_url: string | null
          content: string
          created_at: string
          id: string
          message_type: string
          read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          audio_url?: string | null
          content: string
          created_at?: string
          id?: string
          message_type?: string
          read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          audio_url?: string | null
          content?: string
          created_at?: string
          id?: string
          message_type?: string
          read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read: boolean
          related_user_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          related_user_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          related_user_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_photos: {
        Row: {
          created_at: string
          id: string
          photo_url: string
          position: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          photo_url: string
          position?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          photo_url?: string
          position?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          date_of_birth: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          display_name: string | null
          gender: string | null
          id: string
          incognito_mode: boolean
          interests: string[] | null
          is_admin: boolean
          is_verified: boolean
          last_seen: string | null
          latitude: number | null
          longitude: number | null
          looking_for: string | null
          country: string | null
          religion: string | null
          relationship_type: string | null
          occupation: string | null
          occupation_sector: string | null
          partner_preferences: string[] | null
          updated_at: string
          user_id: string
          verification_photo_url: string | null
          verification_status: string
          notif_matches: boolean
          notif_messages: boolean
          notif_likes: boolean
          notif_events: boolean
          sumsub_applicant_id: string | null
        }
        Insert: {
          age?: number | null
          date_of_birth?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          gender?: string | null
          id?: string
          incognito_mode?: boolean
          interests?: string[] | null
          is_verified?: boolean
          last_seen?: string | null
          latitude?: number | null
          longitude?: number | null
          looking_for?: string | null
          country?: string | null
          religion?: string | null
          relationship_type?: string | null
          occupation?: string | null
          occupation_sector?: string | null
          partner_preferences?: string[] | null
          updated_at?: string
          user_id: string
          verification_photo_url?: string | null
          verification_status?: string
          notif_matches?: boolean
          notif_messages?: boolean
          notif_likes?: boolean
          notif_events?: boolean
          sumsub_applicant_id?: string | null
        }
        Update: {
          age?: number | null
          date_of_birth?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          gender?: string | null
          id?: string
          incognito_mode?: boolean
          interests?: string[] | null
          is_verified?: boolean
          last_seen?: string | null
          latitude?: number | null
          longitude?: number | null
          looking_for?: string | null
          country?: string | null
          religion?: string | null
          relationship_type?: string | null
          occupation?: string | null
          occupation_sector?: string | null
          partner_preferences?: string[] | null
          updated_at?: string
          user_id?: string
          verification_photo_url?: string | null
          verification_status?: string
          notif_matches?: boolean
          notif_messages?: boolean
          notif_likes?: boolean
          notif_events?: boolean
          sumsub_applicant_id?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reported_id: string
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reported_id: string
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reported_id?: string
          reporter_id?: string
          status?: string
        }
        Relationships: []
      }
      speed_dating_queue: {
        Row: {
          id: string
          joined_at: string
          matched_with: string | null
          session_started_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          matched_with?: string | null
          session_started_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          matched_with?: string | null
          session_started_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          caption: string | null
          created_at: string
          expires_at: string
          id: string
          media_url: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_url: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_url?: string
          user_id?: string
        }
        Relationships: []
      }
      story_views: {
        Row: {
          id: string
          story_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          id?: string
          story_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          id?: string
          story_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      verification_requests: {
        Row: {
          admin_notes: string | null
          auto_review_status: string | null
          created_at: string
          document_type: string | null
          external_id: string | null
          face_match_score: number | null
          id: string
          id_document_url: string | null
          id_document_verso_url: string | null
          liveness_score: number | null
          pose_challenge: string | null
          provider: string | null
          recent_photo_1_url: string | null
          recent_photo_2_url: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_url: string
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          auto_review_status?: string | null
          created_at?: string
          document_type?: string | null
          external_id?: string | null
          face_match_score?: number | null
          id?: string
          id_document_url?: string | null
          id_document_verso_url?: string | null
          liveness_score?: number | null
          pose_challenge?: string | null
          provider?: string | null
          recent_photo_1_url?: string | null
          recent_photo_2_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url: string
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          auto_review_status?: string | null
          created_at?: string
          document_type?: string | null
          external_id?: string | null
          face_match_score?: number | null
          id?: string
          id_document_url?: string | null
          id_document_verso_url?: string | null
          liveness_score?: number | null
          pose_challenge?: string | null
          provider?: string | null
          recent_photo_1_url?: string | null
          recent_photo_2_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_orders: {
        Row: {
          amount: number
          billing_period: string
          client_name: string | null
          client_phone: string | null
          created_at: string
          id: string
          is_renewal: boolean
          plan: Database["public"]["Enums"]["subscription_plan"] | null
          product_type: string
          product_sku: string | null
          status: string
          token_pay: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          id?: string
          is_renewal?: boolean
          plan?: Database["public"]["Enums"]["subscription_plan"] | null
          product_type?: string
          product_sku?: string | null
          billing_period?: string
          status?: string
          token_pay?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          id?: string
          is_renewal?: boolean
          plan?: Database["public"]["Enums"]["subscription_plan"] | null
          product_type?: string
          product_sku?: string | null
          status?: string
          token_pay?: string | null
          updated_at?: string
          user_id: string
        }
        Relationships: []
      }
      user_entitlements: {
        Row: {
          id: string
          user_id: string
          sku: string
          expires_at: string
          source_order_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          sku: string
          expires_at: string
          source_order_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          sku?: string
          expires_at?: string
          source_order_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      push_devices: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
          endpoint: string | null
          p256dh: string | null
          auth_key: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          token: string
          updated_at?: string
          user_id: string
          endpoint?: string | null
          p256dh?: string | null
          auth_key?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
          endpoint?: string | null
          p256dh?: string | null
          auth_key?: string | null
        }
        Relationships: []
      }
      push_queue: {
        Row: {
          body: string | null
          created_at: string
          id: string
          notification_type: string | null
          processed: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          notification_type?: string | null
          processed?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          notification_type?: string | null
          processed?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_distance: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      get_smart_matches: {
        Args: { p_limit?: number; p_max_distance?: number }
        Returns: {
          age: number
          avatar_url: string
          bio: string
          city: string
          compatibility_score: number
          display_name: string
          distance_km: number
          gender: string
          interests: string[]
          is_verified: boolean
          last_seen: string
          looking_for: string
          user_id: string
        }[]
      }
      get_discover_profiles: {
        Args: {
          p_limit?: number
          p_city?: string | null
          p_age_min?: number | null
          p_age_max?: number | null
          p_gender?: string | null
          p_looking_for?: string | null
          p_verified_only?: boolean
          p_online_only?: boolean
          p_interests?: string[] | null
        }
        Returns: Database["public"]["Tables"]["profiles"]["Row"][]
      }
      cleanup_expired_platform_data: { Args: Record<PropertyKey, never>; Returns: Json }
      get_user_plan: { Args: { p_user_id: string }; Returns: string }
      check_and_award_badges: { Args: Record<PropertyKey, never>; Returns: undefined }
      notify_story_like: { Args: { p_story_id: string }; Returns: undefined }
      admin_set_subscription: {
        Args: {
          p_user_id: string
          p_plan: Database["public"]["Enums"]["subscription_plan"]
          p_expires_at?: string | null
        }
        Returns: undefined
      }
      admin_get_ai_config: { Args: Record<PropertyKey, never>; Returns: Json }
      admin_add_ai_key: {
        Args: { p_label: string; p_api_key: string; p_priority?: number }
        Returns: string
      }
      admin_update_ai_key: {
        Args: {
          p_id: string
          p_label?: string | null
          p_priority?: number | null
          p_is_active?: boolean | null
        }
        Returns: undefined
      }
      admin_reset_ai_key: { Args: { p_id: string }; Returns: undefined }
      admin_delete_ai_key: { Args: { p_id: string }; Returns: undefined }
      admin_update_ai_settings: {
        Args: {
          p_enabled: boolean
          p_model_match: string
          p_model_compatibility: string
          p_model_icebreaker: string
          p_model_coach: string
          p_model_kyc: string
        }
        Returns: undefined
      }
      admin_get_stats: { Args: Record<PropertyKey, never>; Returns: Json }
      admin_review_verification: {
        Args: {
          p_request_id: string
          p_approved: boolean
          p_rejection_reason?: string | null
          p_admin_notes?: string | null
        }
        Returns: undefined
      }
      submit_verification_request: {
        Args: {
          p_selfie_url: string
          p_id_document_url: string
          p_id_document_verso_url: string
          p_recent_photo_1_url: string
          p_recent_photo_2_url: string
          p_document_type?: string
          p_pose_challenge?: string | null
        }
        Returns: string
      }
      admin_set_admin: {
        Args: { p_user_id: string; p_is_admin: boolean }
        Returns: undefined
      }
      admin_send_notification: {
        Args: { p_title: string; p_body: string; p_user_id?: string | null }
        Returns: number
      }
      fulfill_payment_by_token: {
        Args: { p_token: string; p_expected_amount?: number | null }
        Returns: boolean
      }
      user_can_start_paid_trial: {
        Args: { p_user_id?: string }
        Returns: boolean
      }
      claim_vip_weekly_spotlight: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_mutual_match_user_ids: { Args: Record<PropertyKey, never>; Returns: string[] }
      has_liked_me: { Args: { p_user_id: string }; Returns: boolean }
      get_public_profile_stats: {
        Args: { p_user_id: string }
        Returns: { like_count: number; match_count: number }[]
      }
      join_speed_dating_queue: {
        Args: Record<PropertyKey, never>
        Returns: { status: string; queue_id: string; partner_id?: string }
      }
      get_active_boosted_user_ids: { Args: Record<PropertyKey, never>; Returns: string[] }
      get_vip_user_ids: { Args: { p_user_ids: string[] }; Returns: string[] }
      get_blocked_relationship_ids: { Args: Record<PropertyKey, never>; Returns: string[] }
      get_my_blocked_users: {
        Args: Record<PropertyKey, never>
        Returns: { user_id: string; display_name: string | null; avatar_url: string | null }[]
      }
      are_mutual_matches: { Args: { p_user_a: string; p_user_b: string }; Returns: boolean }
      is_user_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
      get_incoming_likers: {
        Args: Record<PropertyKey, never>
        Returns: {
          like_id: string
          user_id: string | null
          display_name: string | null
          avatar_url: string | null
          age: number | null
          city: string | null
          bio: string | null
          interests: string[] | null
          is_verified: boolean
          last_seen: string | null
          liked_at: string
          is_super: boolean
          is_revealed: boolean
        }[]
      }
      export_my_data: { Args: Record<PropertyKey, never>; Returns: Json }
      register_push_device: {
        Args: {
          p_token: string
          p_platform: string
          p_endpoint?: string | null
          p_p256dh?: string | null
          p_auth_key?: string | null
        }
        Returns: undefined
      }
      complete_identity_verification: {
        Args: {
          p_user_id: string
          p_provider?: string
          p_external_id?: string | null
        }
        Returns: undefined
      }
      send_subscription_renewal_reminders: { Args: Record<PropertyKey, never>; Returns: number }
    }
    Enums: {
      subscription_plan: "free" | "plus" | "premium" | "vip"
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
      subscription_plan: ["free", "plus", "premium", "vip"],
    },
  },
} as const
