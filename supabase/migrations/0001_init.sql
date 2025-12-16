-- MVP schema for Staffing Sales Lead staging tool
-- Includes: pipeline stages, leads, counts view, storage bucket + public upload policies

create extension if not exists "pgcrypto";

-- =========================
-- Pipeline Stages
-- =========================
create table if not exists public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- Leads
-- =========================
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  first_name text,
  last_name text,
  company text,
  title text,
  email text,
  phone text,
  website text,
  address text,
  notes text,
  stage_id uuid not null references public.pipeline_stages(id) on delete restrict,
  card_image_path text,
  raw_ocr_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_stage_id_idx on public.leads(stage_id);
create index if not exists leads_created_at_idx on public.leads(created_at desc);

-- =========================
-- updated_at trigger
-- =========================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.pipeline_stages;
create trigger set_updated_at
before update on public.pipeline_stages
for each row
execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.leads;
create trigger set_updated_at
before update on public.leads
for each row
execute function public.set_updated_at();

-- =========================
-- Seed exact pipeline stages
-- =========================
insert into public.pipeline_stages (name, sort_order)
values
  ('Prospecting', 1),
  ('Appointment', 2),
  ('Met', 3),
  ('Sent LOE/Contract', 4),
  ('Under Contract/Closed', 5)
on conflict (name)
do update set sort_order = excluded.sort_order;

-- =========================
-- Stage counts view (handy for UI tabs)
-- =========================
create or replace view public.lead_stage_counts as
select
  s.id as stage_id,
  s.name as stage_name,
  s.sort_order as stage_sort_order,
  count(l.id) as lead_count
from public.pipeline_stages s
left join public.leads l on l.stage_id = s.id
group by s.id, s.name, s.sort_order
order by s.sort_order;

-- =========================
-- Storage bucket for card images
-- =========================
insert into storage.buckets (id, name, public)
values ('card-images', 'card-images', true)
on conflict (id)
do update set public = excluded.public, name = excluded.name;

-- NOTE: This is an MVP, single-tenant demo.
-- TODO: Tighten Storage and table access with Auth + RLS for production.
drop policy if exists "Public read card images" on storage.objects;
create policy "Public read card images"
on storage.objects
for select
to public
using (bucket_id = 'card-images');

drop policy if exists "Public insert card images" on storage.objects;
create policy "Public insert card images"
on storage.objects
for insert
to public
with check (bucket_id = 'card-images');

