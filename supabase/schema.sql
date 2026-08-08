-- SiteControl relational schema for Supabase
-- UUID primary keys are server-generated.
-- App-level ids from the current UI are preserved as external_id for idempotent sync.

create extension if not exists pgcrypto;

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  name text not null,
  description text,
  address text,
  company_name text,
  apartments integer not null default 0,
  basements integer not null default 0,
  floors integer not null default 0,
  started_at date not null,
  expected_completion_date date,
  status text not null check (status in ('planning','active','finishing','completed','on_hold')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  external_id text not null,
  name text not null,
  email text,
  phone text,
  role text not null,
  active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, external_id)
);

create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  external_id text not null,
  name text not null,
  group_name text not null check (group_name in ('me','team','contractor')),
  role text not null default '',
  trade text,
  phone text,
  email text,
  notes text,
  active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, external_id)
);

create table if not exists areas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  external_id text not null,
  name text not null,
  zone text not null check (zone in ('basement','ground','floor','roof','facade','external')),
  level integer not null,
  wing text check (wing in ('east','west') or wing is null),
  route_order integer not null default 0,
  parent_external_id text,
  active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, external_id)
);

create table if not exists tour_routes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  area_external_id text not null,
  route_order integer not null,
  created_at timestamptz not null default now(),
  unique (project_id, area_external_id),
  unique (project_id, route_order),
  foreign key (project_id, area_external_id)
    references areas (project_id, external_id)
    on delete cascade
);

create table if not exists tours (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  external_id text not null,
  date date not null,
  started_at text,
  ended_at text,
  status text not null check (status in ('planned','active','done')),
  route_area_ids text[] not null default '{}',
  top_priorities text[] not null default '{}',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, external_id)
);

create table if not exists tour_area_visits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  tour_external_id text not null,
  area_external_id text not null,
  visited_at text,
  skipped boolean not null default false,
  active_today boolean,
  team_ids text[] not null default '{}',
  workers_count integer,
  progress_tags text[] not null default '{}',
  progress_note text not null default '',
  observation_ids text[] not null default '{}',
  task_ids text[] not null default '{}',
  blocker_ids text[] not null default '{}',
  defect_ids text[] not null default '{}',
  decision_ids text[] not null default '{}',
  photo_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, tour_external_id, area_external_id),
  foreign key (project_id, tour_external_id)
    references tours (project_id, external_id)
    on delete cascade,
  foreign key (project_id, area_external_id)
    references areas (project_id, external_id)
    on delete cascade
);

create table if not exists observations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  external_id text not null,
  tour_external_id text,
  area_external_id text not null,
  date date not null,
  time text not null,
  kind text not null check (kind in ('activity','progress','note','voice')),
  text text not null,
  pending boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, external_id),
  foreign key (project_id, area_external_id)
    references areas (project_id, external_id)
    on delete cascade
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  external_id text not null,
  title text not null,
  description text,
  area_external_id text,
  assignee_external_id text not null,
  assignee_group text not null check (assignee_group in ('me','team','contractor')),
  priority text not null check (priority in ('critical','high','normal','low')),
  status text not null check (status in ('new','open','in_progress','waiting','blocked','done')),
  due_date date,
  created_at_date date not null,
  source text not null,
  tour_external_id text,
  observation_external_id text,
  decision_external_id text,
  blocker_external_id text,
  defect_external_id text,
  photo_ids text[] not null default '{}',
  completed_at date,
  pending boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, external_id),
  foreign key (project_id, area_external_id)
    references areas (project_id, external_id)
    on delete set null
);

create table if not exists task_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  task_external_id text not null,
  idx integer not null,
  date date not null,
  time text,
  text text not null,
  created_at timestamptz not null default now(),
  unique (project_id, task_external_id, idx),
  foreign key (project_id, task_external_id)
    references tasks (project_id, external_id)
    on delete cascade
);

create table if not exists blockers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  external_id text not null,
  area_external_id text not null,
  date date not null,
  reason text not null check (reason in ('material','manpower','decision','other_contractor','design','quality','other')),
  text text not null,
  status text not null check (status in ('open','resolved')),
  tour_external_id text,
  task_external_id text,
  streak integer,
  pending boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, external_id),
  foreign key (project_id, area_external_id)
    references areas (project_id, external_id)
    on delete cascade
);

create table if not exists defects (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  external_id text not null,
  area_external_id text not null,
  date date not null,
  title text not null,
  severity text not null check (severity in ('critical','major','minor')),
  status text not null check (status in ('open','in_progress','fixed')),
  assignee_external_id text,
  photo_external_id text,
  tour_external_id text,
  pending boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, external_id),
  foreign key (project_id, area_external_id)
    references areas (project_id, external_id)
    on delete cascade
);

create table if not exists decisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  external_id text not null,
  area_external_id text,
  date date not null,
  time text not null,
  contractor_external_id text not null,
  my_requirement text not null,
  their_requirement text not null,
  commitment text not null,
  due_date date,
  notes text,
  task_ids text[] not null default '{}',
  tour_external_id text,
  pending boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, external_id)
);

create table if not exists contractor_agreements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  external_id text not null,
  decision_external_id text not null,
  contractor_external_id text not null,
  commitment text not null,
  due_date date,
  status text not null default 'active',
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, external_id)
);

create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  external_id text not null,
  area_external_id text not null,
  date date not null,
  time text not null,
  caption text not null,
  url text not null,
  storage_path text,
  tour_external_id text,
  task_external_id text,
  defect_external_id text,
  pair_key text,
  stage text check (stage in ('before','after') or stage is null),
  pending boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, external_id),
  foreign key (project_id, area_external_id)
    references areas (project_id, external_id)
    on delete cascade
);

create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  external_id text not null,
  date date not null,
  time text not null,
  kind text not null check (kind in ('observation','task_created','task_status','decision','blocker','defect','photo','tour','sync')),
  text text not null,
  area_external_id text,
  person_external_id text,
  ref_external_id text,
  created_at timestamptz not null default now(),
  unique (project_id, external_id)
);

create table if not exists day_targets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  external_id text not null,
  text text not null,
  task_external_id text,
  done boolean not null default false,
  date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, external_id)
);

-- Supabase Storage bucket for photos.
insert into storage.buckets (id, name, public)
values ('site-photos', 'site-photos', false)
on conflict (id) do nothing;

-- updated_at trigger helper
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Attach trigger to tables that include updated_at.
do $$
declare
  t text;
begin
  foreach t in array array[
    'projects','users','people','areas','tours','tour_area_visits','observations','tasks','blockers','defects','decisions','contractor_agreements','photos','day_targets'
  ]
  loop
    execute format('drop trigger if exists trg_%I_updated_at on %I;', t, t);
    execute format('create trigger trg_%I_updated_at before update on %I for each row execute function set_updated_at();', t, t);
  end loop;
end $$;

-- RLS policies for the current single-project stage.
-- NOTE: Without auth yet, anon access is restricted to the single project external_id 'proj-1'.
-- Replace with auth-linked membership policies in the next stage.
alter table projects enable row level security;
alter table users enable row level security;
alter table people enable row level security;
alter table areas enable row level security;
alter table tour_routes enable row level security;
alter table tours enable row level security;
alter table tour_area_visits enable row level security;
alter table observations enable row level security;
alter table tasks enable row level security;
alter table task_events enable row level security;
alter table blockers enable row level security;
alter table defects enable row level security;
alter table decisions enable row level security;
alter table contractor_agreements enable row level security;
alter table photos enable row level security;
alter table activity_logs enable row level security;
alter table day_targets enable row level security;

drop policy if exists projects_single_project_select on projects;
create policy projects_single_project_select on projects
for select to anon
using (external_id = 'proj-1');

drop policy if exists projects_single_project_write on projects;
create policy projects_single_project_write on projects
for all to anon
using (external_id = 'proj-1')
with check (external_id = 'proj-1');

-- Child table policy helper based on project_id.
create or replace function project_is_single_target(pid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from projects p where p.id = pid and p.external_id = 'proj-1'
  );
$$;

-- Apply same rule to project-scoped tables.
drop policy if exists users_single_project on users;
create policy users_single_project on users
for all to anon using (project_is_single_target(project_id)) with check (project_is_single_target(project_id));
drop policy if exists people_single_project on people;
create policy people_single_project on people
for all to anon using (project_is_single_target(project_id)) with check (project_is_single_target(project_id));
drop policy if exists areas_single_project on areas;
create policy areas_single_project on areas
for all to anon using (project_is_single_target(project_id)) with check (project_is_single_target(project_id));
drop policy if exists tour_routes_single_project on tour_routes;
create policy tour_routes_single_project on tour_routes
for all to anon using (project_is_single_target(project_id)) with check (project_is_single_target(project_id));
drop policy if exists tours_single_project on tours;
create policy tours_single_project on tours
for all to anon using (project_is_single_target(project_id)) with check (project_is_single_target(project_id));
drop policy if exists visits_single_project on tour_area_visits;
create policy visits_single_project on tour_area_visits
for all to anon using (project_is_single_target(project_id)) with check (project_is_single_target(project_id));
drop policy if exists observations_single_project on observations;
create policy observations_single_project on observations
for all to anon using (project_is_single_target(project_id)) with check (project_is_single_target(project_id));
drop policy if exists tasks_single_project on tasks;
create policy tasks_single_project on tasks
for all to anon using (project_is_single_target(project_id)) with check (project_is_single_target(project_id));
drop policy if exists task_events_single_project on task_events;
create policy task_events_single_project on task_events
for all to anon using (project_is_single_target(project_id)) with check (project_is_single_target(project_id));
drop policy if exists blockers_single_project on blockers;
create policy blockers_single_project on blockers
for all to anon using (project_is_single_target(project_id)) with check (project_is_single_target(project_id));
drop policy if exists defects_single_project on defects;
create policy defects_single_project on defects
for all to anon using (project_is_single_target(project_id)) with check (project_is_single_target(project_id));
drop policy if exists decisions_single_project on decisions;
create policy decisions_single_project on decisions
for all to anon using (project_is_single_target(project_id)) with check (project_is_single_target(project_id));
drop policy if exists agreements_single_project on contractor_agreements;
create policy agreements_single_project on contractor_agreements
for all to anon using (project_is_single_target(project_id)) with check (project_is_single_target(project_id));
drop policy if exists photos_single_project on photos;
create policy photos_single_project on photos
for all to anon using (project_is_single_target(project_id)) with check (project_is_single_target(project_id));
drop policy if exists activity_single_project on activity_logs;
create policy activity_single_project on activity_logs
for all to anon using (project_is_single_target(project_id)) with check (project_is_single_target(project_id));
drop policy if exists day_targets_single_project on day_targets;
create policy day_targets_single_project on day_targets
for all to anon using (project_is_single_target(project_id)) with check (project_is_single_target(project_id));

-- Storage policies (single bucket for site photos).
drop policy if exists photos_bucket_select on storage.objects;
create policy photos_bucket_select on storage.objects
for select to anon using (bucket_id = 'site-photos');

drop policy if exists photos_bucket_insert on storage.objects;
create policy photos_bucket_insert on storage.objects
for insert to anon
with check (bucket_id = 'site-photos');

drop policy if exists photos_bucket_update on storage.objects;
create policy photos_bucket_update on storage.objects
for update to anon
using (bucket_id = 'site-photos')
with check (bucket_id = 'site-photos');
