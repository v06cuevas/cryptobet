-- Migration: Add email column to profiles table if it doesn't exist

-- Add email column (nullable first, we'll populate it then make it NOT NULL)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
  END IF;
END $$;

-- Populate email from auth.users for existing profiles
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- Now make email NOT NULL and add index
DO $$ 
BEGIN
  -- Make email NOT NULL
  ALTER TABLE public.profiles ALTER COLUMN email SET NOT NULL;
  
  -- Create index if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND indexname = 'idx_profiles_email'
  ) THEN
    CREATE INDEX idx_profiles_email ON public.profiles(email);
  END IF;
END $$;
