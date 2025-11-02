-- Create withdrawals table
CREATE TABLE IF NOT EXISTS public.withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 10),
    method TEXT NOT NULL DEFAULT 'crypto',
    method_name TEXT NOT NULL,
    crypto_address TEXT NOT NULL,
    crypto_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON public.withdrawals(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own withdrawals
CREATE POLICY "Users can view own withdrawals"
    ON public.withdrawals
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own withdrawals
CREATE POLICY "Users can create own withdrawals"
    ON public.withdrawals
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users cannot update their own withdrawals (only admins can)
CREATE POLICY "Users cannot update withdrawals"
    ON public.withdrawals
    FOR UPDATE
    USING (false);

-- Policy: Users cannot delete their own withdrawals
CREATE POLICY "Users cannot delete withdrawals"
    ON public.withdrawals
    FOR DELETE
    USING (false);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_withdrawals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
CREATE TRIGGER trigger_update_withdrawals_updated_at
    BEFORE UPDATE ON public.withdrawals
    FOR EACH ROW
    EXECUTE FUNCTION update_withdrawals_updated_at();

-- Grant permissions
GRANT SELECT, INSERT ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;
