DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP VIEW IF EXISTS public.profile_directory;
CREATE VIEW public.profile_directory
  WITH (security_invoker = false) AS
SELECT id, full_name, avatar_url FROM public.profiles;
GRANT SELECT ON public.profile_directory TO authenticated;

CREATE OR REPLACE FUNCTION public.get_driver_contact(p_ride_id uuid)
RETURNS TABLE (full_name text, phone text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_driver uuid;
BEGIN
  SELECT driver_id INTO v_driver FROM public.rides WHERE id = p_ride_id;
  IF v_driver IS NULL THEN RETURN; END IF;
  IF auth.uid() = v_driver OR EXISTS (
    SELECT 1 FROM public.ride_participants
    WHERE ride_id = p_ride_id AND user_id = auth.uid() AND cancelled_at IS NULL
  ) THEN
    RETURN QUERY SELECT p.full_name, p.phone FROM public.profiles p WHERE p.id = v_driver;
  ELSE
    RETURN QUERY SELECT p.full_name, NULL::text FROM public.profiles p WHERE p.id = v_driver;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.get_driver_contact(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_driver_contact(uuid) TO authenticated;

DROP POLICY IF EXISTS "Authenticated view ratings" ON public.ratings;
DROP POLICY IF EXISTS "Users insert own ratings" ON public.ratings;

CREATE POLICY "Parties can view ratings"
  ON public.ratings FOR SELECT TO authenticated
  USING (
    auth.uid() = rater_id OR auth.uid() = ratee_id
    OR EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_id AND r.driver_id = auth.uid())
  );

CREATE POLICY "Participants insert valid ratings"
  ON public.ratings FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = rater_id
    AND EXISTS (
      SELECT 1 FROM public.ride_participants
      WHERE ride_id = ratings.ride_id AND user_id = auth.uid() AND cancelled_at IS NULL
    )
    AND ratee_id = (SELECT driver_id FROM public.rides WHERE id = ratings.ride_id)
    AND (SELECT status FROM public.rides WHERE id = ratings.ride_id) IN ('active','completed')
    AND stars BETWEEN 1 AND 5
  );

DROP POLICY IF EXISTS "Users request own refunds" ON public.refunds;
CREATE POLICY "Block direct refund inserts"
  ON public.refunds AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.request_refund(p_ride_id uuid, p_reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_amount numeric; v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) < 5 OR length(p_reason) > 1000 THEN
    RAISE EXCEPTION 'Reason must be 5-1000 characters';
  END IF;
  SELECT amount_paid INTO v_amount FROM public.ride_participants
    WHERE ride_id = p_ride_id AND user_id = auth.uid() AND cancelled_at IS NULL LIMIT 1;
  IF v_amount IS NULL THEN RAISE EXCEPTION 'You did not participate in this ride'; END IF;
  INSERT INTO public.refunds (ride_id, user_id, amount, reason)
  VALUES (p_ride_id, auth.uid(), v_amount, p_reason) RETURNING id INTO v_id;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.request_refund(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_refund(uuid, text) TO authenticated;

CREATE POLICY "No client role inserts"
  ON public.user_roles AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "No client role updates"
  ON public.user_roles AS RESTRICTIVE FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "No client role deletes"
  ON public.user_roles AS RESTRICTIVE FOR DELETE TO authenticated USING (false);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public' AS $function$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$function$;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;