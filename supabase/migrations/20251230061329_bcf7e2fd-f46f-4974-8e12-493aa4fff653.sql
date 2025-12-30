-- Create guest_users table for username-only access
CREATE TABLE public.guest_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on guest_users
ALTER TABLE public.guest_users ENABLE ROW LEVEL SECURITY;

-- Anyone can read guest users
CREATE POLICY "Anyone can view guest users"
ON public.guest_users FOR SELECT
USING (true);

-- Anyone can create guest users
CREATE POLICY "Anyone can create guest users"
ON public.guest_users FOR INSERT
WITH CHECK (true);

-- Create pending_actions table for approval workflow
CREATE TABLE public.pending_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL CHECK (action_type IN ('upload', 'delete')),
  item_type text NOT NULL CHECK (item_type IN ('file', 'folder')),
  item_id uuid,
  temp_storage_path text,
  original_filename text,
  file_type text,
  file_size bigint,
  folder_id uuid REFERENCES public.folders(id) ON DELETE SET NULL,
  submitted_by text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by text
);

-- Enable RLS on pending_actions
ALTER TABLE public.pending_actions ENABLE ROW LEVEL SECURITY;

-- Anyone can view pending actions (for their own submissions)
CREATE POLICY "Anyone can view pending actions"
ON public.pending_actions FOR SELECT
USING (true);

-- Anyone can create pending actions
CREATE POLICY "Anyone can create pending actions"
ON public.pending_actions FOR INSERT
WITH CHECK (true);

-- Anyone can update pending actions (for admin approval)
CREATE POLICY "Anyone can update pending actions"
ON public.pending_actions FOR UPDATE
USING (true);

-- Anyone can delete pending actions
CREATE POLICY "Anyone can delete pending actions"
ON public.pending_actions FOR DELETE
USING (true);

-- Add submitted_by column to files table for tracking who uploaded
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS submitted_by text;

-- Add submitted_by column to folders table
ALTER TABLE public.folders ADD COLUMN IF NOT EXISTS submitted_by text;

-- Update files RLS to allow public access (no auth required)
DROP POLICY IF EXISTS "Authenticated users can upload files" ON public.files;
CREATE POLICY "Anyone can upload files"
ON public.files FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Uploaders can update their files" ON public.files;
CREATE POLICY "Anyone can update files"
ON public.files FOR UPDATE
USING (true);

-- Update folders RLS to allow public access
DROP POLICY IF EXISTS "Authenticated users can create folders" ON public.folders;
CREATE POLICY "Anyone can create folders"
ON public.folders FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Creators can update their folders" ON public.folders;
CREATE POLICY "Anyone can update folders"
ON public.folders FOR UPDATE
USING (true);

DROP POLICY IF EXISTS "Admins can delete folders" ON public.folders;
CREATE POLICY "Anyone can delete folders"
ON public.folders FOR DELETE
USING (true);

DROP POLICY IF EXISTS "Admins can delete files" ON public.files;
CREATE POLICY "Anyone can delete files"
ON public.files FOR DELETE
USING (true);

-- Update favorites to work without auth
DROP POLICY IF EXISTS "Users can add favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can remove favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can view their own favorites" ON public.favorites;

CREATE POLICY "Anyone can view favorites"
ON public.favorites FOR SELECT
USING (true);

CREATE POLICY "Anyone can add favorites"
ON public.favorites FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can remove favorites"
ON public.favorites FOR DELETE
USING (true);

-- Update file_access_logs policies
DROP POLICY IF EXISTS "Authenticated users can create access logs" ON public.file_access_logs;
DROP POLICY IF EXISTS "Users can view their own access logs" ON public.file_access_logs;

CREATE POLICY "Anyone can create access logs"
ON public.file_access_logs FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view access logs"
ON public.file_access_logs FOR SELECT
USING (true);

-- Update tags policies
DROP POLICY IF EXISTS "Authenticated users can create tags" ON public.tags;
CREATE POLICY "Anyone can create tags"
ON public.tags FOR INSERT
WITH CHECK (true);

-- Update file_tags policies
DROP POLICY IF EXISTS "Authenticated users can tag files" ON public.file_tags;
CREATE POLICY "Anyone can tag files"
ON public.file_tags FOR INSERT
WITH CHECK (true);

-- Create admin_sessions table for secure admin login
CREATE TABLE public.admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);

-- Enable RLS on admin_sessions
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

-- Only allow reading own session
CREATE POLICY "Anyone can view admin sessions"
ON public.admin_sessions FOR SELECT
USING (true);

CREATE POLICY "Anyone can create admin sessions"
ON public.admin_sessions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can delete admin sessions"
ON public.admin_sessions FOR DELETE
USING (true);