// supabase gen types typescript --linked 로 생성 (npm run db:types). 직접 수정하지 말 것.
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
      ai_usage: {
        Row: {
          created_at: string
          id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      catches: {
        Row: {
          count: number
          id: number
          image_path: string | null
          log_id: number
          size_cm: number | null
          species: string
          user_id: string
        }
        Insert: {
          count?: number
          id?: never
          image_path?: string | null
          log_id: number
          size_cm?: number | null
          species: string
          user_id?: string
        }
        Update: {
          count?: number
          id?: never
          image_path?: string | null
          log_id?: number
          size_cm?: number | null
          species?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catches_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "fishing_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: number
          post_id: number
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: never
          post_id: number
          user_id?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: never
          post_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "post_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dogam_notes: {
        Row: {
          memo: string
          species: string
          user_id: string
        }
        Insert: {
          memo?: string
          species: string
          user_id?: string
        }
        Update: {
          memo?: string
          species?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dogam_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fishing_logs: {
        Row: {
          created_at: string
          duration: string
          fished_on: string
          id: number
          image_path: string | null
          location: string
          memo: string
          rating: string
          user_id: string
          weather: string
        }
        Insert: {
          created_at?: string
          duration?: string
          fished_on?: string
          id?: never
          image_path?: string | null
          location?: string
          memo?: string
          rating?: string
          user_id?: string
          weather?: string
        }
        Update: {
          created_at?: string
          duration?: string
          fished_on?: string
          id?: never
          image_path?: string | null
          location?: string
          memo?: string
          rating?: string
          user_id?: string
          weather?: string
        }
        Relationships: [
          {
            foreignKeyName: "fishing_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fishing_points: {
        Row: {
          address: string
          created_at: string
          hot: boolean
          id: number
          lat: number
          lng: number
          memo: string
          name: string
          rating: number
          species: string[]
          type: string
          user_id: string | null
        }
        Insert: {
          address?: string
          created_at?: string
          hot?: boolean
          id?: never
          lat: number
          lng: number
          memo?: string
          name: string
          rating?: number
          species?: string[]
          type?: string
          user_id?: string | null
        }
        Update: {
          address?: string
          created_at?: string
          hot?: boolean
          id?: never
          lat?: number
          lng?: number
          memo?: string
          name?: string
          rating?: number
          species?: string[]
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fishing_points_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      point_favorites: {
        Row: {
          created_at: string
          point_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          point_id: number
          user_id?: string
        }
        Update: {
          created_at?: string
          point_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_favorites_point_id_fkey"
            columns: ["point_id"]
            isOneToOne: false
            referencedRelation: "fishing_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          post_id: number
          user_id: string
        }
        Insert: {
          post_id: number
          user_id?: string
        }
        Update: {
          post_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "post_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          category: string
          content: string
          created_at: string
          id: number
          image_path: string | null
          user_id: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          id?: never
          image_path?: string | null
          user_id?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: never
          image_path?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          emoji: string
          id: string
          nickname: string
        }
        Insert: {
          created_at?: string
          emoji?: string
          id: string
          nickname: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          nickname?: string
        }
        Relationships: []
      }
    }
    Views: {
      comment_feed: {
        Row: {
          author_emoji: string | null
          author_nickname: string | null
          content: string | null
          created_at: string | null
          id: number | null
          post_id: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "post_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      my_dogam: {
        Row: {
          best_location: string | null
          best_size_cm: number | null
          image_path: string | null
          last_caught_on: string | null
          memo: string | null
          species: string | null
          total_count: number | null
        }
        Relationships: []
      }
      post_feed: {
        Row: {
          author_emoji: string | null
          author_nickname: string | null
          category: string | null
          comment_count: number | null
          content: string | null
          created_at: string | null
          id: number | null
          image_path: string | null
          like_count: number | null
          liked_by_me: boolean | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      ai_usage_today: { Args: { p_user_id: string }; Returns: number }
      consume_ai_quota: {
        Args: { p_daily_limit: number; p_user_id: string }
        Returns: number
      }
      refund_ai_quota: { Args: { p_usage_id: number }; Returns: undefined }
      save_fishing_log: {
        Args: { p_catches: Json; p_log: Json; p_log_id?: number }
        Returns: number
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
