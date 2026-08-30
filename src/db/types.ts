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
      body_measurements: {
        Row: {
          arm_cm: number | null;
          chest_cm: number | null;
          created_at: string;
          date: string;
          hips_cm: number | null;
          id: string;
          thigh_cm: number | null;
          updated_at: string;
          user_id: string;
          waist_cm: number | null;
        };
        Insert: {
          arm_cm?: number | null;
          chest_cm?: number | null;
          created_at?: string;
          date?: string;
          hips_cm?: number | null;
          id?: string;
          thigh_cm?: number | null;
          updated_at?: string;
          user_id: string;
          waist_cm?: number | null;
        };
        Update: {
          arm_cm?: number | null;
          chest_cm?: number | null;
          created_at?: string;
          date?: string;
          hips_cm?: number | null;
          id?: string;
          thigh_cm?: number | null;
          updated_at?: string;
          user_id?: string;
          waist_cm?: number | null;
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
      food_favorites: {
        Row: {
          created_at: string;
          items: Json;
          label: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          items?: Json;
          label: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          items?: Json;
          label?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      food_logs: {
        Row: {
          created_at: string;
          date: string;
          id: string;
          items: Json;
          kashrut_class: string | null;
          logged_at: string;
          meal: string;
          photo_path: string | null;
          raw_input: string | null;
          source: string;
          totals: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          date?: string;
          id?: string;
          items?: Json;
          kashrut_class?: string | null;
          logged_at?: string;
          meal: string;
          photo_path?: string | null;
          raw_input?: string | null;
          source?: string;
          totals?: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          date?: string;
          id?: string;
          items?: Json;
          kashrut_class?: string | null;
          logged_at?: string;
          meal?: string;
          photo_path?: string | null;
          raw_input?: string | null;
          source?: string;
          totals?: Json;
          updated_at?: string;
          user_id?: string;
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
      goals: {
        Row: {
          activity_level: string;
          calorie_target: number | null;
          created_at: string;
          id: string;
          protein_target_g: number | null;
          status: string;
          target_date: string | null;
          target_weight_kg: number | null;
          tdee_estimate: number | null;
          type: string;
          updated_at: string;
          user_id: string;
          weekly_rate_pct: number | null;
        };
        Insert: {
          activity_level: string;
          calorie_target?: number | null;
          created_at?: string;
          id?: string;
          protein_target_g?: number | null;
          status?: string;
          target_date?: string | null;
          target_weight_kg?: number | null;
          tdee_estimate?: number | null;
          type: string;
          updated_at?: string;
          user_id: string;
          weekly_rate_pct?: number | null;
        };
        Update: {
          activity_level?: string;
          calorie_target?: number | null;
          created_at?: string;
          id?: string;
          protein_target_g?: number | null;
          status?: string;
          target_date?: string | null;
          target_weight_kg?: number | null;
          tdee_estimate?: number | null;
          type?: string;
          updated_at?: string;
          user_id?: string;
          weekly_rate_pct?: number | null;
        };
        Relationships: [];
      };
      health_profile: {
        Row: {
          allergies: string[];
          consent_health_data_at: string | null;
          created_at: string;
          dislikes: string[];
          medical_flags: Json;
          updated_at: string;
          user_id: string;
          wellbeing_flag: boolean;
        };
        Insert: {
          allergies?: string[];
          consent_health_data_at?: string | null;
          created_at?: string;
          dislikes?: string[];
          medical_flags?: Json;
          updated_at?: string;
          user_id: string;
          wellbeing_flag?: boolean;
        };
        Update: {
          allergies?: string[];
          consent_health_data_at?: string | null;
          created_at?: string;
          dislikes?: string[];
          medical_flags?: Json;
          updated_at?: string;
          user_id?: string;
          wellbeing_flag?: boolean;
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
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          birth_year: number | null;
          city: string | null;
          created_at: string;
          display_name: string | null;
          gender: string | null;
          height_cm: number | null;
          id: string;
          lat: number | null;
          level: number;
          lng: number | null;
          onboarding_completed_at: string | null;
          timezone: string;
          updated_at: string;
          username: string | null;
          visibility: string;
          xp: number;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          birth_year?: number | null;
          city?: string | null;
          created_at?: string;
          display_name?: string | null;
          gender?: string | null;
          height_cm?: number | null;
          id: string;
          lat?: number | null;
          level?: number;
          lng?: number | null;
          onboarding_completed_at?: string | null;
          timezone?: string;
          updated_at?: string;
          username?: string | null;
          visibility?: string;
          xp?: number;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          birth_year?: number | null;
          city?: string | null;
          created_at?: string;
          display_name?: string | null;
          gender?: string | null;
          height_cm?: number | null;
          id?: string;
          lat?: number | null;
          level?: number;
          lng?: number | null;
          onboarding_completed_at?: string | null;
          timezone?: string;
          updated_at?: string;
          username?: string | null;
          visibility?: string;
          xp?: number;
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
      tdee_proposals: {
        Row: {
          avg_intake_kcal: number;
          created_at: string;
          days_with_logs: number;
          id: string;
          new_calorie_target: number | null;
          new_tdee: number;
          old_calorie_target: number | null;
          old_tdee: number;
          status: string;
          trend_change_kg: number;
          updated_at: string;
          user_id: string;
          week_start: string;
        };
        Insert: {
          avg_intake_kcal: number;
          created_at?: string;
          days_with_logs: number;
          id?: string;
          new_calorie_target?: number | null;
          new_tdee: number;
          old_calorie_target?: number | null;
          old_tdee: number;
          status?: string;
          trend_change_kg: number;
          updated_at?: string;
          user_id: string;
          week_start: string;
        };
        Update: {
          avg_intake_kcal?: number;
          created_at?: string;
          days_with_logs?: number;
          id?: string;
          new_calorie_target?: number | null;
          new_tdee?: number;
          old_calorie_target?: number | null;
          old_tdee?: number;
          status?: string;
          trend_change_kg?: number;
          updated_at?: string;
          user_id?: string;
          week_start?: string;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          candle_offset_min: number;
          created_at: string;
          dairy_to_meat_wait_hours: number;
          israel_calendar: boolean;
          kitniyot: boolean;
          meat_to_dairy_wait_hours: number;
          minor_fasts: boolean;
          mode: string;
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
          kitniyot?: boolean;
          meat_to_dairy_wait_hours?: number;
          minor_fasts?: boolean;
          mode?: string;
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
          kitniyot?: boolean;
          meat_to_dairy_wait_hours?: number;
          minor_fasts?: boolean;
          mode?: string;
          no_fish_with_meat?: boolean;
          notif_prefs?: Json;
          quiet_hours?: Json | null;
          shomer_shabbat?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      weight_logs: {
        Row: {
          created_at: string;
          date: string;
          id: string;
          source: string;
          trend_kg: number | null;
          updated_at: string;
          user_id: string;
          weight_kg: number;
        };
        Insert: {
          created_at?: string;
          date?: string;
          id?: string;
          source?: string;
          trend_kg?: number | null;
          updated_at?: string;
          user_id: string;
          weight_kg: number;
        };
        Update: {
          created_at?: string;
          date?: string;
          id?: string;
          source?: string;
          trend_kg?: number | null;
          updated_at?: string;
          user_id?: string;
          weight_kg?: number;
        };
        Relationships: [];
      };
    };
    Views: {
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
