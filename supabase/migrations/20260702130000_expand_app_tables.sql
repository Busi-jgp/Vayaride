create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  theme text not null default 'system',
  language text not null default 'en',
  notifications_enabled boolean not null default true,
  location_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;
create policy "Users manage own preferences" on public.user_preferences for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.user_preferences to authenticated;
grant all on public.user_preferences to service_role;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  kind text not null default 'info',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
create policy "Users manage own notifications" on public.notifications for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;

create table if not exists public.recent_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  query text not null,
  created_at timestamptz not null default now()
);

alter table public.recent_searches enable row level security;
create policy "Users manage own recent searches" on public.recent_searches for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, delete on public.recent_searches to authenticated;
grant all on public.recent_searches to service_role;

create table if not exists public.saved_routes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  route_key text not null,
  from_location text not null,
  to_location text not null,
  taxi_rank text not null,
  fare numeric(10,2) not null,
  distance text not null,
  duration text not null,
  created_at timestamptz not null default now(),
  unique (user_id, route_key)
);

alter table public.saved_routes enable row level security;
create policy "Users manage own saved routes" on public.saved_routes for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, delete on public.saved_routes to authenticated;
grant all on public.saved_routes to service_role;

create table if not exists public.saved_ranks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  city text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.saved_ranks enable row level security;
create policy "Users manage own saved ranks" on public.saved_ranks for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, delete on public.saved_ranks to authenticated;
grant all on public.saved_ranks to service_role;

insert into public.notifications (user_id, title, body, kind)
select id, 'Welcome to VayaRide', 'Your route planner and taxi guide are ready to use.', 'info'
from auth.users
on conflict do nothing;
