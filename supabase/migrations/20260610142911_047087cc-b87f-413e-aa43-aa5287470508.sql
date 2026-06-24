REVOKE EXECUTE ON FUNCTION public.request_refund(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_driver_contact(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;

-- Switch directory view to security invoker and back it with a permissive
-- SELECT policy scoped to the safe columns via a SECURITY DEFINER function.
DROP VIEW IF EXISTS public.profile_directory;

CREATE OR REPLACE FUNCTION public.get_profile_directory(p_ids uuid[])
RETURNS TABLE (id uuid, full_name text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE p.id = ANY(p_ids);
$$;
REVOKE ALL ON FUNCTION public.get_profile_directory(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profile_directory(uuid[]) TO authenticated;