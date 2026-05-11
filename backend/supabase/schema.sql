-- Appointments app — Supabase schema
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query → paste → Run).

create table if not exists public.appointments (
  id          bigserial primary key,
  title       text        not null,
  client_name text        not null default '',
  date        date        not null,
  time        time        not null,
  notes       text        not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists appointments_date_time_idx
  on public.appointments (date, time);

-- Seed data so the app has something to display on first load.
insert into public.appointments (title, client_name, date, time, notes) values
  ('Team standup',     'Engineering team', '2026-05-12', '09:30', 'Weekly sync'),
  ('Dentist',          'Dr. Khalil',       '2026-05-13', '14:00', 'Routine checkup'),
  ('Client demo',      'Acme Corp',        '2026-05-14', '11:00', 'Show new dashboard features'),
  ('Lunch with Sara',  'Sara Hassan',      '2026-05-15', '12:30', 'Discuss partnership'),
  ('Quarterly review', 'Leadership',       '2026-05-18', '15:00', 'Q2 numbers')
on conflict do nothing;

-- Row Level Security (RLS)
-- Supabase enables RLS on new tables by default. Since our backend uses the
-- SERVICE_ROLE_KEY (which bypasses RLS), the policies below only matter if
-- you ever expose this table to the public anon key directly.
alter table public.appointments enable row level security;

-- Allow anyone with the anon key to read appointments.
-- (Adjust this if you later add per-user data.)
drop policy if exists "anon can read appointments" on public.appointments;
create policy "anon can read appointments"
  on public.appointments
  for select
  to anon
  using (true);
