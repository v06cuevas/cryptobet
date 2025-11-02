-- Create broadcast_messages table for admin messages to all users
CREATE TABLE IF NOT EXISTS broadcast_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_message_reads table to track which users have read which messages
CREATE TABLE IF NOT EXISTS user_message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES broadcast_messages(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, message_id)
);

-- Create watchlist table for user's favorite cryptocurrencies
CREATE TABLE IF NOT EXISTS watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crypto_id TEXT NOT NULL,
  crypto_symbol TEXT NOT NULL,
  crypto_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, crypto_id)
);

-- Create portfolio table for user's cryptocurrency holdings
CREATE TABLE IF NOT EXISTS portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crypto_id TEXT NOT NULL,
  crypto_symbol TEXT NOT NULL,
  crypto_name TEXT NOT NULL,
  amount DECIMAL(20, 8) NOT NULL DEFAULT 0,
  average_buy_price DECIMAL(20, 2) NOT NULL DEFAULT 0,
  total_invested DECIMAL(20, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, crypto_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_message_reads_user_id ON user_message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_user_message_reads_message_id ON user_message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_user_id ON portfolio(user_id);

-- Enable Row Level Security
ALTER TABLE broadcast_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio ENABLE ROW LEVEL SECURITY;

-- RLS Policies for broadcast_messages
-- Anyone can read broadcast messages
CREATE POLICY "Anyone can read broadcast messages"
  ON broadcast_messages FOR SELECT
  USING (true);

-- Only admins can insert/update/delete broadcast messages
CREATE POLICY "Only admins can manage broadcast messages"
  ON broadcast_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for user_message_reads
-- Users can only read their own message reads
CREATE POLICY "Users can read own message reads"
  ON user_message_reads FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own message reads
CREATE POLICY "Users can insert own message reads"
  ON user_message_reads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own message reads
CREATE POLICY "Users can update own message reads"
  ON user_message_reads FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for watchlist
-- Users can only manage their own watchlist
CREATE POLICY "Users can read own watchlist"
  ON watchlist FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watchlist"
  ON watchlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlist"
  ON watchlist FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for portfolio
-- Users can only manage their own portfolio
CREATE POLICY "Users can read own portfolio"
  ON portfolio FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own portfolio"
  ON portfolio FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolio"
  ON portfolio FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own portfolio"
  ON portfolio FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_broadcast_messages_updated_at
  BEFORE UPDATE ON broadcast_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolio_updated_at
  BEFORE UPDATE ON portfolio
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
