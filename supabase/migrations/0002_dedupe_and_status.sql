-- Dedupe + lead status for MVP
-- - Adds status (active/follow_up/do_not_contact)
-- - Adds generated normalized fields + a deterministic dedupe_key
-- - Removes existing duplicates and enforces uniqueness going forward

-- =========================
-- Lead status
-- =========================
alter table public.leads
  add column if not exists status text not null default 'active';

alter table public.leads
  drop constraint if exists leads_status_check;

alter table public.leads
  add constraint leads_status_check
  check (status in ('active', 'follow_up', 'do_not_contact'));

-- =========================
-- Deterministic dedupe fields
-- =========================
alter table public.leads
  add column if not exists email_normalized text
    generated always as (nullif(lower(trim(coalesce(email, ''))), '')) stored;

alter table public.leads
  add column if not exists phone_normalized text
    generated always as (nullif(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'), '')) stored;

-- Dedupe strategy:
-- 1) Email (strongest)
-- 2) Phone + normalized name (handles shared company phone lines)
-- 3) Name + company (fallback)
alter table public.leads
  add column if not exists dedupe_key text
    generated always as (
      case
        when nullif(lower(trim(coalesce(email, ''))), '') is not null then
          'email:' || nullif(lower(trim(coalesce(email, ''))), '')

        when nullif(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'), '') is not null
          and nullif(
            lower(
              regexp_replace(
                trim(
                  coalesce(
                    nullif(full_name, ''),
                    nullif(btrim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), ''),
                    ''
                  )
                ),
                '\s+',
                ' ',
                'g'
              )
            ),
            ''
          ) is not null then
          'phone_name:' ||
          nullif(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'), '') ||
          '|' ||
          nullif(
            lower(
              regexp_replace(
                trim(
                  coalesce(
                    nullif(full_name, ''),
                    nullif(btrim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), ''),
                    ''
                  )
                ),
                '\s+',
                ' ',
                'g'
              )
            ),
            ''
          )

        when nullif(
          lower(
            regexp_replace(
              trim(
                coalesce(
                  nullif(full_name, ''),
                  nullif(btrim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), ''),
                  ''
                )
              ),
              '\s+',
              ' ',
              'g'
            )
          ),
          ''
        ) is not null
          and nullif(
            lower(regexp_replace(trim(coalesce(company, '')), '\s+', ' ', 'g')),
            ''
          ) is not null then
          'name_company:' ||
          nullif(
            lower(
              regexp_replace(
                trim(
                  coalesce(
                    nullif(full_name, ''),
                    nullif(btrim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), ''),
                    ''
                  )
                ),
                '\s+',
                ' ',
                'g'
              )
            ),
            ''
          ) ||
          '|' ||
          nullif(
            lower(regexp_replace(trim(coalesce(company, '')), '\s+', ' ', 'g')),
            ''
          )

        else null
      end
    ) stored;

-- =========================
-- Remove existing duplicates (keep most recently updated row)
-- =========================
with ranked as (
  select
    id,
    dedupe_key,
    row_number() over (
      partition by dedupe_key
      order by updated_at desc, created_at desc
    ) as rn
  from public.leads
  where dedupe_key is not null
)
delete from public.leads
where id in (select id from ranked where rn > 1);

-- =========================
-- Enforce uniqueness + helpful indexes
-- =========================
create unique index if not exists leads_dedupe_key_uidx on public.leads (dedupe_key);
create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_email_normalized_idx on public.leads (email_normalized);
create index if not exists leads_phone_normalized_idx on public.leads (phone_normalized);
