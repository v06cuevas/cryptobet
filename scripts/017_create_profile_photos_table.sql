-- Create profile_photos table to store profile photos in the database
CREATE TABLE IF NOT EXISTS public.profile_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_profile_photos_user_id ON public.profile_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_photos_user_active ON public.profile_photos(user_id, is_active);

-- Enable Row Level Security
ALTER TABLE public.profile_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profile_photos table

-- Policy: Users can view their own profile photos
CREATE POLICY "Users can view own profile photos"
  ON public.profile_photos
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own profile photos
CREATE POLICY "Users can insert own profile photos"
  ON public.profile_photos
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own profile photos (to mark as inactive)
CREATE POLICY "Users can update own profile photos"
  ON public.profile_photos
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own profile photos
CREATE POLICY "Users can delete own profile photos"
  ON public.profile_photos
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Allow admins to view all profile photos
CREATE POLICY "Admins can view all profile photos"
  ON public.profile_photos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE profile_id = auth.uid()
      AND role = 'admin'
      AND is_active = true
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_profile_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on profile_photos changes
DROP TRIGGER IF EXISTS update_profile_photos_updated_at ON public.profile_photos;
CREATE TRIGGER update_profile_photos_updated_at
  BEFORE UPDATE ON public.profile_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_photos_updated_at();

-- Update profile-photos bucket to 8MB limit
UPDATE storage.buckets 
SET file_size_limit = 8388608 -- 8MB in bytes
WHERE id = 'profile-photos';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON public.profile_photos TO authenticated, service_role;
GRANT SELECT ON public.profile_photos TO anon;
