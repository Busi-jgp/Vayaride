create table if not exists public.routes (
  id uuid default gen_random_uuid() primary key,
  from_location text not null,
  to_location text not null,
  taxi_rank text not null,
  fare numeric(10,2) not null,
  distance text not null,
  duration text not null,
  latitude double precision,
  longitude double precision,
  created_at timestamptz default now()
);

create index if not exists routes_from_to_idx on public.routes (from_location, to_location);

insert into public.routes (from_location, to_location, taxi_rank, fare, distance, duration, latitude, longitude)
values
  ('Johannesburg CBD', 'Soweto', 'Nancefield Taxi Rank', 45.00, '22 km', '45 min', -26.2041, 28.0473),
  ('Johannesburg CBD', 'Sandton', 'Park Station Taxi Rank', 60.00, '18 km', '35 min', -26.2041, 28.0473),
  ('Pretoria CBD', 'Mamelodi', 'Pretoria Station Taxi Rank', 38.00, '25 km', '50 min', -25.7461, 28.1881),
  ('Durban CBD', 'Umlazi', 'Durban Station Taxi Rank', 32.00, '31 km', '55 min', -29.8587, 31.0218),
  ('Cape Town CBD', 'Khayelitsha', 'Cape Town Station Taxi Rank', 40.00, '35 km', '60 min', -33.9249, 18.4241),
  ('Polokwane CBD', 'Seshego', 'Polokwane Taxi Rank', 28.00, '14 km', '25 min', -23.9045, 29.4486),
  ('Bloemfontein CBD', 'Botshabelo', 'Bloemfontein Station Taxi Rank', 35.00, '40 km', '70 min', -29.0852, 26.1596)
on conflict do nothing;
