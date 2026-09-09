/**
 * Database types for the Kinesiotherapy Supabase project.
 *
 * Shaped exactly like the output of `supabase gen types typescript`, so that
 * `createClient<Database>()` infers row/insert/update types for every query.
 * Regenerate with:
 *
 *   supabase gen types typescript --project-id <ref> > lib/database.types.ts
 *
 * Kept in sync by hand with supabase/migrations/001_init.sql.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '12.2.3';
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
          last_session: string | null;
          streak_days: number;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id: string;
          last_session?: string | null;
          streak_days?: number;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
          last_session?: string | null;
          streak_days?: number;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          created_at: string;
          current_period_ends: string | null;
          id: string;
          plan_type: 'monthly' | 'yearly' | null;
          revenuecat_id: string | null;
          status: 'trialing' | 'active' | 'cancelled' | 'none';
          trial_ends_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          current_period_ends?: string | null;
          id?: string;
          plan_type?: 'monthly' | 'yearly' | null;
          revenuecat_id?: string | null;
          status?: 'trialing' | 'active' | 'cancelled' | 'none';
          trial_ends_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          current_period_ends?: string | null;
          id?: string;
          plan_type?: 'monthly' | 'yearly' | null;
          revenuecat_id?: string | null;
          status?: 'trialing' | 'active' | 'cancelled' | 'none';
          trial_ends_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subscriptions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      plans: {
        Row: {
          active: boolean;
          completed_days: number[];
          condition_id: string | null;
          created_at: string;
          demotion_trigger: number;
          duration_days: number;
          effort: string;
          exercise_pool: string[];
          id: string;
          last_completed_on: string | null;
          pain_ema: number;
          promotion_streak: number;
          started_at: string;
          title: string;
          user_id: string;
          user_tier: number;
        };
        Insert: {
          active?: boolean;
          completed_days?: number[];
          condition_id?: string | null;
          created_at?: string;
          demotion_trigger?: number;
          duration_days?: number;
          effort?: string;
          exercise_pool?: string[];
          id?: string;
          last_completed_on?: string | null;
          pain_ema?: number;
          promotion_streak?: number;
          started_at?: string;
          title: string;
          user_id: string;
          user_tier?: number;
        };
        Update: {
          active?: boolean;
          completed_days?: number[];
          condition_id?: string | null;
          created_at?: string;
          demotion_trigger?: number;
          duration_days?: number;
          effort?: string;
          exercise_pool?: string[];
          id?: string;
          last_completed_on?: string | null;
          pain_ema?: number;
          promotion_streak?: number;
          started_at?: string;
          title?: string;
          user_id?: string;
          user_tier?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'plans_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      plan_exercises: {
        Row: {
          day: number;
          exercise_id: string;
          hold_seconds: number;
          id: string;
          plan_id: string;
          reps: number;
          rest_seconds: number;
          sequence: number;
          sets: number;
        };
        Insert: {
          day: number;
          exercise_id: string;
          hold_seconds?: number;
          id?: string;
          plan_id: string;
          reps?: number;
          rest_seconds?: number;
          sequence: number;
          sets?: number;
        };
        Update: {
          day?: number;
          exercise_id?: string;
          hold_seconds?: number;
          id?: string;
          plan_id?: string;
          reps?: number;
          rest_seconds?: number;
          sequence?: number;
          sets?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'plan_exercises_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
        ];
      };
      sessions: {
        Row: {
          avg_pain: number | null;
          completed: boolean;
          date: string;
          day: number | null;
          duration_secs: number | null;
          id: string;
          plan_id: string;
          user_id: string;
        };
        Insert: {
          avg_pain?: number | null;
          completed?: boolean;
          date?: string;
          day?: number | null;
          duration_secs?: number | null;
          id?: string;
          plan_id: string;
          user_id: string;
        };
        Update: {
          avg_pain?: number | null;
          completed?: boolean;
          date?: string;
          day?: number | null;
          duration_secs?: number | null;
          id?: string;
          plan_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sessions_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sessions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      exercise_logs: {
        Row: {
          completed_at: string;
          exercise_id: string;
          feedback_tags: string[];
          id: string;
          notes: string | null;
          pain_level: number;
          session_id: string;
        };
        Insert: {
          completed_at?: string;
          exercise_id: string;
          feedback_tags?: string[];
          id?: string;
          notes?: string | null;
          pain_level: number;
          session_id: string;
        };
        Update: {
          completed_at?: string;
          exercise_id?: string;
          feedback_tags?: string[];
          id?: string;
          notes?: string | null;
          pain_level?: number;
          session_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'exercise_logs_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'sessions';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      handle_new_user: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
      update_streak_on_session_complete: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals['public'];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends { Insert: infer I }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends { Update: infer U }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
