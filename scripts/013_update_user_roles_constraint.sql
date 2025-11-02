-- Update existing user_roles table to only allow 'admin' and 'user' roles
-- This script updates the CHECK constraint and migrates any 'moderator' roles to 'user'

-- First, update any existing 'moderator' roles to 'user'
UPDATE public.user_roles
SET role = 'user'
WHERE role = 'moderator';

-- Drop the old constraint
ALTER TABLE public.user_roles
DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- Add new constraint with only 'admin' and 'user'
ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_role_check CHECK (role IN ('admin', 'user'));

-- Update the get_role_by_email function to ensure it always returns 'user' or 'admin'
CREATE OR REPLACE FUNCTION public.get_role_by_email(user_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE email = user_email AND is_active = true;
  
  -- Always return 'user' as default if no role found
  RETURN COALESCE(user_role, 'user');
END;
$$;
