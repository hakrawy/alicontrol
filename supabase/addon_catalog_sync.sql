alter table public.addons
  add column if not exists last_catalog_sync_at timestamptz,
  add column if not exists last_series_sync_at timestamptz,
  add column if not exists sync_error text;

alter table public.movies
  add column if not exists original_title text,
  add column if not exists content_status text default 'released';

alter table public.series
  add column if not exists original_title text,
  add column if not exists content_status text default 'unknown',
  add column if not exists last_synced_at timestamptz;

create index if not exists idx_addons_last_catalog_sync_at on public.addons (last_catalog_sync_at desc);
create index if not exists idx_series_last_synced_at on public.series (last_synced_at desc);
