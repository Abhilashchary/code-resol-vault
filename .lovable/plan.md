
## Fix: Favorites Foreign Key Constraint

### Root Cause

The `favorites` table has this constraint:
```
favorites_user_id_fkey → FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
```

The `profiles` table only stores Supabase Auth users. But your app uses **guest users** (stored in `guest_users` table). When a guest tries to add a favorite, their `guest_users.id` doesn't exist in `profiles`, so the database rejects the insert with a foreign key violation.

### Fix Plan

**Step 1 — Drop the wrong foreign key**

Drop `favorites_user_id_fkey` which incorrectly points to `profiles(id)`.

**Step 2 — Add the correct foreign key**

Add a new foreign key from `favorites.user_id` → `guest_users(id) ON DELETE CASCADE`. This ensures:
- Only valid guest user IDs can be used.
- If a guest user is deleted, their favorites are cleaned up automatically.

**Step 3 — Verify the unique constraint stays intact**

The `UNIQUE (user_id, file_id)` constraint on `favorites` is correct and should remain — it prevents duplicate favorites for the same user+file combination.

### Database Migration SQL

```sql
-- Drop the incorrect FK pointing to profiles (Supabase Auth users)
ALTER TABLE public.favorites DROP CONSTRAINT favorites_user_id_fkey;

-- Add correct FK pointing to guest_users
ALTER TABLE public.favorites
  ADD CONSTRAINT favorites_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.guest_users(id) ON DELETE CASCADE;
```

### No Code Changes Needed

The frontend code in `Dashboard.tsx`, `Recent.tsx`, and `Favorites.tsx` already correctly resolves the `guestUserId` from the `guest_users` table before inserting. Once the database constraint is fixed, favorites will work end-to-end.

### Technical Summary

| Before | After |
|--------|-------|
| `favorites.user_id` → `profiles.id` (Supabase Auth only) | `favorites.user_id` → `guest_users.id` (Guest users) |
| Insert fails for all guests | Insert succeeds for all guests |

This is a single migration — no frontend code changes required.
