-- ============================================================
-- STEP 1: Enable pgcrypto extension (run this first if not already done)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- STEP 2: Create the Admin Account
-- ============================================================
DO $$
DECLARE
  new_id UUID;
  existing_id UUID;
BEGIN
  -- Check if admin account already exists
  SELECT id INTO existing_id FROM auth.users WHERE email = 'admin@digitalheroes.com' LIMIT 1;
  
  IF existing_id IS NOT NULL THEN
    -- Account exists: just make sure it has admin role in profiles
    UPDATE public.profiles SET role = 'admin' WHERE id = existing_id;
    RAISE NOTICE 'Admin user already exists. Ensured admin role is set.';
    RETURN;
  END IF;

  -- Generate a new UUID for this user
  new_id := gen_random_uuid();

  -- 1. Create the user in auth.users with confirmed email
  INSERT INTO auth.users (
    instance_id,
    id, 
    aud,
    role,
    email, 
    encrypted_password, 
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_id,
    'authenticated',
    'authenticated',
    'admin@digitalheroes.com',
    crypt('admin@1234', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Administrator"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  );

  -- 2. Create the identity record (required for login)
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    new_id,
    jsonb_build_object('sub', new_id::text, 'email', 'admin@digitalheroes.com'),
    'email',
    new_id::text,
    NOW(),
    NOW(),
    NOW()
  );

  -- 3. The trigger will have auto-created a profile row.
  --    Now upgrade its role to admin.
  UPDATE public.profiles SET role = 'admin' WHERE id = new_id;
  
  RAISE NOTICE 'Admin user created successfully with id: %', new_id;
END;
$$;
