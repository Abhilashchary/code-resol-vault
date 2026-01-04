-- Public guest mode: allow anon users to read approved files/folders

-- Files: allow anon + authenticated to read all file rows
DROP POLICY IF EXISTS "Anyone can view files" ON public.files;
CREATE POLICY "Anyone can view files"
ON public.files
FOR SELECT
TO anon, authenticated
USING (true);

-- Folders: allow anon + authenticated to read all folder rows
DROP POLICY IF EXISTS "Anyone can view folders" ON public.folders;
CREATE POLICY "Anyone can view folders"
ON public.folders
FOR SELECT
TO anon, authenticated
USING (true);