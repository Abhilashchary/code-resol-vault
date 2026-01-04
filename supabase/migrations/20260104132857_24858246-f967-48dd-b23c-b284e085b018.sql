-- Drop existing restrictive storage policies
DROP POLICY IF EXISTS "Anyone can view files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete files" ON storage.objects;
DROP POLICY IF EXISTS "Public can view files" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Public can update files" ON storage.objects;
DROP POLICY IF EXISTS "Public can delete files" ON storage.objects;

-- Create new open policies for the files bucket
CREATE POLICY "Public can view files"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'files');

CREATE POLICY "Public can upload files"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'files');

CREATE POLICY "Public can update files"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'files');

CREATE POLICY "Public can delete files"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'files');