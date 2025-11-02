-- Function to increment user balance (for bet cancellations and winnings)
CREATE OR REPLACE FUNCTION increment_balance(user_id UUID, amount DECIMAL)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET balance = balance + amount,
        updated_at = NOW()
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement user balance (for placing bets)
CREATE OR REPLACE FUNCTION decrement_balance(user_id UUID, amount DECIMAL)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET balance = balance - amount,
        updated_at = NOW()
    WHERE id = user_id
    AND balance >= amount; -- Only decrement if sufficient balance
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
