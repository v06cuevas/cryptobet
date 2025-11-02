-- Create VIP levels table to store VIP tier configuration
CREATE TABLE IF NOT EXISTS vip_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  deposit_required DECIMAL(10, 2) NOT NULL DEFAULT 0,
  monthly_limit DECIMAL(10, 2) NOT NULL,
  retiros_cantidad INTEGER NOT NULL DEFAULT 1,
  color TEXT NOT NULL,
  interest_rate DECIMAL(5, 2) NOT NULL,
  withdrawal_fee DECIMAL(5, 2) NOT NULL,
  benefits JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on level for faster lookups
CREATE INDEX IF NOT EXISTS idx_vip_levels_level ON vip_levels(level);

-- Insert VIP levels data
INSERT INTO vip_levels (level, name, deposit_required, monthly_limit, retiros_cantidad, color, interest_rate, withdrawal_fee, benefits) VALUES
(0, 'Básico', 0, 15, 1, 'bg-gray-400', 1.70, 9.6, 
  '["1 retiro mensual hasta $15", "Soporte por email", "Interés diario del 1.70%", "Comisión de retiro del 9.6%", "Acceso a mercados básicos"]'::jsonb),
(1, 'Principiante', 20, 15, 2, 'bg-zinc-400', 1.87, 9.6,
  '["2 retiros mensuales hasta $15", "Soporte por email", "Interés diario del 1.87%", "Comisión de retiro del 9.6%", "Acceso a mercados básicos"]'::jsonb),
(2, 'Bronce', 40, 30, 2, 'bg-amber-700', 2.04, 9.6,
  '["2 retiros mensuales hasta $30", "Soporte por chat", "Interés diario del 2.04%", "Comisión de retiro del 9.6%"]'::jsonb),
(3, 'Plata', 100, 75, 2, 'bg-slate-400', 2.21, 9.6,
  '["2 retiros mensuales hasta $75", "Soporte prioritario", "Interés diario del 2.21%", "Comisión de retiro del 9.6%"]'::jsonb),
(4, 'Oro', 500, 375, 2, 'bg-yellow-500', 2.38, 8.8,
  '["2 retiros mensuales hasta $375", "Gestor de cuenta personal", "Interés diario del 2.38%", "Comisión de retiro del 8.8%"]'::jsonb),
(5, 'Platino', 1022, 767, 2, 'bg-zinc-300', 2.55, 8.0,
  '["2 retiros mensuales hasta $767", "Gestor de cuenta dedicado", "Interés diario del 2.55%", "Comisión de retiro del 8.0%", "Acceso a eventos exclusivos"]'::jsonb),
(6, 'Esmeralda', 2318, 1739, 2, 'bg-emerald-500', 2.72, 7.2,
  '["2 retiros mensuales hasta $1,739", "Soporte 24/7", "Interés diario del 2.72%", "Comisión de retiro del 7.2%", "Invitaciones a eventos VIP"]'::jsonb),
(7, 'Rubí', 2700, 2025, 2, 'bg-red-600', 2.89, 6.4,
  '["2 retiros mensuales hasta $2,025", "Gestor financiero personal", "Interés diario del 2.89%", "Comisión de retiro del 6.4%", "Acceso a inversiones exclusivas"]'::jsonb),
(8, 'Zafiro', 3193, 2395, 2, 'bg-blue-600', 3.06, 5.6,
  '["2 retiros mensuales hasta $2,395", "Equipo de soporte dedicado", "Interés diario del 3.06%", "Comisión de retiro del 5.6%", "Análisis de mercado personalizado"]'::jsonb),
(9, 'Diamante', 3829, 2872, 2, 'bg-cyan-300', 3.23, 4.8,
  '["2 retiros mensuales hasta $2,872", "Concierge financiero 24/7", "Interés diario del 3.23%", "Comisión de retiro del 4.8%", "Estrategias de inversión personalizadas"]'::jsonb),
(10, 'VIP Black', 4649, 3487, 2, 'bg-black', 3.40, 4.0,
  '["2 retiros mensuales hasta $3,487", "Atención exclusiva", "Interés diario del 3.40%", "Comisión de retiro del 4.0%", "Sin comisiones de trading", "Acceso a todas las oportunidades de inversión", "Eventos exclusivos a nivel mundial"]'::jsonb);

-- Enable RLS
ALTER TABLE vip_levels ENABLE ROW LEVEL SECURITY;

-- Create policy to allow everyone to read VIP levels (public data)
CREATE POLICY "Anyone can view VIP levels"
  ON vip_levels
  FOR SELECT
  USING (true);

-- Create policy to allow only admins to modify VIP levels
CREATE POLICY "Only admins can modify VIP levels"
  ON vip_levels
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vip_levels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_vip_levels_timestamp
  BEFORE UPDATE ON vip_levels
  FOR EACH ROW
  EXECUTE FUNCTION update_vip_levels_updated_at();

-- Create function to calculate user VIP level based on total deposits
CREATE OR REPLACE FUNCTION calculate_user_vip_level(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_deposits DECIMAL(10, 2);
  vip_level INTEGER;
BEGIN
  -- Calculate total approved deposits for the user
  SELECT COALESCE(SUM(amount), 0)
  INTO total_deposits
  FROM deposits
  WHERE deposits.user_id = calculate_user_vip_level.user_id
  AND deposits.status = 'approved';

  -- Find the highest VIP level the user qualifies for
  SELECT COALESCE(MAX(level), 0)
  INTO vip_level
  FROM vip_levels
  WHERE deposit_required <= total_deposits;

  RETURN vip_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update user VIP level after deposit approval
CREATE OR REPLACE FUNCTION update_user_vip_level_on_deposit()
RETURNS TRIGGER AS $$
DECLARE
  new_vip_level INTEGER;
BEGIN
  -- Only update if deposit was just approved
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Calculate new VIP level
    new_vip_level := calculate_user_vip_level(NEW.user_id);
    
    -- Update user's VIP level in profiles table
    UPDATE profiles
    SET vip_level = new_vip_level,
        updated_at = NOW()
    WHERE id = NEW.user_id
    AND vip_level < new_vip_level; -- Only update if new level is higher
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update VIP level when deposit is approved
CREATE TRIGGER update_vip_level_on_deposit_approval
  AFTER INSERT OR UPDATE ON deposits
  FOR EACH ROW
  EXECUTE FUNCTION update_user_vip_level_on_deposit();
