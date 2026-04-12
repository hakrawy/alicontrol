alter table public.addons
  add column if not exists addon_kind text not null default 'catalog' check (addon_kind in ('catalog', 'stream', 'hybrid')),
  add column if not exists config_schema jsonb not null default '[]'::jsonb,
  add column if not exists config_values jsonb not null default '{}'::jsonb;

create index if not exists idx_addons_kind_enabled on public.addons (addon_kind, enabled);

alter table public.playback_sources
  add column if not exists headers jsonb not null default '{}'::jsonb,
  add column if not exists behavior_hints jsonb,
  add column if not exists proxy_required boolean not null default false,
  add column if not exists priority integer not null default 0,
  add column if not exists response_time_ms integer;

create index if not exists idx_playback_sources_priority on public.playback_sources (priority desc, response_time_ms asc);
