-- Allow anonymous users to read file metadata when there's a valid share link
CREATE POLICY "Anonymous can view files with valid share links" 
ON public.files 
FOR SELECT 
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.file_share_links
    WHERE file_share_links.file_id = files.id
    AND (file_share_links.expires_at IS NULL OR file_share_links.expires_at > now())
    AND (file_share_links.download_limit IS NULL OR file_share_links.download_count < file_share_links.download_limit)
  )
);

-- Allow anonymous users to read share links by token
CREATE POLICY "Anyone can read share links by token" 
ON public.file_share_links 
FOR SELECT 
TO anon
USING (true);

-- Allow anonymous users to update download_count on share links (for increment)
CREATE POLICY "Anyone can increment download count" 
ON public.file_share_links 
FOR UPDATE 
TO anon
USING (true)
WITH CHECK (true);