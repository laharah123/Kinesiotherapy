// Minimal DB types — replace with `supabase gen types typescript` output once project is linked.

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          created_at: string;
          streak_days: number;
          last_session: string | null;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan_type: 'monthly' | 'yearly' | null;
          status: 'trialing' | 'active' | 'cancelled' | 'none';
          trial_ends_at: string | null;
          current_period_ends: string | null;
          revenuecat_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['subscriptions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['subscriptions']['Row']>;
      };
      plans: {
        Row: {
          id: string;
          user_id: string;
          condition_id: string | null;
          title: string;
          effort: string;
          duration_days: number;
          created_at: string;
          active: boolean;
          exercise_pool: string[];
          user_tier: number;
          pain_ema: number;
          promotion_streak: number;
          demotion_trigger: number;
        };
        Insert: Omit<Database['public']['Tables']['plans']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['plans']['Row']>;
      };
      plan_exercises: {
        Row: {
          id: string;
          plan_id: string;
          exercise_id: string;
          day: number;
          sequence: number;
          reps: number;
          sets: number;
          hold_seconds: number;
          rest_seconds: number;
        };
        Insert: Omit<Database['public']['Tables']['plan_exercises']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['plan_exercises']['Row']>;
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          plan_id: string;
          date: string;
          duration_secs: number | null;
          completed: boolean;
          avg_pain: number | null;
        };
        Insert: Omit<Database['public']['Tables']['sessions']['Row'], 'id' | 'date'>;
        Update: Partial<Database['public']['Tables']['sessions']['Row']>;
      };
      exercise_logs: {
        Row: {
          id: string;
          session_id: string;
          exercise_id: string;
          pain_level: number;
          feedback_tags: string[];
          notes: string | null;
          completed_at: string;
        };
        Insert: Omit<Database['public']['Tables']['exercise_logs']['Row'], 'id' | 'completed_at'>;
        Update: Partial<Database['public']['Tables']['exercise_logs']['Row']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
