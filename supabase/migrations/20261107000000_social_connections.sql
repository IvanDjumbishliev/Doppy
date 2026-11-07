create table if not exists public.social_connections (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  platform text not null check (platform in ('instagram', 'tiktok', 'youtube')),
  platform_user_id text not null,
  username text not null,
  display_name text,
  avatar_url text,
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  scopes text not null,
  updated_at timestamptz not null default now(),
  unique (session_id, platform)
);

alter table public.social_connections enable row level security;
revoke all on table public.social_connections from anon, authenticated;
grant all on table public.social_connections to service_role;
