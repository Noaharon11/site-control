# Supabase Setup (SiteControl)

## Environment variables
Use these in Vercel/local:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## Apply database schema
1. Open Supabase SQL editor.
2. Run `supabase/schema.sql`.

## Current architecture
- Source of truth: Supabase Postgres tables in `supabase/schema.sql`.
- App runtime state: existing reducer in `lib/store.tsx`.
- Offline cache + queue: browser localStorage.
- Sync layer: `lib/supabase/repository.ts` + `lib/supabase/queue.ts`.

## Notes
- Existing UI IDs are preserved as `external_id` for idempotent retries.
- Each table still uses UUID primary keys.
- RLS currently allows only the single `projects.external_id = 'proj-1'` scope for the anon key.
- Photo metadata is persisted in Postgres. Real file upload to Supabase Storage is prepared at schema level (`site-photos` bucket), but camera/file upload flow is not yet wired in UI.
