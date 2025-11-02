-- Create bets (purchases/apuestas) table
CREATE TABLE IF NOT EXISTS public.bets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    asset TEXT NOT NULL, -- Cryptocurrency name (Bitcoin, Ethereum, etc.)
    amount DECIMAL(20, 2) NOT NULL, -- Bet amount in USD
    shares DECIMAL(20, 8) NOT NULL, -- Amount of cryptocurrency
    price DECIMAL(20, 2) NOT NULL, -- Price per unit at time of bet
    type TEXT NOT NULL CHECK (type IN ('Apuesta a Favor', 'Apuesta en Contra', 'Compra')),
    direction TEXT NOT NULL CHECK (direction IN ('a_favor', 'en_contra')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'processed')),
    is_processed BOOLEAN DEFAULT FALSE, -- Flag to indicate if bet has been processed for results
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT positive_amount CHECK (amount > 0),
    CONSTRAINT positive_shares CHECK (shares > 0),
    CONSTRAINT positive_price CHECK (price > 0)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON public.bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_status ON public.bets(status);
CREATE INDEX IF NOT EXISTS idx_bets_asset ON public.bets(asset);
CREATE INDEX IF NOT EXISTS idx_bets_created_at ON public.bets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bets_is_processed ON public.bets(is_processed);

-- Enable Row Level Security
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own bets
CREATE POLICY "Users can view own bets"
    ON public.bets
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own bets
CREATE POLICY "Users can insert own bets"
    ON public.bets
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own bets (for cancellation)
CREATE POLICY "Users can update own bets"
    ON public.bets
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all bets
CREATE POLICY "Admins can view all bets"
    ON public.bets
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Policy: Admins can update all bets (for processing results)
CREATE POLICY "Admins can update all bets"
    ON public.bets
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_bets_updated_at_trigger
    BEFORE UPDATE ON public.bets
    FOR EACH ROW
    EXECUTE FUNCTION update_bets_updated_at();

-- Create a table to store scheduled processing times
CREATE TABLE IF NOT EXISTS public.bet_processing_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    is_processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS for bet_processing_schedule
ALTER TABLE public.bet_processing_schedule ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view the schedule
CREATE POLICY "Everyone can view schedule"
    ON public.bet_processing_schedule
    FOR SELECT
    USING (true);

-- Policy: Only admins can insert/update schedule
CREATE POLICY "Admins can manage schedule"
    ON public.bet_processing_schedule
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
