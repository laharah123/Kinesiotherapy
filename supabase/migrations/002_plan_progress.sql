-- Kinesiotherapy: plan progress
-- Adds the per-day progress a plan needs so "today" survives a reinstall:
-- when the plan started, which schedule days are done, when the last one was
-- finished, and which schedule day a session covered.
--
-- Run via: supabase db push  (or paste into the Supabase SQL editor)

-- ─── Plans ────────────────────────────────────────────────────────────────────
alter table plans
  add column if not exists started_at        date  not null default current_date,
  add column if not exists completed_days    int[] not null default '{}',
  add column if not exists last_completed_on date;

comment on column plans.started_at        is 'Local calendar day the user started the plan.';
comment on column plans.completed_days    is '1-based schedule day numbers the user has completed.';
comment on column plans.last_completed_on is 'Local calendar day of the most recently completed schedule day.';

-- ─── Sessions ─────────────────────────────────────────────────────────────────
-- Which schedule day this session covered. Nullable: sessions recorded before
-- day tracking existed have no day, and an ad-hoc extra session may have none.
alter table sessions
  add column if not exists day int;

comment on column sessions.day is 'Schedule day (1-based) this session covered, when it came from a plan.';

-- ─── Indexes ──────────────────────────────────────────────────────────────────
-- The schedule is always read one plan at a time, in day then sequence order.
create index if not exists plan_exercises_plan_day_seq_idx
  on plan_exercises (plan_id, day, sequence);
