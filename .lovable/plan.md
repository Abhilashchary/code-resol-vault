
## Root Cause Analysis

There are **two distinct problems** causing favorites to fail:

### Problem 1 — Database: Wrong Foreign Key (Primary Bug)

The `favorites` table has this constraint still in place:

```
favorites_user_id_fkey → FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
```

The `profiles` table only holds Supabase Auth users. Your app uses **guest users** (stored in `guest_users`). So every time a guest tries to add a favorite, the database rejects the insert because the `guest_users.id` does not exist in `profiles`. This is why favorites never save.

**Fix:** Drop the wrong FK and add a new one pointing to `guest_users(id)`.

---

### Problem 2 — Code: `Favorites.tsx` Loading State Bug

In `Favorites.tsx`, `setLoading(true)` is called inside `useEffect` before `loadData(id)` is called — but if `loadData` is called with a valid `userId`, it sets `setLoading(false)` inside its `finally` block. However, if the page is visited without a username, the code correctly sets `loading = false`. This part is actually fine now.

The real code issue is in **`handleToggleFavorite`** in `Favorites.tsx` — when a user un-favorites a file, it calls `loadData(guestUserId)`, but `loadData` does NOT call `setLoading(true)` at its top — meaning the list briefly disappears and reappears. Minor UX issue.

More critically: after toggling a favorite off on the Favorites page, the UI should immediately remove the file from the list — currently it does a full reload which is slow and can cause flickers.

---

### Problem 3 — Code: `upsert` conflict target mismatch

In `Dashboard.tsx` and `Recent.tsx`, the `upsert` uses `onConflict: "user_id,file_id"`. This works only when the DB constraint is named correctly and references the right table. Once Problem 1 is fixed (wrong FK), the upsert will work.

---

## The Fix Plan

### Step 1 — Database Migration (fixes the core bug)

Run a migration to:
1. Drop `favorites_user_id_fkey` (currently points to `profiles`)
2. Add a new `favorites_user_id_fkey` pointing to `guest_users(id) ON DELETE CASCADE`

```sql
ALTER TABLE public.favorites DROP CONSTRAINT favorites_user_id_fkey;

ALTER TABLE public.favorites
  ADD CONSTRAINT favorites_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.guest_users(id) ON DELETE CASCADE;
```

### Step 2 — Fix `Favorites.tsx` toggle behavior

The `handleToggleFavorite` in `Favorites.tsx` currently only removes (since the Favorites page shows only favorited files). After removing, it does a full `loadData` reload. Instead:
- Optimistically remove the file from the local `files` and `favorites` state immediately
- Still call the DB delete in background
- This makes the UI snappy and eliminates the loading flicker

### Step 3 — Fix `Recent.tsx` loading state

In `Recent.tsx`, `setLoading(true)` is missing from the `useEffect` `run()` function before the async work begins. This means the page briefly shows content then reloads. Add `setLoading(true)` at the start of `run()`.

### Step 4 — Ensure `Favorites.tsx` `loadData` sets loading correctly

Add `setLoading(true)` at the top of `loadData` in `Favorites.tsx` so the loading indicator shows during refreshes.

---

## Files Changed

| File | Change |
|------|--------|
| Database migration | Fix FK constraint on `favorites.user_id` |
| `src/pages/Favorites.tsx` | Optimistic UI for toggle, fix loading state |
| `src/pages/Recent.tsx` | Fix missing `setLoading(true)` in effect |

No changes needed to `FileShareDialog.tsx` or `Dashboard.tsx` — those are already correct.
