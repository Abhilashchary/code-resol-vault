-- Allow guest (anon) users to create share links
DROP POLICY IF EXISTS "Authenticated users can create share links" ON public.file_share_links;

CREATE POLICY "Anyone can create share links"
ON public.file_share_links
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
