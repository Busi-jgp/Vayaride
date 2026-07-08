-- VayaRide: Payments, Chat, Promo Codes, and Notifications schema additions

-- ── Saved Payment Methods ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.saved_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method_type TEXT NOT NULL CHECK (method_type IN ('card', 'cash', 'wallet')),
  label TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  last_four TEXT,
  card_brand TEXT,
  expiry_date TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own payment methods"
  ON public.saved_payment_methods FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Promo Codes ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value NUMERIC(10,2) NOT NULL,
  min_fare NUMERIC(10,2),
  max_discount NUMERIC(10,2),
  usage_limit INT,
  used_count INT NOT NULL DEFAULT 0,
  first_ride_only BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Increment promo usage function
CREATE OR REPLACE FUNCTION public.increment_promo_usage(promo_code TEXT)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.promo_codes SET used_count = used_count + 1 WHERE code = promo_code;
END;
$$;

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read promo codes"
  ON public.promo_codes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage promo codes"
  ON public.promo_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── Ride Messages (Chat) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.ride_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES public.ride_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ride_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ride participants can read messages"
  ON public.ride_messages FOR SELECT TO authenticated
  USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
    OR EXISTS (SELECT 1 FROM public.active_rides ar WHERE ar.id = ride_id AND (ar.driver_id = auth.uid() OR ar.rider_id = auth.uid()))
  );
CREATE POLICY "Ride participants can send messages"
  ON public.ride_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Receivers can mark as read"
  ON public.ride_messages FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id) WITH CHECK (auth.uid() = receiver_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ride_messages_ride ON public.ride_messages(ride_id);
CREATE INDEX IF NOT EXISTS idx_ride_messages_sender ON public.ride_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_ride_messages_receiver ON public.ride_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON public.promo_codes(code);

-- Add data column to notifications (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'data') THEN
    ALTER TABLE public.notifications ADD COLUMN data JSONB;
  END IF;
END $$;

-- Add notification data to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Seed promo codes
INSERT INTO public.promo_codes (code, type, value, min_fare, max_discount, usage_limit, first_ride_only, is_active, expires_at)
VALUES
  ('WELCOME20', 'percentage', 20, 30, 50, 1000, true, true, '2027-01-01 00:00:00+00'),
  ('SAVE15', 'percentage', 15, 25, 40, 500, false, true, '2027-01-01 00:00:00+00'),
  ('FLAT10', 'fixed', 10, 30, NULL, 200, false, true, '2027-01-01 00:00:00+00')
ON CONFLICT (code) DO NOTHING;

-- Trigger for update timestamps
CREATE TRIGGER saved_payment_methods_updated_at BEFORE UPDATE ON public.saved_payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.set_timestamp();
CREATE TRIGGER promo_codes_updated_at BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW EXECUTE FUNCTION public.set_timestamp();