export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      admin_users: {
        Row: { created_at: string; user_id: string };
        Insert: { created_at?: string; user_id: string };
        Update: { created_at?: string; user_id?: string };
        Relationships: [];
      };
      blocks: {
        Row: { blocked_id: string; blocker_id: string; created_at: string };
        Insert: { blocked_id: string; blocker_id: string; created_at?: string };
        Update: {
          blocked_id?: string;
          blocker_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      coach_conversations: {
        Row: {
          created_at: string;
          id: string;
          title: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          title?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      coach_memories: {
        Row: {
          active: boolean;
          content: string;
          created_at: string;
          id: string;
          source_message_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          active?: boolean;
          content: string;
          created_at?: string;
          id?: string;
          source_message_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          active?: boolean;
          content?: string;
          created_at?: string;
          id?: string;
          source_message_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      coach_messages: {
        Row: {
          content: string;
          conversation_id: string;
          created_at: string;
          id: string;
          model: string | null;
          role: string;
          safety_flags: string[];
          tokens_in: number | null;
          tokens_out: number | null;
          tool_calls: Json | null;
          user_id: string;
        };
        Insert: {
          content: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          model?: string | null;
          role: string;
          safety_flags?: string[];
          tokens_in?: number | null;
          tokens_out?: number | null;
          tool_calls?: Json | null;
          user_id: string;
        };
        Update: {
          content?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          model?: string | null;
          role?: string;
          safety_flags?: string[];
          tokens_in?: number | null;
          tokens_out?: number | null;
          tool_calls?: Json | null;
          user_id?: string;
        };
        Relationships: [];
      };
      collection_members: {
        Row: {
          collection_id: string;
          created_at: string;
          role: string;
          user_id: string;
        };
        Insert: {
          collection_id: string;
          created_at?: string;
          role?: string;
          user_id: string;
        };
        Update: {
          collection_id?: string;
          created_at?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      collection_recipes: {
        Row: {
          added_by: string | null;
          collection_id: string;
          created_at: string;
          position: number;
          recipe_id: string;
        };
        Insert: {
          added_by?: string | null;
          collection_id: string;
          created_at?: string;
          position?: number;
          recipe_id: string;
        };
        Update: {
          added_by?: string | null;
          collection_id?: string;
          created_at?: string;
          position?: number;
          recipe_id?: string;
        };
        Relationships: [];
      };
      collections: {
        Row: {
          color: string;
          created_at: string;
          description: string | null;
          icon: string;
          id: string;
          name: string;
          owner_id: string;
          share_token: string;
          updated_at: string;
        };
        Insert: {
          color?: string;
          created_at?: string;
          description?: string | null;
          icon?: string;
          id?: string;
          name: string;
          owner_id: string;
          share_token?: string;
          updated_at?: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          description?: string | null;
          icon?: string;
          id?: string;
          name?: string;
          owner_id?: string;
          share_token?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      follows: {
        Row: {
          created_at: string;
          followed_id: string;
          follower_id: string;
        };
        Insert: {
          created_at?: string;
          followed_id: string;
          follower_id: string;
        };
        Update: {
          created_at?: string;
          followed_id?: string;
          follower_id?: string;
        };
        Relationships: [];
      };
      foods: {
        Row: {
          brand: string | null;
          category: string | null;
          created_at: string;
          external_id: string | null;
          hametz: boolean;
          id: string;
          is_fish: boolean;
          kashrut_class: string | null;
          kitniyot: boolean;
          kosher_hint: string | null;
          name_fr: string;
          per_100g: Json;
          search: unknown;
          source: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          brand?: string | null;
          category?: string | null;
          created_at?: string;
          external_id?: string | null;
          hametz?: boolean;
          id?: string;
          is_fish?: boolean;
          kashrut_class?: string | null;
          kitniyot?: boolean;
          kosher_hint?: string | null;
          name_fr: string;
          per_100g?: Json;
          search?: unknown;
          source: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          brand?: string | null;
          category?: string | null;
          created_at?: string;
          external_id?: string | null;
          hametz?: boolean;
          id?: string;
          is_fish?: boolean;
          kashrut_class?: string | null;
          kitniyot?: boolean;
          kosher_hint?: string | null;
          name_fr?: string;
          per_100g?: Json;
          search?: unknown;
          source?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      group_members: {
        Row: {
          created_at: string;
          group_id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          group_id: string;
          role?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          group_id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      groups: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          icon: string;
          id: string;
          name: string;
          slug: string;
          visibility: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          icon?: string;
          id?: string;
          name: string;
          slug: string;
          visibility?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          icon?: string;
          id?: string;
          name?: string;
          slug?: string;
          visibility?: string;
        };
        Relationships: [];
      };
      meal_plan_slots: {
        Row: {
          created_at: string;
          date: string;
          has_hametz: boolean;
          has_kitniyot: boolean;
          icon: string | null;
          id: string;
          is_fish: boolean;
          is_leftover: boolean;
          kashrut_class: string | null;
          kcal: number | null;
          locked: boolean;
          meal: string;
          plan_id: string;
          protein_g: number | null;
          recipe_id: string | null;
          servings: number;
          tags: string[];
          time_min: number | null;
          title: string;
        };
        Insert: {
          created_at?: string;
          date: string;
          has_hametz?: boolean;
          has_kitniyot?: boolean;
          icon?: string | null;
          id?: string;
          is_fish?: boolean;
          is_leftover?: boolean;
          kashrut_class?: string | null;
          kcal?: number | null;
          locked?: boolean;
          meal: string;
          plan_id: string;
          protein_g?: number | null;
          recipe_id?: string | null;
          servings?: number;
          tags?: string[];
          time_min?: number | null;
          title: string;
        };
        Update: {
          created_at?: string;
          date?: string;
          has_hametz?: boolean;
          has_kitniyot?: boolean;
          icon?: string | null;
          id?: string;
          is_fish?: boolean;
          is_leftover?: boolean;
          kashrut_class?: string | null;
          kcal?: number | null;
          locked?: boolean;
          meal?: string;
          plan_id?: string;
          protein_g?: number | null;
          recipe_id?: string | null;
          servings?: number;
          tags?: string[];
          time_min?: number | null;
          title?: string;
        };
        Relationships: [];
      };
      jewish_calendar_cache: {
        Row: {
          created_at: string;
          date: string;
          id: string;
          payload: Json;
          settings_hash: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          date: string;
          id?: string;
          payload: Json;
          settings_hash: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          date?: string;
          id?: string;
          payload?: Json;
          settings_hash?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      meal_plans: {
        Row: {
          created_at: string;
          generation_count: number;
          id: string;
          share_token: string;
          updated_at: string;
          user_id: string;
          week_start: string;
        };
        Insert: {
          created_at?: string;
          generation_count?: number;
          id?: string;
          share_token?: string;
          updated_at?: string;
          user_id: string;
          week_start: string;
        };
        Update: {
          created_at?: string;
          generation_count?: number;
          id?: string;
          share_token?: string;
          updated_at?: string;
          user_id?: string;
          week_start?: string;
        };
        Relationships: [];
      };
      post_comments: {
        Row: {
          author_id: string;
          created_at: string;
          id: string;
          moderation: string;
          moderation_reasons: string[];
          post_id: string;
          text: string;
        };
        Insert: {
          author_id: string;
          created_at?: string;
          id?: string;
          moderation?: string;
          moderation_reasons?: string[];
          post_id: string;
          text: string;
        };
        Update: {
          author_id?: string;
          created_at?: string;
          id?: string;
          moderation?: string;
          moderation_reasons?: string[];
          post_id?: string;
          text?: string;
        };
        Relationships: [];
      };
      post_reactions: {
        Row: {
          created_at: string;
          kind: string;
          post_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          kind: string;
          post_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          kind?: string;
          post_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      posts: {
        Row: {
          author_id: string;
          created_at: string;
          group_id: string | null;
          id: string;
          kind: string;
          moderation: string;
          moderation_reasons: string[];
          photo_paths: string[];
          recipe_id: string | null;
          text: string | null;
          updated_at: string;
          visibility: string;
        };
        Insert: {
          author_id: string;
          created_at?: string;
          group_id?: string | null;
          id?: string;
          kind?: string;
          moderation?: string;
          moderation_reasons?: string[];
          photo_paths?: string[];
          recipe_id?: string | null;
          text?: string | null;
          updated_at?: string;
          visibility?: string;
        };
        Update: {
          author_id?: string;
          created_at?: string;
          group_id?: string | null;
          id?: string;
          kind?: string;
          moderation?: string;
          moderation_reasons?: string[];
          photo_paths?: string[];
          recipe_id?: string | null;
          text?: string | null;
          updated_at?: string;
          visibility?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          endpoint: string;
          id: string;
          p256dh: string;
          user_id: string;
        };
        Insert: {
          auth: string;
          created_at?: string;
          endpoint: string;
          id?: string;
          p256dh: string;
          user_id: string;
        };
        Update: {
          auth?: string;
          created_at?: string;
          endpoint?: string;
          id?: string;
          p256dh?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          city: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          lat: number | null;
          lng: number | null;
          onboarding_completed_at: string | null;
          timezone: string;
          updated_at: string;
          username: string | null;
          visibility: string;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          city?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
          lat?: number | null;
          lng?: number | null;
          onboarding_completed_at?: string | null;
          timezone?: string;
          updated_at?: string;
          username?: string | null;
          visibility?: string;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          city?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          onboarding_completed_at?: string | null;
          timezone?: string;
          updated_at?: string;
          username?: string | null;
          visibility?: string;
        };
        Relationships: [];
      };
      recipe_comments: {
        Row: {
          created_at: string;
          id: string;
          recipe_id: string;
          text: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          recipe_id: string;
          text: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          recipe_id?: string;
          text?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      recipe_ingredients: {
        Row: {
          created_at: string;
          food_id: string | null;
          grams: number | null;
          id: string;
          label_raw: string;
          position: number;
          qty: number | null;
          recipe_id: string;
          section: string | null;
          unit: string | null;
        };
        Insert: {
          created_at?: string;
          food_id?: string | null;
          grams?: number | null;
          id?: string;
          label_raw: string;
          position?: number;
          qty?: number | null;
          recipe_id: string;
          section?: string | null;
          unit?: string | null;
        };
        Update: {
          created_at?: string;
          food_id?: string | null;
          grams?: number | null;
          id?: string;
          label_raw?: string;
          position?: number;
          qty?: number | null;
          recipe_id?: string;
          section?: string | null;
          unit?: string | null;
        };
        Relationships: [];
      };
      recipe_likes: {
        Row: {
          created_at: string;
          recipe_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          recipe_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          recipe_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      recipe_notes: {
        Row: {
          created_at: string;
          recipe_id: string;
          text: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          recipe_id: string;
          text: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          recipe_id?: string;
          text?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      recipe_saves: {
        Row: {
          created_at: string;
          recipe_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          recipe_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          recipe_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      recipe_steps: {
        Row: {
          created_at: string;
          duration_sec: number | null;
          id: string;
          photo_path: string | null;
          position: number;
          recipe_id: string;
          section: string | null;
          text: string;
        };
        Insert: {
          created_at?: string;
          duration_sec?: number | null;
          id?: string;
          photo_path?: string | null;
          position?: number;
          recipe_id: string;
          section?: string | null;
          text: string;
        };
        Update: {
          created_at?: string;
          duration_sec?: number | null;
          id?: string;
          photo_path?: string | null;
          position?: number;
          recipe_id?: string;
          section?: string | null;
          text?: string;
        };
        Relationships: [];
      };
      recipes: {
        Row: {
          author_id: string | null;
          category: string | null;
          cook_min: number | null;
          created_at: string;
          description: string | null;
          difficulty: string | null;
          icon: string | null;
          id: string;
          is_fish: boolean;
          kashrut_class: string | null;
          kashrut_confidence: number | null;
          kosher_flags: string[];
          nutrition_per_serving: Json;
          origin: string | null;
          parent_recipe_id: string | null;
          photo_paths: string[];
          prep_min: number | null;
          search: unknown;
          servings: number;
          slug: string;
          source_author: string | null;
          source_url: string | null;
          status: string;
          substitutions: Json | null;
          tags: string[];
          title: string;
          updated_at: string;
          version_kind: string;
          visibility: string;
        };
        Insert: {
          author_id?: string | null;
          category?: string | null;
          cook_min?: number | null;
          created_at?: string;
          description?: string | null;
          difficulty?: string | null;
          icon?: string | null;
          id?: string;
          is_fish?: boolean;
          kashrut_class?: string | null;
          kashrut_confidence?: number | null;
          kosher_flags?: string[];
          nutrition_per_serving?: Json;
          origin?: string | null;
          parent_recipe_id?: string | null;
          photo_paths?: string[];
          prep_min?: number | null;
          search?: unknown;
          servings?: number;
          slug: string;
          source_author?: string | null;
          source_url?: string | null;
          status?: string;
          substitutions?: Json | null;
          tags?: string[];
          title: string;
          updated_at?: string;
          version_kind?: string;
          visibility?: string;
        };
        Update: {
          author_id?: string | null;
          category?: string | null;
          cook_min?: number | null;
          created_at?: string;
          description?: string | null;
          difficulty?: string | null;
          icon?: string | null;
          id?: string;
          is_fish?: boolean;
          kashrut_class?: string | null;
          kashrut_confidence?: number | null;
          kosher_flags?: string[];
          nutrition_per_serving?: Json;
          origin?: string | null;
          parent_recipe_id?: string | null;
          photo_paths?: string[];
          prep_min?: number | null;
          search?: unknown;
          servings?: number;
          slug?: string;
          source_author?: string | null;
          source_url?: string | null;
          status?: string;
          substitutions?: Json | null;
          tags?: string[];
          title?: string;
          updated_at?: string;
          version_kind?: string;
          visibility?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          created_at: string;
          id: string;
          reason: string;
          reporter_id: string;
          status: string;
          target_id: string;
          target_kind: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          reason: string;
          reporter_id: string;
          status?: string;
          target_id: string;
          target_kind: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          reason?: string;
          reporter_id?: string;
          status?: string;
          target_id?: string;
          target_kind?: string;
        };
        Relationships: [];
      };
      shopping_items: {
        Row: {
          aisle: string;
          checked: boolean;
          created_at: string;
          grams: number | null;
          id: string;
          kosher_note: boolean;
          label: string;
          plan_id: string;
          position: number;
        };
        Insert: {
          aisle?: string;
          checked?: boolean;
          created_at?: string;
          grams?: number | null;
          id?: string;
          kosher_note?: boolean;
          label: string;
          plan_id: string;
          position?: number;
        };
        Update: {
          aisle?: string;
          checked?: boolean;
          created_at?: string;
          grams?: number | null;
          id?: string;
          kosher_note?: boolean;
          label?: string;
          plan_id?: string;
          position?: number;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          candle_offset_min: number;
          created_at: string;
          dairy_to_meat_wait_hours: number;
          israel_calendar: boolean;
          jewish_calendar_enabled: boolean;
          kashrut_enabled: boolean;
          kitniyot: boolean;
          meat_to_dairy_wait_hours: number;
          minor_fasts: boolean;
          no_fish_with_meat: boolean;
          notif_prefs: Json;
          quiet_hours: Json | null;
          shomer_shabbat: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          candle_offset_min?: number;
          created_at?: string;
          dairy_to_meat_wait_hours?: number;
          israel_calendar?: boolean;
          jewish_calendar_enabled?: boolean;
          kashrut_enabled?: boolean;
          kitniyot?: boolean;
          meat_to_dairy_wait_hours?: number;
          minor_fasts?: boolean;
          no_fish_with_meat?: boolean;
          notif_prefs?: Json;
          quiet_hours?: Json | null;
          shomer_shabbat?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          candle_offset_min?: number;
          created_at?: string;
          dairy_to_meat_wait_hours?: number;
          israel_calendar?: boolean;
          jewish_calendar_enabled?: boolean;
          kashrut_enabled?: boolean;
          kitniyot?: boolean;
          meat_to_dairy_wait_hours?: number;
          minor_fasts?: boolean;
          no_fish_with_meat?: boolean;
          notif_prefs?: Json;
          quiet_hours?: Json | null;
          shomer_shabbat?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      post_stats: {
        Row: {
          bravo: number;
          comments: number;
          love: number;
          miam: number;
          post_id: string;
        };
        Relationships: [];
      };
      recipe_social_stats: {
        Row: {
          comments: number;
          likes: number;
          recipe_id: string;
          saves: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      admin_set_moderation: {
        Args: { target_kind: string; target_id: string; new_status: string };
        Returns: boolean;
      };
      group_readable: {
        Args: { gid: string };
        Returns: boolean;
      };
      is_admin: {
        Args: never;
        Returns: boolean;
      };
      is_group_member: {
        Args: { gid: string };
        Returns: boolean;
      };
      can_view_via_collection: {
        Args: { rid: string };
        Returns: boolean;
      };
      compute_recipe_nutrition: {
        Args: { rid: string };
        Returns: Json;
      };
      is_collection_member: {
        Args: { cid: string };
        Returns: boolean;
      };
      is_collection_owner: {
        Args: { cid: string };
        Returns: boolean;
      };
      join_collection: {
        Args: { token: string };
        Returns: string | null;
      };
      shopping_list_by_token: {
        Args: { token: string };
        Returns: Json;
      };
      search_foods: {
        Args: { max_results?: number; q: string };
        Returns: {
          brand: string | null;
          category: string | null;
          created_at: string;
          external_id: string | null;
          hametz: boolean;
          id: string;
          is_fish: boolean;
          kashrut_class: string | null;
          kitniyot: boolean;
          kosher_hint: string | null;
          name_fr: string;
          per_100g: Json;
          search: unknown;
          source: string;
          updated_at: string;
          user_id: string | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "foods";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { "": string }; Returns: string[] };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
