-- Add profiles join view for better file queries with uploader info
-- This helps us get uploader name without exposing email to regular users

-- No schema changes needed, RLS policies are already correct
-- Users can see all files (public read) and all folders (public read)
-- The issue is that we're not fetching uploader information

-- Let's verify RLS is working correctly by ensuring policies exist
-- These should already be in place from initial migration