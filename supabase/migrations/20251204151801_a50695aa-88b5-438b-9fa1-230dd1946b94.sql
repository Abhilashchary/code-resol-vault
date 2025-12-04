-- Create file_share_links table for sharing feature
CREATE TABLE IF NOT EXISTS public.file_share_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  download_limit INTEGER,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.file_share_links ENABLE ROW LEVEL SECURITY;

-- Policies for file_share_links
CREATE POLICY "Anyone can view share links by token" 
ON public.file_share_links 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create share links" 
ON public.file_share_links 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Creators can delete their share links" 
ON public.file_share_links 
FOR DELETE 
USING (created_by = auth.uid());

CREATE POLICY "Anyone can update download count" 
ON public.file_share_links 
FOR UPDATE 
USING (true);

-- Create index for faster token lookups
CREATE INDEX idx_file_share_links_token ON public.file_share_links(token);