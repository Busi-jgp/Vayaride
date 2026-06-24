
-- Add route metadata to rides
ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS distance_km numeric,
  ADD COLUMN IF NOT EXISTS duration_min integer;

-- Live driver locations per ride
CREATE TABLE public.ride_locations (
  ride_id uuid PRIMARY KEY REFERENCES public.rides(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  heading double precision,
  speed_kph double precision,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ride_locations TO authenticated;
GRANT ALL ON public.ride_locations TO service_role;

ALTER TABLE public.ride_locations ENABLE ROW LEVEL SECURITY;

-- Driver of the ride can write their own location
CREATE POLICY "Driver can upsert own ride location"
ON public.ride_locations
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = driver_id
  AND EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_id AND r.driver_id = auth.uid())
);

CREATE POLICY "Driver can update own ride location"
ON public.ride_locations
FOR UPDATE TO authenticated
USING (auth.uid() = driver_id)
WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Driver can delete own ride location"
ON public.ride_locations
FOR DELETE TO authenticated
USING (auth.uid() = driver_id);

-- Driver and confirmed participants can read the location
CREATE POLICY "Driver and participants can read location"
ON public.ride_locations
FOR SELECT TO authenticated
USING (
  auth.uid() = driver_id
  OR EXISTS (
    SELECT 1 FROM public.ride_participants rp
    WHERE rp.ride_id = ride_locations.ride_id
      AND rp.user_id = auth.uid()
      AND rp.cancelled_at IS NULL
  )
);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_locations;
ALTER TABLE public.ride_locations REPLICA IDENTITY FULL;
