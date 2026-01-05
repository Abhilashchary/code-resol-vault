-- Public guest mode: allow anon users to access favorites and file_access_logs

-- Favorites: allow anon + authenticated for all operations
DROP POLICY IF EXISTS "Anyone can view favorites" ON public.favorites;
CREATE POLICY "Anyone can view favorites"
ON public.favorites
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Anyone can add favorites" ON public.favorites;
CREATE POLICY "Anyone can add favorites"
ON public.favorites
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can remove favorites" ON public.favorites;
CREATE POLICY "Anyone can remove favorites"
ON public.favorites
FOR DELETE
TO anon, authenticated
USING (true);

-- File access logs: allow anon + authenticated for read and insert
DROP POLICY IF EXISTS "Anyone can view access logs" ON public.file_access_logs;
CREATE POLICY "Anyone can view access logs"
ON public.file_access_logs
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Anyone can create access logs" ON public.file_access_logs;
CREATE POLICY "Anyone can create access logs"
ON public.file_access_logs
FOR INSERT
TO anon, authenticated
WITH CHECK (true);