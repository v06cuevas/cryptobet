-- Fix payment_methods RLS policies to use profiles.role instead of user_roles
-- This solves the issue where users have roles in profiles but not in user_roles

-- Drop existing policies
DROP POLICY IF EXISTS "payment_methods_select_public" ON public.payment_methods;
DROP POLICY IF EXISTS "payment_methods_insert_admin" ON public.payment_methods;
DROP POLICY IF EXISTS "payment_methods_update_admin" ON public.payment_methods;
DROP POLICY IF EXISTS "payment_methods_delete_admin" ON public.payment_methods;

-- Create new policies that check profiles.role instead of user_roles
CREATE POLICY "payment_methods_select_public"
ON public.payment_methods
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "payment_methods_insert_admin"
ON public.payment_methods
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "payment_methods_update_admin"
ON public.payment_methods
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "payment_methods_delete_admin"
ON public.payment_methods
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
