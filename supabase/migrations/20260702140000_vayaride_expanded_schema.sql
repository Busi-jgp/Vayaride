-- VayaRide expanded schema for rides, drivers, payments, safety, and realtime support.

CREATE TYPE public.ride_type AS ENUM ('request', 'active', 'completed', 'cancelled');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE public.verification_status AS ENUM ('pending', 'verified', 'declined');
CREATE TYPE public.trip_status AS ENUM ('requested', 'accepted', 'active', 'completed', 'cancelled');
CREATE TYPE public.sos_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.transaction_type AS ENUM ('fare', 'commission', 'refund', 'payout');

-- Driver verification and vehicles
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  license_number TEXT NOT NULL,
  id_document_url TEXT,
  selfie_url TEXT,
  status public.verification_status NOT NULL DEFAULT 'pending',
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  plate_number TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  color TEXT,
  seats INT NOT NULL DEFAULT 4,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ride_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pickup_address TEXT NOT NULL,
  pickup_lat DOUBLE PRECISION NOT NULL,
  pickup_lng DOUBLE PRECISION NOT NULL,
  dropoff_address TEXT NOT NULL,
  dropoff_lat DOUBLE PRECISION NOT NULL,
  dropoff_lng DOUBLE PRECISION NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scheduled_for TIMESTAMPTZ,
  vehicle_type TEXT NOT NULL DEFAULT 'economy',
  seats_requested INT NOT NULL DEFAULT 1,
  fare_estimate NUMERIC(10,2) NOT NULL,
  status public.trip_status NOT NULL DEFAULT 'requested',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.active_rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_request_id UUID NOT NULL REFERENCES public.ride_requests(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  rider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pickup_pin TEXT NOT NULL,
  share_token TEXT NOT NULL UNIQUE,
  share_expires_at TIMESTAMPTZ NOT NULL,
  status public.trip_status NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  route_polyline TEXT,
  estimated_fare NUMERIC(10,2) NOT NULL,
  final_fare NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.completed_rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  active_ride_id UUID NOT NULL REFERENCES public.active_rides(id) ON DELETE CASCADE,
  rider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  fare_paid NUMERIC(10,2) NOT NULL,
  distance_meters INT,
  duration_seconds INT,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saved_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  address TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  relationship TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES public.active_rides(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'pending',
  method TEXT NOT NULL,
  transaction_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ride_id UUID REFERENCES public.active_rides(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  type public.transaction_type NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.driver_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  ride_id UUID NOT NULL REFERENCES public.active_rides(id) ON DELETE CASCADE,
  gross_amount NUMERIC(10,2) NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL,
  net_amount NUMERIC(10,2) NOT NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sos_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES public.active_rides(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.emergency_contacts(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  priority public.sos_priority NOT NULL DEFAULT 'high',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ride_risk_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES public.active_rides(id) ON DELETE CASCADE,
  flagged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  risk_type TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.maps_api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  usage_date DATE NOT NULL,
  call_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, endpoint, usage_date)
);

CREATE TABLE IF NOT EXISTS public.trip_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES public.active_rides(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saved_favourites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ride_requests_status ON public.ride_requests(status);
CREATE INDEX IF NOT EXISTS idx_active_rides_driver ON public.active_rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_active_rides_rider ON public.active_rides(rider_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_ride ON public.sos_alerts(ride_id);
CREATE INDEX IF NOT EXISTS idx_trip_shares_token ON public.trip_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_maps_api_usage ON public.maps_api_usage(provider, endpoint, usage_date);

-- RLS and policies
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completed_rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_risk_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maps_api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_favourites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can view own driver profile" ON public.drivers FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Drivers can update own driver profile" ON public.drivers FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Authenticated can insert driver profile" ON public.drivers FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Drivers can manage own vehicles" ON public.vehicles FOR ALL TO authenticated USING (auth.uid() = driver_id) WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Riders can manage own requests" ON public.ride_requests FOR ALL TO authenticated USING (auth.uid() = rider_id) WITH CHECK (auth.uid() = rider_id);

CREATE POLICY "Ride participants and drivers can view active rides" ON public.active_rides FOR SELECT TO authenticated USING (
  auth.uid() = driver_id OR auth.uid() = rider_id
);
CREATE POLICY "Drivers can update active rides" ON public.active_rides FOR UPDATE TO authenticated USING (auth.uid() = driver_id);
CREATE POLICY "Riders can insert active rides" ON public.active_rides FOR INSERT TO authenticated WITH CHECK (auth.uid() = rider_id);

CREATE POLICY "Participants can view completed rides" ON public.completed_rides FOR SELECT TO authenticated USING (
  auth.uid() = rider_id OR auth.uid() = driver_id
);

CREATE POLICY "Users can manage own saved places" ON public.saved_places FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own emergency contacts" ON public.emergency_contacts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own payments" ON public.payments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own transactions" ON public.transactions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Drivers can manage own earnings" ON public.driver_earnings FOR SELECT TO authenticated USING (auth.uid() = driver_id);

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert sos alerts" ON public.sos_alerts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Drivers and riders can view sos alerts" ON public.sos_alerts FOR SELECT TO authenticated USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.active_rides ar WHERE ar.id = sos_alerts.ride_id AND (ar.driver_id = auth.uid() OR ar.rider_id = auth.uid()))
);

CREATE POLICY "Users can manage own ride risk flags" ON public.ride_risk_flags FOR ALL TO authenticated USING (
  auth.uid() IN (SELECT driver_id FROM public.active_rides WHERE id = ride_id) OR auth.uid() IN (SELECT rider_id FROM public.active_rides WHERE id = ride_id)
) WITH CHECK (true);

CREATE POLICY "Analytics can write maps api usage" ON public.maps_api_usage FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Analytics can view maps api usage" ON public.maps_api_usage FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage own trip shares" ON public.trip_shares FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.active_rides ar WHERE ar.id = trip_shares.ride_id AND (ar.driver_id = auth.uid() OR ar.rider_id = auth.uid()))
) WITH CHECK (true);

CREATE POLICY "Users can manage own favourites" ON public.saved_favourites FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Updated timestamps trigger
CREATE OR REPLACE FUNCTION public.set_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER drivers_updated_at BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.set_timestamp();
CREATE TRIGGER vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.set_timestamp();
CREATE TRIGGER ride_requests_updated_at BEFORE UPDATE ON public.ride_requests FOR EACH ROW EXECUTE FUNCTION public.set_timestamp();
CREATE TRIGGER active_rides_updated_at BEFORE UPDATE ON public.active_rides FOR EACH ROW EXECUTE FUNCTION public.set_timestamp();
CREATE TRIGGER completed_rides_updated_at BEFORE UPDATE ON public.completed_rides FOR EACH ROW EXECUTE FUNCTION public.set_timestamp();
CREATE TRIGGER saved_places_updated_at BEFORE UPDATE ON public.saved_places FOR EACH ROW EXECUTE FUNCTION public.set_timestamp();
CREATE TRIGGER emergency_contacts_updated_at BEFORE UPDATE ON public.emergency_contacts FOR EACH ROW EXECUTE FUNCTION public.set_timestamp();
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_timestamp();
CREATE TRIGGER transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.set_timestamp();
CREATE TRIGGER driver_earnings_updated_at BEFORE UPDATE ON public.driver_earnings FOR EACH ROW EXECUTE FUNCTION public.set_timestamp();
CREATE TRIGGER notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.set_timestamp();
CREATE TRIGGER sos_alerts_updated_at BEFORE UPDATE ON public.sos_alerts FOR EACH ROW EXECUTE FUNCTION public.set_timestamp();
CREATE TRIGGER ride_risk_flags_updated_at BEFORE UPDATE ON public.ride_risk_flags FOR EACH ROW EXECUTE FUNCTION public.set_timestamp();
CREATE TRIGGER maps_api_usage_updated_at BEFORE UPDATE ON public.maps_api_usage FOR EACH ROW EXECUTE FUNCTION public.set_timestamp();
CREATE TRIGGER trip_shares_updated_at BEFORE UPDATE ON public.trip_shares FOR EACH ROW EXECUTE FUNCTION public.set_timestamp();
CREATE TRIGGER saved_favourites_updated_at BEFORE UPDATE ON public.saved_favourites FOR EACH ROW EXECUTE FUNCTION public.set_timestamp();

-- Realtime publication hints
ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_alerts, public.ride_risk_flags, public.trip_shares, public.maps_api_usage;

-- Ensure no duplicate ride state tables conflict with existing schema
COMMENT ON TABLE public.ride_requests IS 'Expanded ride-request workflow separate from shared ride offers';
COMMENT ON TABLE public.active_rides IS 'Active ride state for live monitoring and safety features';
COMMENT ON TABLE public.completed_rides IS 'Historical completed ride records';
