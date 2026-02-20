
-- Drop the wrong FK pointing to profiles (Supabase Auth users)
ALTER TABLE public.favorites DROP CONSTRAINT IF EXISTS favorites_user_id_fkey;

-- Add correct FK pointing to guest_users
ALTER TABLE public.favorites
  ADD CONSTRAINT favorites_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.guest_users(id) ON DELETE CASCADE;
