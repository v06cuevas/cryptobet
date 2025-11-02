-- Create crypto table for storing API keys
CREATE TABLE IF NOT EXISTS crypto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coinmarketcap_api_key TEXT,
  coingecko_api_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE crypto ENABLE ROW LEVEL SECURITY;

-- Create policy: Only admins can view API keys
CREATE POLICY "Only admins can view API keys"
  ON crypto
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.profile_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.is_active = true
    )
  );

-- Create policy: Only admins can insert API keys
CREATE POLICY "Only admins can insert API keys"
  ON crypto
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.profile_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.is_active = true
    )
  );

-- Create policy: Only admins can update API keys
CREATE POLICY "Only admins can update API keys"
  ON crypto
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.profile_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.is_active = true
    )
  );

-- Create policy: Only admins can delete API keys
CREATE POLICY "Only admins can delete API keys"
  ON crypto
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.profile_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.is_active = true
    )
  );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_crypto_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
CREATE TRIGGER update_crypto_updated_at_trigger
  BEFORE UPDATE ON crypto
  FOR EACH ROW
  EXECUTE FUNCTION update_crypto_updated_at();

-- Insert a default row for storing the API keys (optional)
INSERT INTO crypto (coinmarketcap_api_key, coingecko_api_key)
VALUES (NULL, NULL)
ON CONFLICT DO NOTHING;
