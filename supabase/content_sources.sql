alter table public.movies
  add column if not exists imdb_id text,
  add column if not exists tmdb_id text;

alter table public.series
  add column if not exists imdb_id text,
  add column if not exists tmdb_id text;

create index if not exists idx_movies_imdb_id on public.movies (imdb_id);
create index if not exists idx_movies_tmdb_id on public.movies (tmdb_id);
create index if not exists idx_series_imdb_id on public.series (imdb_id);
create index if not exists idx_series_tmdb_id on public.series (tmdb_id);

create table if not exists public.playback_sources (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('movie', 'series', 'episode', 'channel')),
  content_id uuid not null,
  addon_or_provider_name text not null default '',
  server_name text not null default '',
  quality text not null default 'Auto',
  language text not null default '',
  subtitle text not null default '',
  stream_url text not null,
  stream_type text not null default 'direct',
  status text not null default 'unknown' check (status in ('unknown', 'working', 'failing', 'disabled')),
  last_checked_at timestamptz,
  source_origin text not null default 'manual',
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists idx_playback_sources_unique_stream
  on public.playback_sources (content_type, content_id, stream_url);

create index if not exists idx_playback_sources_content
  on public.playback_sources (content_type, content_id);

create index if not exists idx_playback_sources_status
  on public.playback_sources (status, last_checked_at desc);

drop trigger if exists set_playback_sources_updated_at on public.playback_sources;
create trigger set_playback_sources_updated_at
  before update on public.playback_sources
  for each row execute procedure public.set_updated_at();

alter table public.playback_sources enable row level security;

drop policy if exists "playback_sources_public_read" on public.playback_sources;
create policy "playback_sources_public_read"
  on public.playback_sources for select
  using (status in ('working', 'unknown') or public.is_admin());

drop policy if exists "playback_sources_admin_all" on public.playback_sources;
create policy "playback_sources_admin_all"
  on public.playback_sources for all
  using (public.is_admin())
  with check (public.is_admin());
