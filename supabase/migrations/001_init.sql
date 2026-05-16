-- Kinesiotherapy — initial schema
-- Run via: supabase db push  (or paste into Supabase SQL editor)

-- ─── Extensions ───────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Profiles ─────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  created_at    timestamptz not null default now(),
  streak_days   int         not null default 0,
  last_session  date
);

alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─── Subscriptions ────────────────────────────────────────────────────────────
create table if not exists subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references profiles(id) on delete cascade,
  plan_type             text check (plan_type in ('monthly', 'yearly')),
  status                text not null default 'trialing'
                          check (status in ('trialing', 'active', 'cancelled', 'none')),
  trial_ends_at         timestamptz,
  current_period_ends   timestamptz,
  revenuecat_id         text,
  created_at            timestamptz not null default now()
);

alter table subscriptions enable row level security;

create policy "Users can read own subscriptions"
  on subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can insert own subscriptions"
  on subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own subscriptions"
  on subscriptions for update
  using (auth.uid() = user_id);

-- ─── Plans ────────────────────────────────────────────────────────────────────
create table if not exists plans (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles(id) on delete cascade,
  condition_id     text,
  title            text not null,
  effort           text not null default 'Light'
                     check (effort in ('Light', 'Moderate', 'Vigorous')),
  duration_days    int  not null default 28,
  created_at       timestamptz not null default now(),
  active           bool not null default true,
  exercise_pool    text[]       not null default '{}',
  user_tier        int  not null default 1 check (user_tier between 1 and 3),
  pain_ema         numeric(4,2) not null default 2.0,
  promotion_streak int  not null default 0,
  demotion_trigger int  not null default 0
);

alter table plans enable row level security;

create policy "Users can manage own plans"
  on plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Only one active plan per user
create unique index if not exists plans_user_active_idx
  on plans (user_id) where active = true;

-- ─── Plan exercises ────────────────────────────────────────────────────────────
create table if not exists plan_exercises (
  id            uuid primary key default gen_random_uuid(),
  plan_id       uuid not null references plans(id) on delete cascade,
  exercise_id   text not null,
  day           int  not null,
  sequence      int  not null,
  reps          int  not null default 10,
  sets          int  not null default 2,
  hold_seconds  int  not null default 0,
  rest_seconds  int  not null default 20
);

alter table plan_exercises enable row level security;

create policy "Users can manage own plan exercises"
  on plan_exercises for all
  using (
    exists (
      select 1 from plans
      where plans.id = plan_exercises.plan_id
        and plans.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from plans
      where plans.id = plan_exercises.plan_id
        and plans.user_id = auth.uid()
    )
  );

-- ─── Sessions ─────────────────────────────────────────────────────────────────
create table if not exists sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles(id) on delete cascade,
  plan_id        uuid not null references plans(id),
  date           date not null default current_date,
  duration_secs  int,
  completed      bool not null default false,
  avg_pain       numeric(3,1)
);

alter table sessions enable row level security;

create policy "Users can manage own sessions"
  on sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists sessions_user_date_idx on sessions (user_id, date desc);

-- ─── Exercise logs ─────────────────────────────────────────────────────────────
create table if not exists exercise_logs (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references sessions(id) on delete cascade,
  exercise_id   text not null,
  pain_level    int  not null check (pain_level between 0 and 4),
  feedback_tags text[]       not null default '{}',
  notes         text,
  completed_at  timestamptz not null default now()
);

alter table exercise_logs enable row level security;

create policy "Users can manage own exercise logs"
  on exercise_logs for all
  using (
    exists (
      select 1 from sessions
      where sessions.id = exercise_logs.session_id
        and sessions.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from sessions
      where sessions.id = exercise_logs.session_id
        and sessions.user_id = auth.uid()
    )
  );

-- ─── Streak update function ────────────────────────────────────────────────────
-- Called after a session is marked completed; updates streak_days on profiles.
create or replace function update_streak_on_session_complete()
returns trigger language plpgsql security definer as $$
declare
  v_last_session date;
  v_streak       int;
begin
  if new.completed = false or old.completed = true then
    return new;
  end if;

  select last_session, streak_days
    into v_last_session, v_streak
    from profiles
   where id = new.user_id;

  if v_last_session = current_date - interval '1 day' then
    v_streak := coalesce(v_streak, 0) + 1;
  elsif v_last_session = current_date then
    -- same day, no change
  else
    v_streak := 1;
  end if;

  update profiles
     set streak_days  = v_streak,
         last_session = current_date
   where id = new.user_id;

  return new;
end;
$$;

create or replace trigger on_session_completed
  after update on sessions
  for each row execute procedure update_streak_on_session_complete();
