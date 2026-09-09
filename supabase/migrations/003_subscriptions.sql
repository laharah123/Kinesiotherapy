-- Kinesiotherapy: subscriptions become server owned
-- Run via: supabase db push  (or paste into Supabase SQL editor)
--
-- Before this migration the client could insert and update its own subscription
-- rows, so any user could set status = 'active' with one API call. From here on
-- the client may only read: trials are created by a trigger, and paid state is
-- written by the revenuecat-webhook edge function with the service role key.

-- ─── Columns ──────────────────────────────────────────────────────────────────
alter table subscriptions add column if not exists revenuecat_app_user_id text;
alter table subscriptions add column if not exists product_id             text;
alter table subscriptions add column if not exists updated_at             timestamptz not null default now();

-- Backfill: the RevenueCat app user id is the Supabase user id (the client calls
-- Purchases.logIn(session.user.id)).
update subscriptions
   set revenuecat_app_user_id = user_id::text
 where revenuecat_app_user_id is null;

-- ─── One row per user ─────────────────────────────────────────────────────────
-- Collapse any duplicates first, keeping the newest row per user.
delete from subscriptions s
 using subscriptions newer
 where s.user_id = newer.user_id
   and (s.created_at < newer.created_at
        or (s.created_at = newer.created_at and s.id < newer.id));

create unique index if not exists subscriptions_user_id_key
  on subscriptions (user_id);

create index if not exists subscriptions_rc_app_user_id_idx
  on subscriptions (revenuecat_app_user_id);

-- ─── Row level security: read only for the client ─────────────────────────────
drop policy if exists "Users can insert own subscriptions" on subscriptions;
drop policy if exists "Users can update own subscriptions" on subscriptions;
-- "Users can read own subscriptions" (select) stays as created in 001_init.sql.

-- No delete policy exists, and none is added: rows follow the profile cascade.

-- ─── updated_at maintenance ───────────────────────────────────────────────────
create or replace function touch_subscription_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace trigger on_subscription_updated
  before update on subscriptions
  for each row execute procedure touch_subscription_updated_at();

-- ─── Trial creation moves to the server ───────────────────────────────────────
-- Every new profile gets a trialing row. The client no longer inserts one, so a
-- user cannot choose their own trial length or status.
create or replace function handle_new_profile_subscription()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into subscriptions (user_id, status, trial_ends_at, revenuecat_app_user_id)
  values (new.id, 'trialing', now() + interval '7 days', new.id::text)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create or replace trigger on_profile_created_subscription
  after insert on profiles
  for each row execute procedure handle_new_profile_subscription();

-- Backfill trials for profiles that predate the trigger.
insert into subscriptions (user_id, status, trial_ends_at, revenuecat_app_user_id)
select p.id, 'trialing', p.created_at + interval '7 days', p.id::text
  from profiles p
 where not exists (select 1 from subscriptions s where s.user_id = p.id)
    on conflict (user_id) do nothing;
