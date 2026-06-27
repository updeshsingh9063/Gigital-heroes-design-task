-- ============================================================
-- DIAGNOSTIC: Run this FIRST to see what's in the database
-- ============================================================

-- Check if a partial admin user exists
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email = 'admin@digitalheroes.co.in';

-- Check identities
SELECT ui.id, ui.user_id, ui.provider, ui.created_at
FROM auth.identities ui
JOIN auth.users u ON u.id = ui.user_id
WHERE u.email = 'admin@digitalheroes.co.in';

-- Check profiles
SELECT * FROM public.profiles WHERE email = 'admin@digitalheroes.co.in';
