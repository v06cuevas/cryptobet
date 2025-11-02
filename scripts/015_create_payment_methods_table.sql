-- Create payment_methods table to store admin-configured payment information
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Bank Transfer Fields
  bank_name TEXT,
  account_number TEXT,
  account_holder TEXT,
  
  -- Bitcoin Fields
  btc_address TEXT,
  btc_qr_code_url TEXT,
  
  -- Ethereum Fields
  eth_address TEXT,
  eth_qr_code_url TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow everyone to read payment methods (needed for deposit page)
CREATE POLICY "payment_methods_select_public"
  ON public.payment_methods FOR SELECT
  USING (true);

-- Only admins can update payment methods
CREATE POLICY "payment_methods_update_admin"
  ON public.payment_methods FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.profile_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.is_active = true
    )
  );

-- Only admins can insert payment methods
CREATE POLICY "payment_methods_insert_admin"
  ON public.payment_methods FOR INSERT
  WITH CHECK (
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
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.profile_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.is_active = true
    )
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS payment_methods_created_at_idx ON public.payment_methods(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_methods_updated_at();

-- Create storage bucket for QR codes if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('qr-codes', 'qr-codes', true)
ON CONFLICT (id) DO NOTHING;

-- Set RLS policies for qr-codes bucket
CREATE POLICY "qr-codes public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'qr-codes');

CREATE POLICY "qr-codes admin upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'qr-codes' AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.profile_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.is_active = true
    )
  );

CREATE POLICY "qr-codes admin update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'qr-codes' AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.profile_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.is_active = true
    )
  );

CREATE POLICY "qr-codes admin delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'qr-codes' AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.profile_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.is_active = true
    )
  );
