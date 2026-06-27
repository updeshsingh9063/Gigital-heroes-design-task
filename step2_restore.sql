-- ============================================================
-- STEP 2: Run AFTER successfully creating the admin user
-- This manually inserts the admin profile + restores the trigger
-- ============================================================

-- Insert the admin profile manually (since trigger was disabled)
INSERT INTO public.profiles (id, full_name, email, role)
SELECT id, 'Administrator', email, 'admin'
FROM auth.users
WHERE email = 'admin@digitalheroes.co.in'
ON CONFLICT (id) DO UPDATE SET role = 'admin', full_name = 'Administrator';


-- Restore the trigger function (fixed version with NULL safety)
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

-- Re-create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Verify: you should see the admin profile with role = admin
SELECT id, full_name, email, role FROM public.profiles WHERE email = 'admin@digitalheroes.co.in';
