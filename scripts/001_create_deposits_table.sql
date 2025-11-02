-- Create deposits table
CREATE TABLE IF NOT EXISTS public.deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  amount DECIMAL NOT NULL CHECK (amount >= 20),
  method TEXT NOT NULL,
  method_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  proof_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their own deposits
CREATE POLICY "deposits_select_own"
  ON public.deposits FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own deposits
CREATE POLICY "deposits_insert_own"
  ON public.deposits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending deposits
CREATE POLICY "deposits_update_own"
  ON public.deposits FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS deposits_user_id_idx ON public.deposits(user_id);
CREATE INDEX IF NOT EXISTS deposits_status_idx ON public.deposits(status);
CREATE INDEX IF NOT EXISTS deposits_created_at_idx ON public.deposits(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_deposits_updated_at
  BEFORE UPDATE ON public.deposits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
