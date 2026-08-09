-- Migration: Fix task_areas RLS policy
-- Safe, non-destructive. Preserves all existing data.
-- Root cause: task_areas policy was either missing or the helper function
-- lacked SECURITY DEFINER, causing RLS checks to fail for the anon role.

-- 1. Rebuild the helper function with SECURITY DEFINER so the internal
--    SELECT on `projects` bypasses that table's own RLS policies.
--    Without this, PostgreSQL evaluates the function as the caller (anon),
--    which may be denied by the projects RLS when called from within
--    another table's policy check context.
create or replace function project_is_single_target(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from projects p where p.id = pid and p.external_id = 'proj-1'
  );
$$;

-- 2. Ensure RLS is enabled on task_areas (idempotent).
alter table task_areas enable row level security;

-- 3. Recreate the task_areas policy.
--    DROP IF EXISTS makes this safe to run multiple times.
drop policy if exists task_areas_single_project on task_areas;
create policy task_areas_single_project on task_areas
  for all to anon
  using  (project_is_single_target(project_id))
  with check (project_is_single_target(project_id));
