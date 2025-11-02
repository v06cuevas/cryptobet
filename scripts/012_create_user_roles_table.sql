-- Create user_roles table to manage administrator access
-- This table is linked to profiles and checks if an email has admin privileges

-- Drop existing table if it exists
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  -- Restricting role to only 'admin' and 'user'
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_user_roles_email ON public.user_roles(email);
CREATE INDEX idx_user_roles_profile_id ON public.user_roles(profile_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);
CREATE INDEX idx_user_roles_active ON public.user_roles(is_active);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own role
CREATE POLICY "Users can view their own role"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = profile_id);

-- Only service role can insert/update/delete roles (handled in server actions)
-- No public insert/update/delete policies to prevent users from changing their own roles

-- Function to check if an email is an admin
CREATE OR REPLACE FUNCTION public.is_admin_email(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE email = user_email 
      AND role = 'admin' 
      AND is_active = true
  );
END;
$$;

-- Function to get role by email
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

-- Function to sync role from user_roles to profiles
CREATE OR REPLACE FUNCTION public.sync_role_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the profile role when user_roles changes
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.profiles
    SET role = NEW.role,
        updated_at = NOW()
    WHERE id = NEW.profile_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to sync role changes to profiles table
DROP TRIGGER IF EXISTS sync_role_to_profile_trigger ON public.user_roles;
CREATE TRIGGER sync_role_to_profile_trigger
  AFTER INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_role_to_profile();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_user_roles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_user_roles_updated_at_trigger ON public.user_roles;
CREATE TRIGGER update_user_roles_updated_at_trigger
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_roles_updated_at();

-- Insert default admin (you can change this email)
-- This creates an admin role entry that will be linked when the user registers
INSERT INTO public.user_roles (email, role, is_active)
VALUES ('admin@crypt.com', 'admin', true)
ON CONFLICT (email) DO UPDATE SET role = 'admin', is_active = true;

-- Comment on table
COMMENT ON TABLE public.user_roles IS 'Manages user roles (admin/user) and administrator access, linked to profiles table';
