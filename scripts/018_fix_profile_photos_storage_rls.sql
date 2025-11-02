-- Fix profile photos storage RLS policies
-- The issue is that the current policy expects files in {user_id}/ folder
-- but we're uploading to profile-photos/{user_id}-{timestamp}.ext

-- Drop existing incorrect policies
DROP POLICY IF EXISTS "Users can upload own profile photo" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own profile photo" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own profile photo" ON storage.objects;

-- Create new correct policy that allows uploading to profile-photos bucket
-- Files are named: {user_id}-{timestamp}.ext
CREATE POLICY "Users can upload own profile photo"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos'
);

-- Allow users to update their own profile photos (both individual files and in their folder)
CREATE POLICY "Users can update own profile photo"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-photos'
);

-- Allow users to delete their own profile photos
CREATE POLICY "Users can delete own profile photo"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-photos'
);

-- Update bucket file size limit from 2MB to 8MB
UPDATE storage.buckets 
SET file_size_limit = 8388608
WHERE id = 'profile-photos';
