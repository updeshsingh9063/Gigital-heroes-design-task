-- ============================================================
-- STEP 1: Temporarily disable the trigger so user creation works
-- Run THIS FIRST, then create the user via Dashboard or API
-- ============================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;


-- ============================================================
-- After you successfully create the admin user in the Dashboard,
-- run STEP 2 below to manually insert the profile and restore.
-- ============================================================
