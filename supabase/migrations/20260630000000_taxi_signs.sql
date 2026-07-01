-- ============================================================
-- Taxi Signs — Community-maintained hand-sign reference
-- ============================================================

CREATE TABLE IF NOT EXISTS public.taxi_signs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province        TEXT NOT NULL,
  city            TEXT NOT NULL,
  suburb          TEXT NOT NULL DEFAULT '',
  destination     TEXT NOT NULL,
  taxi_rank       TEXT NOT NULL DEFAULT '',
  -- Media
  hand_sign_image TEXT,          -- URL to uploaded photo of the hand sign
  hand_sign_illustration TEXT,   -- URL to illustrated version
  -- Description
  hand_sign_description TEXT NOT NULL,
  alternative_sign TEXT,
  notes            TEXT,
  -- Location
  latitude         DOUBLE PRECISION,
  longitude        DOUBLE PRECISION,
  -- Metadata
  verified         BOOLEAN NOT NULL DEFAULT false,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'approved', 'rejected')),
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.taxi_signs ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read approved signs; moderators see pending
CREATE POLICY "Anyone can read approved signs"
  ON public.taxi_signs FOR SELECT
  USING (status = 'approved' OR public.has_role(auth.uid(), 'admin'));

-- Authenticated users can submit new signs
CREATE POLICY "Authenticated users can insert"
  ON public.taxi_signs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Moderators (admins) can update
CREATE POLICY "Admins can update"
  ON public.taxi_signs FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can delete
CREATE POLICY "Admins can delete"
  ON public.taxi_signs FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Grants
GRANT SELECT ON public.taxi_signs TO authenticated, anon;
GRANT INSERT ON public.taxi_signs TO authenticated;
GRANT UPDATE, DELETE ON public.taxi_signs TO service_role;

-- Indexes for search
CREATE INDEX idx_taxi_signs_destination ON public.taxi_signs USING gin (to_tsvector('english', destination));
CREATE INDEX idx_taxi_signs_city ON public.taxi_signs (city);
CREATE INDEX idx_taxi_signs_province ON public.taxi_signs (province);
CREATE INDEX idx_taxi_signs_status ON public.taxi_signs (status);
CREATE INDEX idx_taxi_signs_verified ON public.taxi_signs (verified);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.set_taxi_signs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_taxi_signs_updated_at
  BEFORE UPDATE ON public.taxi_signs
  FOR EACH ROW EXECUTE FUNCTION public.set_taxi_signs_updated_at();

-- ============================================================
-- Saved taxi signs (user favorites)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.saved_taxi_signs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sign_id    UUID NOT NULL REFERENCES public.taxi_signs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, sign_id)
);

ALTER TABLE public.saved_taxi_signs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own saved signs"
  ON public.saved_taxi_signs FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON public.saved_taxi_signs TO authenticated;
GRANT ALL ON public.saved_taxi_signs TO service_role;

-- ============================================================
-- Seed data: Common South African taxi signs
-- ============================================================
INSERT INTO public.taxi_signs (province, city, suburb, destination, taxi_rank, hand_sign_description, alternative_sign, notes, verified, status, latitude, longitude) VALUES
  ('Gauteng', 'Johannesburg', 'CBD', 'Johannesburg CBD', 'Johannesburg Park Station', 'Raise one finger pointing upward (index finger).', 'Two fingers for inner-city routes', 'Commonly used at Park Station rank.', true, 'approved', -26.2041, 28.0473),
  ('Gauteng', 'Johannesburg', '', 'Soweto', 'Soweto Taxi Rank (Bara)', 'Extend your hand with palm facing down, fingers together, and move hand up and down slightly.', 'Raise fist for specific Soweto sections', 'Used at Bara taxi rank for Soweto-bound taxis.', true, 'approved', -26.2485, 27.8580),
  ('Gauteng', 'Johannesburg', '', 'Sandton', 'Sandton City Taxi Rank', 'Raise hand with two fingers spread (peace sign).', 'Use four fingers for specific Sandton suburbs', 'Premium route sign at Sandton rank.', true, 'approved', -26.1076, 28.0567),
  ('Gauteng', 'Pretoria', '', 'Pretoria CBD', 'Pretoria Station Taxi Rank', 'Raise a closed fist with thumb extended upward.', 'Index finger for specific Pretoria suburbs', 'Standard sign for Pretoria-bound taxis.', true, 'approved', -25.7449, 28.1878),
  ('Gauteng', 'Johannesburg', '', 'Midrand', 'Midrand Taxi Rank', 'Raise hand with three fingers extended.', 'Two fingers for Halfway House / Carlswald', 'Used at various ranks for Midrand routes.', true, 'approved', -25.9986, 28.1196),
  ('Gauteng', 'Johannesburg', '', 'Fourways', 'Fourways Taxi Rank', 'Raise four fingers (all but thumb).', 'Open hand palm out for Design Quarter', 'Common sign at Fourways rank.', true, 'approved', -26.0076, 28.0144),
  ('Gauteng', 'Johannesburg', '', 'Randburg', 'Randburg Taxi Rank', 'Hold up thumb only (hitchhiking gesture).', 'Thumb + index for specific areas like Ferndale', 'Used for Randburg-bound taxis.', true, 'approved', -26.0936, 28.0123),
  ('Gauteng', 'Johannesburg', 'Alexandra', 'Alexandra', 'Alexandra Taxi Rank', 'Wave hand with palm facing forward, fingers spread.', 'Raise fist for East Bank areas', 'Used for Alex-bound taxis from various ranks.', true, 'approved', -26.1071, 28.0935),
  ('KwaZulu-Natal', 'Durban', '', 'Durban CBD', 'Durban Station Taxi Rank', 'Extend index and middle finger pointing downward.', 'Four fingers for specific Durban suburbs', 'Standard for Durban city centre.', true, 'approved', -29.8587, 31.0218),
  ('Western Cape', 'Cape Town', '', 'Cape Town CBD', 'Cape Town Station Taxi Rank', 'Raise open hand with palm outward.', 'One finger upward for specific CBD sections', 'Used at the main Cape Town rank.', true, 'approved', -33.9249, 18.4241),
  ('Eastern Cape', 'Port Elizabeth', '', 'Port Elizabeth CBD', 'PE Market Square Taxi Rank', 'Raise hand with pinky and thumb extended (hang loose).', 'Index finger for specific PE suburbs', 'Unique sign for PE-bound taxis.', true, 'approved', -33.9608, 25.6020),
  ('Free State', 'Bloemfontein', '', 'Bloemfontein CBD', 'Bloemfontein Taxi Rank', 'Raise closed fist with index finger pointing left.', 'Open hand for specific Bloemfontein areas', 'Standard Bloemfontein taxi sign.', true, 'approved', -29.0852, 26.1596),
  ('Mpumalanga', 'Nelspruit', '', 'Nelspruit CBD', 'Nelspruit Taxi Rank', 'Raise hand with two fingers in V sign facing outward.', 'Raise three fingers for Riverside area', 'Used for Nelspruit city centre.', true, 'approved', -25.4745, 30.9700),
  ('Limpopo', 'Polokwane', '', 'Polokwane CBD', 'Polokwane Taxi Rank', 'Raise hand with thumb and pinky extended (call me sign).', 'Index finger for specific Polokwane areas', 'Standard for Polokwane-bound taxis.', true, 'approved', -23.9022, 29.4687),
  ('North West', 'Rustenburg', '', 'Rustenburg CBD', 'Rustenburg Taxi Rank', 'Extend three fingers and point them downward.', 'Raise fist for specific Rustenburg areas', 'Common at Rustenburg rank.', true, 'approved', -25.6720, 27.1089),
  ('Northern Cape', 'Kimberley', '', 'Kimberley CBD', 'Kimberley Taxi Rank', 'Raise index finger moving in small circular motion.', 'Two fingers for specific Kimberley suburbs', 'Used at Kimberley station rank.', true, 'approved', -28.7282, 24.7499)
ON CONFLICT DO NOTHING;