import type { PostgrestError } from "@supabase/supabase-js"
import { today } from "@/lib/dates"
import type {
  ActivityLog,
  Area,
  AreaVisit,
  Blocker,
  DayTarget,
  Decision,
  Defect,
  Observation,
  Person,
  Photo,
  ProjectState,
  Task,
  TaskEvent,
  Tour,
  User,
} from "@/lib/types"
import { getSupabaseClient } from "./client"

interface ProjectRow {
  id: string
  external_id: string
  name: string
  description: string | null
  address: string | null
  company_name: string | null
  apartments: number
  basements: number
  floors: number
  started_at: string
  expected_completion_date: string | null
  status: ProjectState["project"]["status"]
}

const DEFAULT_PROJECT_EXTERNAL_ID = "proj-1"

function toError(error: PostgrestError | null, context: string) {
  return new Error(error ? `${context}: ${error.message}` : context)
}

function isActiveTrue<T extends { active?: boolean }>(rows: T[]) {
  return rows.map((row) => ({ ...row, active: row.active !== false }))
}

function toRouteRows(projectId: string, route: string[]) {
  return route.map((areaId, index) => ({
    project_id: projectId,
    area_external_id: areaId,
    route_order: index + 1,
  }))
}

function flattenVisits(projectId: string, tours: Tour[]) {
  const rows: Array<{
    project_id: string
    tour_external_id: string
    area_external_id: string
    visited_at: string | null
    skipped: boolean
    active_today: boolean | null
    team_ids: string[]
    workers_count: number | null
    progress_tags: string[]
    progress_note: string
    observation_ids: string[]
    task_ids: string[]
    blocker_ids: string[]
    defect_ids: string[]
    decision_ids: string[]
    photo_ids: string[]
  }> = []

  tours.forEach((tour) => {
    Object.entries(tour.visits).forEach(([areaId, visit]) => {
      rows.push({
        project_id: projectId,
        tour_external_id: tour.id,
        area_external_id: areaId,
        visited_at: visit.visitedAt,
        skipped: visit.skipped,
        active_today: visit.activeToday,
        team_ids: visit.teamIds,
        workers_count: visit.workersCount,
        progress_tags: visit.progressTags,
        progress_note: visit.progressNote,
        observation_ids: visit.observationIds,
        task_ids: visit.taskIds,
        blocker_ids: visit.blockerIds,
        defect_ids: visit.defectIds,
        decision_ids: visit.decisionIds,
        photo_ids: visit.photoIds,
      })
    })
  })

  return rows
}

function flattenTaskEvents(projectId: string, tasks: Task[]) {
  return tasks.flatMap((task) =>
    task.history.map((event, index) => ({
      project_id: projectId,
      task_external_id: task.id,
      idx: index,
      date: event.date,
      time: event.time ?? null,
      text: event.text,
    })),
  )
}

async function ensureProject(project: ProjectState["project"]) {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  const payload = {
    external_id: project.id || DEFAULT_PROJECT_EXTERNAL_ID,
    name: project.name,
    description: project.description ?? null,
    address: project.address ?? null,
    company_name: project.companyName ?? null,
    apartments: project.apartments,
    basements: project.basements,
    floors: project.floors,
    started_at: project.startedAt,
    expected_completion_date: project.expectedCompletionDate ?? null,
    status: project.status,
  }

  const { data, error } = await supabase
    .from("projects")
    .upsert(payload, { onConflict: "external_id" })
    .select("id, external_id")
    .single()

  if (error || !data) throw toError(error, "Failed to upsert project")
  return data as { id: string; external_id: string }
}

async function replaceRoute(projectId: string, route: string[]) {
  const supabase = getSupabaseClient()
  if (!supabase) return

  const del = await supabase.from("tour_routes").delete().eq("project_id", projectId)
  if (del.error) throw toError(del.error, "Failed to clear route")

  if (route.length === 0) return

  const ins = await supabase.from("tour_routes").insert(toRouteRows(projectId, route))
  if (ins.error) throw toError(ins.error, "Failed to save route")
}

async function replaceTaskEvents(projectId: string, tasks: Task[]) {
  const supabase = getSupabaseClient()
  if (!supabase) return

  const taskIds = tasks.map((task) => task.id)
  if (taskIds.length > 0) {
    const del = await supabase
      .from("task_events")
      .delete()
      .eq("project_id", projectId)
      .in("task_external_id", taskIds)
    if (del.error) throw toError(del.error, "Failed to clear task events")
  }

  const rows = flattenTaskEvents(projectId, tasks)
  if (rows.length === 0) return

  const ins = await supabase.from("task_events").insert(rows)
  if (ins.error) throw toError(ins.error, "Failed to save task events")
}

async function upsertRows(table: string, rows: Record<string, unknown>[], onConflict: string) {
  if (rows.length === 0) return
  const supabase = getSupabaseClient()
  if (!supabase) return

  const { error } = await supabase.from(table).upsert(rows, { onConflict })
  if (error) throw toError(error, `Failed to upsert ${table}`)
}

function mapProjectRowToState(row: ProjectRow): ProjectState["project"] {
  return {
    id: row.external_id,
    name: row.name,
    description: row.description ?? undefined,
    address: row.address ?? undefined,
    companyName: row.company_name ?? undefined,
    apartments: row.apartments,
    basements: row.basements,
    floors: row.floors,
    startedAt: row.started_at,
    expectedCompletionDate: row.expected_completion_date ?? undefined,
    status: row.status,
  }
}

function mapVisitRows(rows: Array<Record<string, unknown>>): Record<string, Record<string, AreaVisit>> {
  const visitsByTour: Record<string, Record<string, AreaVisit>> = {}

  rows.forEach((row) => {
    const tourId = String(row.tour_external_id)
    const areaId = String(row.area_external_id)

    if (!visitsByTour[tourId]) visitsByTour[tourId] = {}

    visitsByTour[tourId][areaId] = {
      areaId,
      visitedAt: (row.visited_at as string | null) ?? null,
      skipped: Boolean(row.skipped),
      activeToday: row.active_today as boolean | null,
      teamIds: (row.team_ids as string[]) ?? [],
      workersCount: (row.workers_count as number | null) ?? null,
      progressTags: (row.progress_tags as string[]) ?? [],
      progressNote: (row.progress_note as string) ?? "",
      observationIds: (row.observation_ids as string[]) ?? [],
      taskIds: (row.task_ids as string[]) ?? [],
      blockerIds: (row.blocker_ids as string[]) ?? [],
      defectIds: (row.defect_ids as string[]) ?? [],
      decisionIds: (row.decision_ids as string[]) ?? [],
      photoIds: (row.photo_ids as string[]) ?? [],
    }
  })

  return visitsByTour
}

function mapTaskHistory(
  tasks: Task[],
  events: Array<{ task_external_id: string; idx: number; date: string; time: string | null; text: string }>,
) {
  const byTask = new Map<string, TaskEvent[]>()

  events
    .sort((a, b) => a.idx - b.idx)
    .forEach((event) => {
      const list = byTask.get(event.task_external_id) ?? []
      list.push({
        date: event.date,
        time: event.time ?? undefined,
        text: event.text,
      })
      byTask.set(event.task_external_id, list)
    })

  return tasks.map((task) => ({
    ...task,
    history: byTask.get(task.id) ?? task.history ?? [],
  }))
}

export async function saveProjectStateToSupabase(state: ProjectState) {
  const projectRef = await ensureProject(state.project)
  if (!projectRef) return
  const projectId = projectRef.id

  await replaceRoute(projectId, state.tourRoute)

  await upsertRows(
    "areas",
    state.areas.map((area: Area) => ({
      project_id: projectId,
      external_id: area.id,
      name: area.name,
      zone: area.zone,
      level: area.level,
      wing: area.wing,
      route_order: area.routeOrder,
      parent_external_id: area.parentId ?? null,
      active: area.active !== false,
    })),
    "project_id,external_id",
  )

  await upsertRows(
    "people",
    state.people.map((person: Person) => ({
      project_id: projectId,
      external_id: person.id,
      name: person.name,
      group_name: person.group,
      role: person.role,
      trade: person.trade ?? null,
      phone: person.phone ?? null,
      email: person.email ?? null,
      notes: person.notes ?? null,
      active: person.active !== false,
    })),
    "project_id,external_id",
  )

  await upsertRows(
    "users",
    state.users.map((user: User) => ({
      project_id: projectId,
      external_id: user.id,
      name: user.name,
      email: user.email ?? null,
      phone: user.phone ?? null,
      role: user.role,
      active: user.active !== false,
    })),
    "project_id,external_id",
  )

  await upsertRows(
    "tours",
    state.tours.map((tour: Tour) => ({
      project_id: projectId,
      external_id: tour.id,
      date: tour.date,
      started_at: tour.startedAt,
      ended_at: tour.endedAt,
      status: tour.status,
      route_area_ids: tour.routeAreaIds,
      top_priorities: tour.topPriorities,
    })),
    "project_id,external_id",
  )

  await upsertRows("tour_area_visits", flattenVisits(projectId, state.tours), "project_id,tour_external_id,area_external_id")

  await upsertRows(
    "observations",
    state.observations.map((observation: Observation) => ({
      project_id: projectId,
      external_id: observation.id,
      tour_external_id: observation.tourId,
      area_external_id: observation.areaId,
      date: observation.date,
      time: observation.time,
      kind: observation.kind,
      text: observation.text,
      pending: observation.pending === true,
    })),
    "project_id,external_id",
  )

  await upsertRows(
    "tasks",
    state.tasks.map((task: Task) => ({
      project_id: projectId,
      external_id: task.id,
      title: task.title,
      description: task.description ?? null,
      area_external_id: task.areaId,
      assignee_external_id: task.assigneeId,
      assignee_group: task.assigneeGroup,
      priority: task.priority,
      status: task.status,
      due_date: task.dueDate,
      created_at_date: task.createdAt,
      source: task.source,
      tour_external_id: task.tourId ?? null,
      observation_external_id: task.observationId ?? null,
      decision_external_id: task.decisionId ?? null,
      blocker_external_id: task.blockerId ?? null,
      defect_external_id: task.defectId ?? null,
      photo_ids: task.photoIds ?? [],
      completed_at: task.completedAt ?? null,
      pending: task.pending === true,
    })),
    "project_id,external_id",
  )

  await replaceTaskEvents(projectId, state.tasks)

  await upsertRows(
    "blockers",
    state.blockers.map((blocker: Blocker) => ({
      project_id: projectId,
      external_id: blocker.id,
      area_external_id: blocker.areaId,
      date: blocker.date,
      reason: blocker.reason,
      text: blocker.text,
      status: blocker.status,
      tour_external_id: blocker.tourId ?? null,
      task_external_id: blocker.taskId ?? null,
      streak: blocker.streak ?? null,
      pending: blocker.pending === true,
    })),
    "project_id,external_id",
  )

  await upsertRows(
    "defects",
    state.defects.map((defect: Defect) => ({
      project_id: projectId,
      external_id: defect.id,
      area_external_id: defect.areaId,
      date: defect.date,
      title: defect.title,
      severity: defect.severity,
      status: defect.status,
      assignee_external_id: defect.assigneeId ?? null,
      photo_external_id: defect.photoId ?? null,
      tour_external_id: defect.tourId ?? null,
      pending: defect.pending === true,
    })),
    "project_id,external_id",
  )

  await upsertRows(
    "decisions",
    state.decisions.map((decision: Decision) => ({
      project_id: projectId,
      external_id: decision.id,
      area_external_id: decision.areaId,
      date: decision.date,
      time: decision.time,
      contractor_external_id: decision.contractorId,
      my_requirement: decision.myRequirement,
      their_requirement: decision.theirRequirement,
      commitment: decision.commitment,
      due_date: decision.dueDate,
      notes: decision.notes ?? null,
      task_ids: decision.taskIds,
      tour_external_id: decision.tourId ?? null,
      pending: decision.pending === true,
    })),
    "project_id,external_id",
  )

  await upsertRows(
    "contractor_agreements",
    state.decisions.map((decision: Decision) => ({
      project_id: projectId,
      external_id: decision.id,
      decision_external_id: decision.id,
      contractor_external_id: decision.contractorId,
      commitment: decision.commitment,
      due_date: decision.dueDate,
      status: "active",
      notes: decision.notes ?? null,
    })),
    "project_id,external_id",
  )

  await upsertRows(
    "photos",
    state.photos.map((photo: Photo) => ({
      project_id: projectId,
      external_id: photo.id,
      area_external_id: photo.areaId,
      date: photo.date,
      time: photo.time,
      caption: photo.caption,
      url: photo.url,
      storage_path: null,
      tour_external_id: photo.tourId ?? null,
      task_external_id: photo.taskId ?? null,
      defect_external_id: photo.defectId ?? null,
      pair_key: photo.pairKey ?? null,
      stage: photo.stage ?? null,
      pending: photo.pending === true,
    })),
    "project_id,external_id",
  )

  await upsertRows(
    "activity_logs",
    state.activity.map((item: ActivityLog) => ({
      project_id: projectId,
      external_id: item.id,
      date: item.date,
      time: item.time,
      kind: item.kind,
      text: item.text,
      area_external_id: item.areaId ?? null,
      person_external_id: item.personId ?? null,
      ref_external_id: item.refId ?? null,
    })),
    "project_id,external_id",
  )

  await upsertRows(
    "day_targets",
    state.dayTargets.map((target: DayTarget) => ({
      project_id: projectId,
      external_id: target.id,
      text: target.text,
      task_external_id: target.taskId ?? null,
      done: target.done,
      date: target.date,
    })),
    "project_id,external_id",
  )
}

export async function loadProjectStateFromSupabase(): Promise<ProjectState | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  const projectRes = await supabase
    .from("projects")
    .select("*")
    .eq("external_id", DEFAULT_PROJECT_EXTERNAL_ID)
    .maybeSingle()

  if (projectRes.error) throw toError(projectRes.error, "Failed to load project")
  if (!projectRes.data) return null

  const project = projectRes.data as ProjectRow
  const projectId = project.id

  const [
    areaRes,
    routeRes,
    peopleRes,
    usersRes,
    tourRes,
    visitRes,
    observationRes,
    taskRes,
    taskEventRes,
    blockerRes,
    defectRes,
    decisionRes,
    photoRes,
    activityRes,
    dayTargetRes,
  ] = await Promise.all([
    supabase.from("areas").select("*").eq("project_id", projectId),
    supabase.from("tour_routes").select("*").eq("project_id", projectId).order("route_order", { ascending: true }),
    supabase.from("people").select("*").eq("project_id", projectId),
    supabase.from("users").select("*").eq("project_id", projectId),
    supabase.from("tours").select("*").eq("project_id", projectId),
    supabase.from("tour_area_visits").select("*").eq("project_id", projectId),
    supabase.from("observations").select("*").eq("project_id", projectId),
    supabase.from("tasks").select("*").eq("project_id", projectId),
    supabase.from("task_events").select("*").eq("project_id", projectId).order("idx", { ascending: true }),
    supabase.from("blockers").select("*").eq("project_id", projectId),
    supabase.from("defects").select("*").eq("project_id", projectId),
    supabase.from("decisions").select("*").eq("project_id", projectId),
    supabase.from("photos").select("*").eq("project_id", projectId),
    supabase.from("activity_logs").select("*").eq("project_id", projectId),
    supabase.from("day_targets").select("*").eq("project_id", projectId),
  ])

  const all = [
    areaRes,
    routeRes,
    peopleRes,
    usersRes,
    tourRes,
    visitRes,
    observationRes,
    taskRes,
    taskEventRes,
    blockerRes,
    defectRes,
    decisionRes,
    photoRes,
    activityRes,
    dayTargetRes,
  ]
  const firstError = all.find((x) => x.error)?.error ?? null
  if (firstError) throw toError(firstError, "Failed to load project state")

  const visitsByTour = mapVisitRows((visitRes.data ?? []) as Array<Record<string, unknown>>)

  const tours: Tour[] = ((tourRes.data ?? []) as Array<Record<string, unknown>>).map((tour) => ({
    id: String(tour.external_id),
    date: String(tour.date),
    startedAt: (tour.started_at as string | null) ?? null,
    endedAt: (tour.ended_at as string | null) ?? null,
    status: tour.status as Tour["status"],
    routeAreaIds: (tour.route_area_ids as string[]) ?? [],
    visits: visitsByTour[String(tour.external_id)] ?? {},
    topPriorities: (tour.top_priorities as string[]) ?? [],
  }))

  const tasksWithoutHistory: Task[] = ((taskRes.data ?? []) as Array<Record<string, unknown>>).map((task) => ({
    id: String(task.external_id),
    title: String(task.title),
    description: (task.description as string | null) ?? undefined,
    areaId: (task.area_external_id as string | null) ?? null,
    assigneeId: String(task.assignee_external_id),
    assigneeGroup: task.assignee_group as Task["assigneeGroup"],
    priority: task.priority as Task["priority"],
    status: task.status as Task["status"],
    dueDate: (task.due_date as string | null) ?? null,
    createdAt: String(task.created_at_date),
    source: String(task.source),
    tourId: (task.tour_external_id as string | null) ?? null,
    observationId: (task.observation_external_id as string | null) ?? null,
    decisionId: (task.decision_external_id as string | null) ?? null,
    blockerId: (task.blocker_external_id as string | null) ?? null,
    defectId: (task.defect_external_id as string | null) ?? null,
    photoIds: (task.photo_ids as string[]) ?? [],
    history: [],
    completedAt: (task.completed_at as string | null) ?? null,
    pending: Boolean(task.pending),
  }))

  const tasks = mapTaskHistory(
    tasksWithoutHistory,
    (taskEventRes.data ?? []) as Array<{ task_external_id: string; idx: number; date: string; time: string | null; text: string }>,
  )

  const state: ProjectState = {
    project: mapProjectRowToState(project),
    areas: isActiveTrue(
      ((areaRes.data ?? []) as Array<Record<string, unknown>>).map(
        (area): Area => ({
          id: String(area.external_id),
          name: String(area.name),
          zone: area.zone as Area["zone"],
          level: Number(area.level),
          wing: (area.wing as Area["wing"]) ?? null,
          routeOrder: Number(area.route_order),
          parentId: (area.parent_external_id as string | null) ?? null,
          active: area.active !== false,
        }),
      ),
    ),
    tourRoute: ((routeRes.data ?? []) as Array<Record<string, unknown>>).map((row) => String(row.area_external_id)),
    people: isActiveTrue(
      ((peopleRes.data ?? []) as Array<Record<string, unknown>>).map(
        (person): Person => ({
          id: String(person.external_id),
          name: String(person.name),
          group: person.group_name as Person["group"],
          role: String(person.role ?? ""),
          trade: (person.trade as string | null) ?? undefined,
          phone: (person.phone as string | null) ?? undefined,
          email: (person.email as string | null) ?? undefined,
          notes: (person.notes as string | null) ?? undefined,
          active: person.active !== false,
        }),
      ),
    ),
    users: isActiveTrue(
      ((usersRes.data ?? []) as Array<Record<string, unknown>>).map(
        (user): User => ({
          id: String(user.external_id),
          name: String(user.name),
          email: (user.email as string | null) ?? undefined,
          phone: (user.phone as string | null) ?? undefined,
          role: user.role as User["role"],
          active: user.active !== false,
        }),
      ),
    ),
    tasks,
    observations: ((observationRes.data ?? []) as Array<Record<string, unknown>>).map(
      (row): Observation => ({
        id: String(row.external_id),
        tourId: (row.tour_external_id as string | null) ?? null,
        areaId: String(row.area_external_id),
        date: String(row.date),
        time: String(row.time),
        kind: row.kind as Observation["kind"],
        text: String(row.text),
        pending: Boolean(row.pending),
      }),
    ),
    blockers: ((blockerRes.data ?? []) as Array<Record<string, unknown>>).map(
      (row): Blocker => ({
        id: String(row.external_id),
        areaId: String(row.area_external_id),
        date: String(row.date),
        reason: row.reason as Blocker["reason"],
        text: String(row.text),
        status: row.status as Blocker["status"],
        tourId: (row.tour_external_id as string | null) ?? null,
        taskId: (row.task_external_id as string | null) ?? null,
        streak: (row.streak as number | null) ?? undefined,
        pending: Boolean(row.pending),
      }),
    ),
    defects: ((defectRes.data ?? []) as Array<Record<string, unknown>>).map(
      (row): Defect => ({
        id: String(row.external_id),
        areaId: String(row.area_external_id),
        date: String(row.date),
        title: String(row.title),
        severity: row.severity as Defect["severity"],
        status: row.status as Defect["status"],
        assigneeId: (row.assignee_external_id as string | null) ?? null,
        photoId: (row.photo_external_id as string | null) ?? null,
        tourId: (row.tour_external_id as string | null) ?? null,
        pending: Boolean(row.pending),
      }),
    ),
    decisions: ((decisionRes.data ?? []) as Array<Record<string, unknown>>).map(
      (row): Decision => ({
        id: String(row.external_id),
        areaId: (row.area_external_id as string | null) ?? null,
        date: String(row.date),
        time: String(row.time),
        contractorId: String(row.contractor_external_id),
        myRequirement: String(row.my_requirement),
        theirRequirement: String(row.their_requirement),
        commitment: String(row.commitment),
        dueDate: (row.due_date as string | null) ?? null,
        notes: (row.notes as string | null) ?? undefined,
        taskIds: (row.task_ids as string[]) ?? [],
        tourId: (row.tour_external_id as string | null) ?? null,
        pending: Boolean(row.pending),
      }),
    ),
    photos: ((photoRes.data ?? []) as Array<Record<string, unknown>>).map(
      (row): Photo => ({
        id: String(row.external_id),
        areaId: String(row.area_external_id),
        date: String(row.date),
        time: String(row.time),
        caption: String(row.caption),
        url: String(row.url),
        tourId: (row.tour_external_id as string | null) ?? null,
        taskId: (row.task_external_id as string | null) ?? null,
        defectId: (row.defect_external_id as string | null) ?? null,
        pairKey: (row.pair_key as string | null) ?? undefined,
        stage: (row.stage as Photo["stage"]) ?? undefined,
        pending: Boolean(row.pending),
      }),
    ),
    tours,
    activity: ((activityRes.data ?? []) as Array<Record<string, unknown>>).map(
      (row): ActivityLog => ({
        id: String(row.external_id),
        date: String(row.date),
        time: String(row.time),
        kind: row.kind as ActivityLog["kind"],
        text: String(row.text),
        areaId: (row.area_external_id as string | null) ?? null,
        personId: (row.person_external_id as string | null) ?? null,
        refId: (row.ref_external_id as string | null) ?? null,
      }),
    ),
    dayTargets: ((dayTargetRes.data ?? []) as Array<Record<string, unknown>>).map(
      (row): DayTarget => ({
        id: String(row.external_id),
        text: String(row.text),
        taskId: (row.task_external_id as string | null) ?? null,
        done: Boolean(row.done),
        date: String(row.date),
      }),
    ),
    offline: false,
    pendingCount: 0,
    lastSyncAt: null,
  }

  if (!state.tours.some((tour) => tour.date === today())) {
    state.tours.push({
      id: `t-${today()}`,
      date: today(),
      startedAt: null,
      endedAt: null,
      status: "planned",
      routeAreaIds: state.tourRoute,
      visits: Object.fromEntries(state.tourRoute.map((areaId) => [
        areaId,
        {
          areaId,
          visitedAt: null,
          skipped: false,
          activeToday: null,
          teamIds: [],
          workersCount: null,
          progressTags: [],
          progressNote: "",
          observationIds: [],
          taskIds: [],
          blockerIds: [],
          defectIds: [],
          decisionIds: [],
          photoIds: [],
        },
      ])),
      topPriorities: [],
    })
  }

  return state
}

export function hasMeaningfulLocalData(state: ProjectState) {
  return (
    state.people.length > 0 ||
    state.users.length > 0 ||
    state.tasks.length > 0 ||
    state.observations.length > 0 ||
    state.blockers.length > 0 ||
    state.defects.length > 0 ||
    state.decisions.length > 0 ||
    state.photos.length > 0 ||
    state.tours.some((tour) => tour.status !== "planned")
  )
}
