-- Create Storage Buckets for Payment Receipts and Profile Photos

-- Create bucket for payment receipts
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-receipts',
  'payment-receipts',
  false, -- Not public, only accessible with proper permissions
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Create bucket for profile photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos',
  'profile-photos',
  true, -- Public so profile photos can be displayed
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- RLS Policies for Payment Receipts Bucket
-- ============================================

-- Allow users to upload their own payment receipts
-- File naming convention: {user_id}/{timestamp}_{filename}
CREATE POLICY "Users can upload own payment receipts"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own payment receipts
CREATE POLICY "Users can view own payment receipts"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow admins to view all payment receipts
CREATE POLICY "Admins can view all payment receipts"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-receipts' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE profile_id = auth.uid()
    AND role = 'admin'
    AND is_active = true
  )
);

-- Allow admins to delete payment receipts
CREATE POLICY "Admins can delete payment receipts"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-receipts' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE profile_id = auth.uid()
    AND role = 'admin'
    AND is_active = true
  )
);

-- ============================================
-- RLS Policies for Profile Photos Bucket
-- ============================================

-- Allow users to upload their own profile photo
-- File naming convention: {user_id}/avatar.{ext}
CREATE POLICY "Users can upload own profile photo"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own profile photo
CREATE POLICY "Users can update own profile photo"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own profile photo
CREATE POLICY "Users can delete own profile photo"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow everyone to view profile photos (public bucket)
CREATE POLICY "Anyone can view profile photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-photos');
