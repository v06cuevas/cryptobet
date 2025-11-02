-- Fix infinite recursion in profiles RLS policies
-- This script removes the problematic policies and creates new ones that don't cause recursion

-- Drop existing policies that might cause recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Create a simple policy that allows users to view their own profile
-- This uses auth.uid() which doesn't cause recursion
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Allow users to insert their own profile during registration
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Create a policy for admins that uses the user_roles table instead of profiles
-- This avoids the circular dependency
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.profile_id = auth.uid()
    AND user_roles.role = 'admin'
    AND user_roles.is_active = true
  )
);

-- Create a policy for admins to update any profile
CREATE POLICY "Admins can update all profiles"
ON profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.profile_id = auth.uid()
    AND user_roles.role = 'admin'
    AND user_roles.is_active = true
  )
);

-- Create a policy for admins to delete profiles if needed
CREATE POLICY "Admins can delete profiles"
ON profiles FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.profile_id = auth.uid()
    AND user_roles.role = 'admin'
    AND user_roles.is_active = true
  )
);
