-- Realtime watch room foundation.
-- Apply after the base schema to enable event-driven Watch Together features.

create table if not exists public.room_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.watch_rooms(id) on delete cascade,
  actor_id uuid references public.user_profiles(id) on delete set null,
  event_type text not null,
  media_id uuid,
  media_type text check (media_type in ('movie', 'series', 'episode', 'channel')),
  position_ms integer not null default 0,
  playback_rate numeric not null default 1,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  sequence_no bigint not null,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists room_events_room_sequence_idx on public.room_events (room_id, sequence_no);
create unique index if not exists room_events_room_idempotency_idx on public.room_events (room_id, idempotency_key);
create index if not exists room_events_room_created_idx on public.room_events (room_id, created_at desc);

create or replace function public.set_room_event_sequence_no()
returns trigger
language plpgsql
as $$
begin
  if new.sequence_no is null then
    select coalesce(max(sequence_no), 0) + 1
      into new.sequence_no
      from public.room_events
     where room_id = new.room_id;
  end if;
  return new;
end;
$$;

drop trigger if exists set_room_event_sequence_no_trigger on public.room_events;
create trigger set_room_event_sequence_no_trigger
  before insert on public.room_events
  for each row execute procedure public.set_room_event_sequence_no();

create table if not exists public.room_presence (
  room_id uuid not null references public.watch_rooms(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('host', 'co-host', 'moderator', 'member')),
  state jsonb not null default '{}'::jsonb,
  joined_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  primary key (room_id, user_id)
);

create index if not exists room_presence_room_idx on public.room_presence (room_id, last_seen_at desc);

create table if not exists public.room_roles (
  room_id uuid not null references public.watch_rooms(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('host', 'co-host', 'moderator', 'member')),
  granted_by uuid references public.user_profiles(id) on delete set null,
  granted_at timestamptz not null default timezone('utc', now()),
  primary key (room_id, user_id)
);

create table if not exists public.room_bans (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.watch_rooms(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  banned_by uuid references public.user_profiles(id) on delete set null,
  reason text not null default '',
  banned_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  is_active boolean not null default true
);

create unique index if not exists room_bans_room_user_idx on public.room_bans (room_id, user_id) where is_active;
create index if not exists room_bans_room_idx on public.room_bans (room_id, banned_at desc);

create table if not exists public.room_polls (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.watch_rooms(id) on delete cascade,
  created_by uuid not null references public.user_profiles(id) on delete cascade,
  question text not null,
  options jsonb not null default '[]'::jsonb,
  is_open boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  closed_at timestamptz
);

create table if not exists public.room_poll_votes (
  poll_id uuid not null references public.room_polls(id) on delete cascade,
  room_id uuid not null references public.watch_rooms(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  option_index integer not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (poll_id, user_id)
);

create table if not exists public.room_external_sources (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.watch_rooms(id) on delete cascade,
  created_by uuid references public.user_profiles(id) on delete set null,
  label text not null default '',
  url text not null,
  source_kind text not null default 'direct' check (source_kind in ('direct', 'storage', 'proxy')),
  is_allowed boolean not null default true,
  validated_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists room_external_sources_room_idx on public.room_external_sources (room_id, is_allowed);

alter table public.room_events enable row level security;
alter table public.room_presence enable row level security;
alter table public.room_roles enable row level security;
alter table public.room_bans enable row level security;
alter table public.room_polls enable row level security;
alter table public.room_poll_votes enable row level security;
alter table public.room_external_sources enable row level security;

drop policy if exists "room_events_read_members" on public.room_events;
create policy "room_events_read_members"
on public.room_events
for select
using (
  exists (
    select 1 from public.watch_room_members wrm
    where wrm.room_id = room_events.room_id
      and wrm.user_id = auth.uid()
  )
  or public.is_admin()
);

drop policy if exists "room_events_insert_members" on public.room_events;
create policy "room_events_insert_members"
on public.room_events
for insert
with check (
  auth.uid() = actor_id
  and exists (
    select 1 from public.watch_room_members wrm
    where wrm.room_id = room_events.room_id
      and wrm.user_id = auth.uid()
  )
  and not exists (
    select 1 from public.room_bans rb
    where rb.room_id = room_events.room_id
      and rb.user_id = auth.uid()
      and rb.is_active = true
      and (rb.expires_at is null or rb.expires_at > now())
  )
);

drop policy if exists "room_presence_read_members" on public.room_presence;
create policy "room_presence_read_members"
on public.room_presence
for select
using (
  exists (
    select 1 from public.watch_room_members wrm
    where wrm.room_id = room_presence.room_id
      and wrm.user_id = auth.uid()
  )
  or public.is_admin()
);

drop policy if exists "room_presence_upsert_own" on public.room_presence;
create policy "room_presence_upsert_own"
on public.room_presence
for all
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "room_roles_read_members" on public.room_roles;
create policy "room_roles_read_members"
on public.room_roles
for select
using (
  exists (
    select 1 from public.watch_room_members wrm
    where wrm.room_id = room_roles.room_id
      and wrm.user_id = auth.uid()
  )
  or public.is_admin()
);

drop policy if exists "room_roles_host_manage" on public.room_roles;
create policy "room_roles_host_manage"
on public.room_roles
for all
using (
  exists (
    select 1 from public.watch_rooms wr
    where wr.id = room_roles.room_id
      and (wr.host_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1 from public.watch_rooms wr
    where wr.id = room_roles.room_id
      and (wr.host_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "room_bans_read_members" on public.room_bans;
create policy "room_bans_read_members"
on public.room_bans
for select
using (
  exists (
    select 1 from public.watch_rooms wr
    where wr.id = room_bans.room_id
      and (wr.host_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "room_bans_host_manage" on public.room_bans;
create policy "room_bans_host_manage"
on public.room_bans
for all
using (
  exists (
    select 1 from public.watch_rooms wr
    where wr.id = room_bans.room_id
      and (wr.host_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1 from public.watch_rooms wr
    where wr.id = room_bans.room_id
      and (wr.host_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "room_polls_read_members" on public.room_polls;
create policy "room_polls_read_members"
on public.room_polls
for select
using (
  exists (
    select 1 from public.watch_room_members wrm
    where wrm.room_id = room_polls.room_id
      and wrm.user_id = auth.uid()
  )
  or public.is_admin()
);

drop policy if exists "room_polls_host_manage" on public.room_polls;
create policy "room_polls_host_manage"
on public.room_polls
for all
using (
  exists (
    select 1 from public.watch_rooms wr
    where wr.id = room_polls.room_id
      and (wr.host_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1 from public.watch_rooms wr
    where wr.id = room_polls.room_id
      and (wr.host_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "room_poll_votes_read_members" on public.room_poll_votes;
create policy "room_poll_votes_read_members"
on public.room_poll_votes
for select
using (
  exists (
    select 1 from public.watch_room_members wrm
    where wrm.room_id = room_poll_votes.room_id
      and wrm.user_id = auth.uid()
  )
  or public.is_admin()
);

drop policy if exists "room_poll_votes_member_vote" on public.room_poll_votes;
create policy "room_poll_votes_member_vote"
on public.room_poll_votes
for all
using (
  auth.uid() = user_id
  and exists (
    select 1 from public.watch_room_members wrm
    where wrm.room_id = room_poll_votes.room_id
      and wrm.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.watch_room_members wrm
    where wrm.room_id = room_poll_votes.room_id
      and wrm.user_id = auth.uid()
  )
);

drop policy if exists "room_external_sources_read_members" on public.room_external_sources;
create policy "room_external_sources_read_members"
on public.room_external_sources
for select
using (
  exists (
    select 1 from public.watch_room_members wrm
    where wrm.room_id = room_external_sources.room_id
      and wrm.user_id = auth.uid()
  )
  or public.is_admin()
);

drop policy if exists "room_external_sources_host_manage" on public.room_external_sources;
create policy "room_external_sources_host_manage"
on public.room_external_sources
for all
using (
  exists (
    select 1 from public.watch_rooms wr
    where wr.id = room_external_sources.room_id
      and (wr.host_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1 from public.watch_rooms wr
    where wr.id = room_external_sources.room_id
      and (wr.host_id = auth.uid() or public.is_admin())
  )
);
