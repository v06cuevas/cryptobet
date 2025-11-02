-- Drop existing policies
DROP POLICY IF EXISTS "payment_methods_select_public" ON public.payment_methods;
DROP POLICY IF EXISTS "payment_methods_update_admin" ON public.payment_methods;
DROP POLICY IF EXISTS "payment_methods_insert_admin" ON public.payment_methods;
DROP POLICY IF EXISTS "payment_methods_delete_admin" ON public.payment_methods;

-- Allow everyone to read payment methods (needed for deposit page)
CREATE POLICY "payment_methods_select_public"
ON public.payment_methods FOR SELECT
USING (true);

-- Only admins can update payment methods
-- Changed user_roles.user_id to user_roles.profile_id (correct column name)
CREATE POLICY "payment_methods_update_admin"
ON public.payment_methods FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.profile_id = auth.uid()
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.profile_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Only admins can insert payment methods
-- Changed user_roles.user_id to user_roles.profile_id (correct column name)
CREATE POLICY "payment_methods_insert_admin"
ON public.payment_methods FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.profile_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Only admins can delete payment methods
-- Changed user_roles.user_id to user_roles.profile_id (correct column name)
CREATE POLICY "payment_methods_delete_admin"
ON public.payment_methods FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.profile_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);
