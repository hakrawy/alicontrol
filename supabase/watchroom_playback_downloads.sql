alter table public.watch_rooms
  add column if not exists stream_url text not null default '',
  add column if not exists stream_sources jsonb not null default '[]'::jsonb,
  add column if not exists subtitle_url text not null default '',
  add column if not exists source_label text not null default '';

alter table public.movies
  add column if not exists download_url text not null default '';

alter table public.episodes
  add column if not exists download_url text not null default '';
