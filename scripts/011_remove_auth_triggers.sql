-- Remove any triggers that automatically create profiles on user signup
-- These triggers cause "Database error saving new user" errors

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Drop the old trigger function if it exists
DROP FUNCTION IF EXISTS public.create_profile_for_user() CASCADE;

-- Note: Profiles will now be created manually in the application code
-- This gives us better error handling and control over the registration process
