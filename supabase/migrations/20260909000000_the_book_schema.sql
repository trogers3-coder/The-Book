-- The Book: career archive schema
-- All tables have RLS enabled with no policies, so only the Supabase
-- service role (used server-side by the app's API routes) can read/write
-- them. The anon/authenticated keys never touch these tables.

create extension if not exists "pgcrypto";

-- One row per connected Gmail inbox. Tokens are encrypted at the
-- application layer (AES-256-GCM, see src/lib/crypto.ts) before storage;
-- the DB never sees a raw refresh token.
create table public.gmail_accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text,
  access_token_encrypted text,
  refresh_token_encrypted text not null,
  token_expiry timestamptz,
  history_id text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.gmail_accounts enable row level security;

-- One row per synced Gmail message (only messages the sync heuristics
-- flagged as plausible call sheets are pulled down, not the whole inbox).
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.gmail_accounts(id) on delete cascade,
  gmail_message_id text not null,
  gmail_thread_id text,
  subject text,
  from_address text,
  from_name text,
  to_addresses text[] not null default '{}',
  message_date timestamptz,
  snippet text,
  body_text text,
  body_html text,
  has_attachments boolean not null default false,
  synced_at timestamptz not null default now(),
  unique (account_id, gmail_message_id)
);

alter table public.messages enable row level security;
create index messages_account_id_idx on public.messages(account_id);
create index messages_message_date_idx on public.messages(message_date);

-- Attachments belonging to a message. Binary content lives in Supabase
-- Storage (bucket "call-sheet-attachments"); this row is metadata plus
-- any text we managed to extract from it (PDF text layer, etc.).
create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  gmail_attachment_id text,
  filename text,
  mime_type text,
  size_bytes integer,
  storage_path text,
  extracted_text text,
  created_at timestamptz not null default now()
);

alter table public.attachments enable row level security;
create index attachments_message_id_idx on public.attachments(message_id);

-- Structured, extracted call sheet data — this is what the app searches
-- and browses. One message can in principle yield more than one call
-- sheet (e.g. a multi-project digest), so this is its own table rather
-- than columns bolted onto messages.
create table public.call_sheets (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  account_id uuid not null references public.gmail_accounts(id) on delete cascade,
  source_attachment_id uuid references public.attachments(id) on delete set null,

  shoot_date date,
  shoot_end_date date,
  call_time text,
  wrap_time text,

  client text,
  brand text,
  project_name text,
  role text,

  day_rate numeric,
  rate_unit text,
  rate_currency text default 'USD',
  usage_terms text,

  location_name text,
  location_address text,

  agency text,
  agent_name text,
  agent_email text,
  agent_phone text,
  photographer text,
  contacts jsonb not null default '[]',

  wardrobe_notes text,
  notes text,
  tags text[] not null default '{}',

  confidence numeric,
  raw_extraction jsonb,

  search_text text generated always as (
    coalesce(client, '') || ' ' ||
    coalesce(brand, '') || ' ' ||
    coalesce(project_name, '') || ' ' ||
    coalesce(role, '') || ' ' ||
    coalesce(location_name, '') || ' ' ||
    coalesce(location_address, '') || ' ' ||
    coalesce(agency, '') || ' ' ||
    coalesce(agent_name, '') || ' ' ||
    coalesce(photographer, '') || ' ' ||
    coalesce(notes, '') || ' ' ||
    coalesce(wardrobe_notes, '')
  ) stored,
  search_vector tsvector generated always as (
    to_tsvector('english',
      coalesce(client, '') || ' ' ||
      coalesce(brand, '') || ' ' ||
      coalesce(project_name, '') || ' ' ||
      coalesce(role, '') || ' ' ||
      coalesce(location_name, '') || ' ' ||
      coalesce(location_address, '') || ' ' ||
      coalesce(agency, '') || ' ' ||
      coalesce(agent_name, '') || ' ' ||
      coalesce(photographer, '') || ' ' ||
      coalesce(notes, '') || ' ' ||
      coalesce(wardrobe_notes, '')
    )
  ) stored,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.call_sheets enable row level security;
create index call_sheets_message_id_idx on public.call_sheets(message_id);
create index call_sheets_account_id_idx on public.call_sheets(account_id);
create index call_sheets_shoot_date_idx on public.call_sheets(shoot_date);
create index call_sheets_search_vector_idx on public.call_sheets using gin(search_vector);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger call_sheets_set_updated_at
  before update on public.call_sheets
  for each row execute function public.set_updated_at();

-- One row per sync attempt, for visibility into what happened / debugging.
create table public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.gmail_accounts(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  messages_found integer not null default 0,
  messages_processed integer not null default 0,
  call_sheets_extracted integer not null default 0,
  status text not null default 'running',
  error text
);

alter table public.sync_runs enable row level security;
create index sync_runs_account_id_idx on public.sync_runs(account_id);
