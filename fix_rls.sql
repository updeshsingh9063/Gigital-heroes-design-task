-- ================================================================
-- NUCLEAR FIX — Run this ENTIRE script in Supabase SQL Editor
-- This fixes the "Database error checking email" issue permanently.
-- ================================================================

-- STEP 1: Allow full_name to be NULL so user creation never fails
ALTER TABLE public.profiles ALTER COLUMN full_name DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;


-- STEP 2: Drop ALL existing RLS policies on profiles (clean slate)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.profiles';
    END LOOP;
END
$$;


-- STEP 3: Create is_admin() helper (SECURITY DEFINER bypasses RLS safely)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;


-- STEP 4: Recreate clean RLS policies
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT USING (public.is_admin());

CREATE POLICY "profiles_insert_open" ON public.profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);


-- STEP 5: Recreate the trigger function robustly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email, 'User'),
    COALESCE(new.email, '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-attach the trigger (safe even if it already exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- STEP 6: Fix orders policies
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders" ON public.orders
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders" ON public.orders
  FOR UPDATE USING (public.is_admin());

-- STEP 7: Fix jobs policies
DROP POLICY IF EXISTS "Admins can view all jobs" ON public.jobs;
CREATE POLICY "Admins can view all jobs" ON public.jobs
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update all jobs" ON public.jobs;
CREATE POLICY "Admins can update all jobs" ON public.jobs
  FOR UPDATE USING (public.is_admin());

-- STEP 8: Fix proofs policies
DROP POLICY IF EXISTS "Admins can manage all proofs" ON public.proofs;
CREATE POLICY "Admins can manage all proofs" ON public.proofs
  FOR ALL USING (public.is_admin());

-- ================================================================
-- SUCCESS! Now go to Authentication > Users > Add User to create admin.
-- After creating the user, run this:
--
--   UPDATE public.profiles SET role = 'admin', full_name = 'Administrator'
--   WHERE email = 'admin@digitalheroes.co.in';
-- ================================================================
