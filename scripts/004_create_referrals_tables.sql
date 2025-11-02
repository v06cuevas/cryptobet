-- Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_name TEXT NOT NULL,
  referred_user_email TEXT NOT NULL,
  amount DECIMAL(10, 2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'available', 'withdrawn')),
  deposit_date TIMESTAMP WITH TIME ZONE,
  available_date TIMESTAMP WITH TIME ZONE,
  join_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, referred_user_id)
);

-- Create referral_withdrawals table
CREATE TABLE IF NOT EXISTS referral_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  amount_after_fee DECIMAL(10, 2),
  fee_percentage DECIMAL(5, 2),
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  type TEXT NOT NULL CHECK (type IN ('withdrawal', 'transfer')),
  method TEXT,
  crypto_address TEXT,
  vip_level INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_referrals_user_id ON referrals(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referral_withdrawals_user_id ON referral_withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_withdrawals_status ON referral_withdrawals(status);

-- Enable Row Level Security
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_withdrawals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referrals table
CREATE POLICY "Users can view their own referrals"
  ON referrals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own referrals"
  ON referrals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own referrals"
  ON referrals FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for referral_withdrawals table
CREATE POLICY "Users can view their own withdrawals"
  ON referral_withdrawals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own withdrawals"
  ON referral_withdrawals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own withdrawals"
  ON referral_withdrawals FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_referrals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_referrals_timestamp
  BEFORE UPDATE ON referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_referrals_updated_at();

CREATE TRIGGER update_referral_withdrawals_timestamp
  BEFORE UPDATE ON referral_withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION update_referrals_updated_at();

-- Function to automatically update referral status after 14 days
CREATE OR REPLACE FUNCTION update_referral_status()
RETURNS void AS $$
BEGIN
  UPDATE referrals
  SET status = 'available',
      available_date = NOW()
  WHERE status = 'pending'
    AND deposit_date IS NOT NULL
    AND deposit_date <= NOW() - INTERVAL '14 days';
END;
$$ LANGUAGE plpgsql;
