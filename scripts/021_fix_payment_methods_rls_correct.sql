-- Fix payment_methods RLS policies with correct column name
-- The user_roles table uses 'profile_id' not 'user_id'

-- Drop existing policies
DROP POLICY IF EXISTS "payment_methods_insert_admin" ON public.payment_methods;
DROP POLICY IF EXISTS "payment_methods_update_admin" ON public.payment_methods;
DROP POLICY IF EXISTS "payment_methods_delete_admin" ON public.payment_methods;
DROP POLICY IF EXISTS "payment_methods_select_public" ON public.payment_methods;

-- Allow everyone to view payment methods (needed for deposit page)
CREATE POLICY "payment_methods_select_public"
ON public.payment_methods FOR SELECT
TO authenticated
USING (true);

-- Using profile_id instead of user_id to match user_roles table structure
-- Only admins can insert payment methods
CREATE POLICY "payment_methods_insert_admin"
ON public.payment_methods FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.profile_id = auth.uid()
    AND user_roles.role = 'admin'
    AND user_roles.is_active = true
  )
);

-- Only admins can update payment methods
CREATE POLICY "payment_methods_update_admin"
ON public.payment_methods FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.profile_id = auth.uid()
    AND user_roles.role = 'admin'
    AND user_roles.is_active = true
  )
);

-- Only admins can delete payment methods
CREATE POLICY "payment_methods_delete_admin"
ON public.payment_methods FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.profile_id = auth.uid()
    AND user_roles.role = 'admin'
    AND user_roles.is_active = true
  )
);
