"use client"

import * as React from "react"
import { toast } from "sonner"
import { createSeedState, emptyVisit } from "./seed"
import { dayOffset, nowTime, today } from "./dates"
import { isSupabaseConfigured } from "./supabase/client"
import { clearQueue, enqueueOperation, queueSize, readQueue } from "./supabase/queue"
import {
  deleteTaskFromSupabase,
  hasMeaningfulLocalData,
  loadProjectStateFromSupabase,
  saveProjectStateToSupabase,
} from "./supabase/repository"
import type {
  ActivityKind,
  ActivityLog,
  Area,
  AreaVisit,
  Blocker,
  Decision,
  Defect,
  Observation,
  Person,
  Photo,
  ProjectState,
  Task,
  TaskStatus,
  Tour,
  User,
} from "./types"

const CACHE_STORAGE_KEY = "sitecontrol-cache-v1"
const LEGACY_STORAGE_KEY = "rakafot.pm.v1"
const CACHE_STORAGE_VERSION = 1

const DEMO_PERSON_IDS = new Set([
  "me",
  "p-yossi",
  "p-ahmad",
  "p-david",
  "c-cohen",
  "c-elec",
  "c-alum",
  "c-plumb",
  "c-paint",
  "c-gypsum",
  "c-doors",
])
const DEMO_USER_IDS = new Set(["u-1", "u-2"])
const DEMO_TASK_IDS = new Set(Array.from({ length: 27 }, (_, i) => `tk-${i + 1}`))
const DEMO_BLOCKER_IDS = new Set(Array.from({ length: 6 }, (_, i) => `bl-${i + 1}`))
const DEMO_DEFECT_IDS = new Set(Array.from({ length: 6 }, (_, i) => `d-${i + 1}`))
const DEMO_DECISION_IDS = new Set(Array.from({ length: 4 }, (_, i) => `dc-${i + 1}`))
const DEMO_OBSERVATION_IDS = new Set(Array.from({ length: 8 }, (_, i) => `ob-${i + 1}`))
const DEMO_PHOTO_IDS = new Set(Array.from({ length: 12 }, (_, i) => `ph-${i + 1}`))
const DEMO_TOUR_IDS = new Set(["t-0", "t-1", "t-2"])
const DEMO_ACTIVITY_IDS = new Set(Array.from({ length: 6 }, (_, i) => `ac-${i + 1}`))
const DEMO_DAY_TARGET_IDS = new Set(["dt-1", "dt-2", "dt-3"])

/* ------------------------------------------------------------- reducer ---- */

type Action =
  | { type: "hydrate"; state: ProjectState }
  | { type: "toggleOffline"; value?: boolean }
  | { type: "sync" }
  /* ---- project ---- */
  | { type: "updateProject"; patch: Partial<ProjectState["project"]> }
  /* ---- people ---- */
  | { type: "addPerson"; person: Person }
  | { type: "updatePerson"; id: string; patch: Partial<Person> }
  | { type: "archivePerson"; id: string }
  /* ---- areas ---- */
  | { type: "addArea"; area: Area }
  | { type: "updateArea"; id: string; patch: Partial<Area> }
  | { type: "archiveArea"; id: string }
  | { type: "setTourRoute"; areaIds: string[] }
  /* ---- users ---- */
  | { type: "addUser"; user: User }
  | { type: "updateUser"; id: string; patch: Partial<User> }
  | { type: "archiveUser"; id: string }
  /* ---- tours ---- */
  | { type: "startTour" }
  | { type: "endTour"; priorities: string[] }
  | { type: "saveVisit"; areaId: string; patch: Partial<AreaVisit> }
  | { type: "skipVisit"; areaId: string }
  /* ---- tasks ---- */
  | { type: "addTask"; task: Task }
  | { type: "updateTask"; id: string; patch: Partial<Task>; note?: string }
  | { type: "deleteTask"; id: string }
  /* ---- field records ---- */
  | { type: "addObservation"; observation: Observation }
  | { type: "addBlocker"; blocker: Blocker }
  | { type: "addDefect"; defect: Defect }
  | { type: "addDecision"; decision: Decision }
  | { type: "addPhoto"; photo: Photo }
  /* ---- targets / log ---- */
  | { type: "setTargets"; targets: { text: string; taskId?: string | null }[] }
  | { type: "toggleTarget"; id: string }
  | { type: "log"; kind: ActivityKind; text: string; areaId?: string | null; refId?: string | null }

function uid(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`
}

function isPersistentAction(action: Action) {
  switch (action.type) {
    case "hydrate":
    case "toggleOffline":
    case "sync":
    case "log":
      return false
    default:
      return true
  }
}

function log(
  state: ProjectState,
  kind: ActivityKind,
  text: string,
  areaId?: string | null,
  refId?: string | null,
): ActivityLog[] {
  return [
    { id: uid("ac"), date: today(), time: nowTime(), kind, text, areaId, refId },
    ...state.activity,
  ]
}

function currentTourIndex(state: ProjectState) {
  return state.tours.findIndex((t) => t.date === today())
}

function withTour(state: ProjectState, fn: (tour: Tour) => Tour): Tour[] {
  const idx = currentTourIndex(state)
  if (idx < 0) return state.tours
  const next = [...state.tours]
  next[idx] = fn(next[idx])
  return next
}

/** anything created while offline is marked pending until synced */
function pending(state: ProjectState) {
  return state.offline ? { pending: true } : {}
}

function bump(state: ProjectState, n = 1) {
  return state.offline ? state.pendingCount + n : state.pendingCount
}

function taskAreaIds(task: Task) {
  const ids = (task.areaIds ?? []).filter(Boolean)
  if (ids.length > 0) return [...new Set(ids)]
  return task.areaId ? [task.areaId] : []
}

function syncTourTaskLinks(tour: Tour, taskId: string, areaIds: string[]) {
  const wanted = new Set(areaIds)
  const nextVisits: Tour["visits"] = {}

  Object.entries(tour.visits).forEach(([areaId, visit]) => {
    const withoutTask = (visit.taskIds ?? []).filter((id) => id !== taskId)
    nextVisits[areaId] = wanted.has(areaId)
      ? { ...visit, taskIds: [...withoutTask, taskId] }
      : { ...visit, taskIds: withoutTask }
  })

  return { ...tour, visits: nextVisits }
}

function reducer(state: ProjectState, action: Action): ProjectState {
  switch (action.type) {
    case "hydrate":
      return action.state

    case "toggleOffline": {
      const offline = action.value ?? !state.offline
      return {
        ...state,
        offline,
        activity: log(
          state,
          "sync",
          offline ? "המכשיר עבר למצב ללא קליטה – העבודה נשמרת מקומית" : "החיבור חזר",
        ),
      }
    }

    /* ---------------------------------------------------------------- project */
    case "updateProject":
      return { ...state, project: { ...state.project, ...action.patch } }

    /* ---------------------------------------------------------------- people */
    case "addPerson":
      return { ...state, people: [...state.people, action.person] }

    case "updatePerson":
      return {
        ...state,
        people: state.people.map((p) => (p.id === action.id ? { ...p, ...action.patch } : p)),
      }

    case "archivePerson":
      return {
        ...state,
        people: state.people.map((p) => (p.id === action.id ? { ...p, active: false } : p)),
      }

    /* ---------------------------------------------------------------- areas */
    case "addArea": {
      const nextOrder = Math.max(0, ...state.areas.map((a) => a.routeOrder)) + 1
      const newArea = { ...action.area, routeOrder: nextOrder }
      return {
        ...state,
        areas: [...state.areas, newArea],
        tourRoute: [...state.tourRoute, newArea.id],
      }
    }

    case "updateArea":
      return {
        ...state,
        areas: state.areas.map((a) => (a.id === action.id ? { ...a, ...action.patch } : a)),
      }

    case "archiveArea":
      return {
        ...state,
        areas: state.areas.map((a) => (a.id === action.id ? { ...a, active: false } : a)),
        tourRoute: state.tourRoute.filter((id) => id !== action.id),
      }

    case "setTourRoute":
      return { ...state, tourRoute: action.areaIds }

    /* ---------------------------------------------------------------- users */
    case "addUser":
      return { ...state, users: [...(state.users ?? []), action.user] }

    case "updateUser":
      return {
        ...state,
        users: (state.users ?? []).map((u) => (u.id === action.id ? { ...u, ...action.patch } : u)),
      }

    case "archiveUser":
      return {
        ...state,
        users: (state.users ?? []).map((u) => (u.id === action.id ? { ...u, active: false } : u)),
      }

    case "sync": {
      const clear = <T extends { pending?: boolean }>(arr: T[]) =>
        arr.map((x) => (x.pending ? { ...x, pending: false } : x))
      return {
        ...state,
        tasks: clear(state.tasks),
        observations: clear(state.observations),
        blockers: clear(state.blockers),
        defects: clear(state.defects),
        decisions: clear(state.decisions),
        photos: clear(state.photos),
        pendingCount: 0,
        lastSyncAt: nowTime(),
        activity: log(state, "sync", "כל נתוני הסיור סונכרנו בהצלחה"),
      }
    }

    case "startTour": {
      // use the configured tour route (filtered to active areas) for today's tour
      const activeAreaIds = new Set(state.areas.filter((a) => a.active !== false).map((a) => a.id))
      const configuredRoute = (state.tourRoute ?? []).filter((id) => activeAreaIds.has(id))
      const tours = withTour(state, (t) => {
        const route = t.routeAreaIds.length > 0 ? t.routeAreaIds : configuredRoute
        return {
          ...t,
          status: "active",
          startedAt: t.startedAt ?? nowTime(),
          routeAreaIds: route,
          visits:
            Object.keys(t.visits).length > 0
              ? t.visits
              : Object.fromEntries(route.map((id) => [id, emptyVisit(id)])),
        }
      })
      return { ...state, tours, activity: log(state, "tour", "סיור בוקר התחיל") }
    }

    case "endTour": {
      const tours = withTour(state, (t) => ({
        ...t,
        status: "done",
        endedAt: nowTime(),
        topPriorities: action.priorities,
      }))
      return { ...state, tours, activity: log(state, "tour", "סיור בוקר הושלם") }
    }

    case "saveVisit": {
      const tours = withTour(state, (t) => ({
        ...t,
        visits: {
          ...t.visits,
          [action.areaId]: {
            ...(t.visits[action.areaId] ?? emptyVisit(action.areaId)),
            ...action.patch,
            visitedAt: nowTime(),
            skipped: false,
          },
        },
      }))
      return { ...state, tours, pendingCount: bump(state) }
    }

    case "skipVisit": {
      const tours = withTour(state, (t) => ({
        ...t,
        visits: {
          ...t.visits,
          [action.areaId]: {
            ...(t.visits[action.areaId] ?? emptyVisit(action.areaId)),
            skipped: true,
            visitedAt: nowTime(),
          },
        },
      }))
      return { ...state, tours }
    }

    case "addTask": {
      const normalizedAreaIds = taskAreaIds(action.task)
      const task = {
        ...action.task,
        areaIds: normalizedAreaIds,
        areaId: normalizedAreaIds[0] ?? null,
        ...pending(state),
      }
      const tours = withTour(state, (tour) => syncTourTaskLinks(tour, task.id, normalizedAreaIds))
      return {
        ...state,
        tasks: [task, ...state.tasks],
        tours,
        pendingCount: bump(state),
        activity: log(state, "task_created", `משימה חדשה: ${task.title}`, task.areaId ?? null, task.id),
      }
    }

    case "updateTask": {
      const prev = state.tasks.find((t) => t.id === action.id)
      if (!prev) return state
      const patch = { ...action.patch }
      const requestedAreaIds = patch.areaIds
        ? [...new Set(patch.areaIds.filter(Boolean))]
        : patch.areaId !== undefined
          ? patch.areaId
            ? [patch.areaId]
            : []
          : null

      if (requestedAreaIds) {
        patch.areaIds = requestedAreaIds
        patch.areaId = requestedAreaIds[0] ?? null
      }

      const history = [...prev.history]
      if (action.note) history.push({ date: today(), time: nowTime(), text: action.note })
      if (patch.status && patch.status !== prev.status) {
        const labels: Record<TaskStatus, string> = {
          new: "חדש",
          open: "פתוח",
          in_progress: "בטיפול",
          waiting: "ממתין לאחר",
          blocked: "חסום",
          done: "הושלם",
        }
        if (!action.note) history.push({ date: today(), time: nowTime(), text: `סטטוס עודכן ל"${labels[patch.status]}"` })
        if (patch.status === "done") patch.completedAt = today()
      }
      const next = {
        ...prev,
        ...patch,
        areaIds: patch.areaIds ?? prev.areaIds ?? taskAreaIds(prev),
        areaId: (patch.areaIds ?? prev.areaIds ?? taskAreaIds(prev))[0] ?? null,
        history,
        ...pending(state),
      }

      const nextAreaIds = taskAreaIds(next)
      const tours = withTour(state, (tour) => syncTourTaskLinks(tour, next.id, nextAreaIds))

      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.id ? next : t)),
        tours,
        pendingCount: bump(state),
        activity: log(
          state,
          "task_status",
          patch.status === "done" ? `הושלם: ${prev.title}` : `עודכן: ${prev.title}`,
          next.areaId,
          prev.id,
        ),
      }
    }

    case "deleteTask": {
      const task = state.tasks.find((t) => t.id === action.id)
      if (!task) return state

      const tasks = state.tasks.filter((t) => t.id !== action.id)
      const tours = state.tours.map((tour) => ({
        ...tour,
        visits: Object.fromEntries(
          Object.entries(tour.visits).map(([areaId, visit]) => [
            areaId,
            { ...visit, taskIds: (visit.taskIds ?? []).filter((id) => id !== action.id) },
          ]),
        ),
      }))
      const blockers = state.blockers.map((blocker) =>
        blocker.taskId === action.id ? { ...blocker, taskId: null, ...pending(state) } : blocker,
      )
      const decisions = state.decisions.map((decision) =>
        decision.taskIds.includes(action.id)
          ? { ...decision, taskIds: decision.taskIds.filter((id) => id !== action.id), ...pending(state) }
          : decision,
      )
      const photos = state.photos.map((photo) =>
        photo.taskId === action.id ? { ...photo, taskId: null, ...pending(state) } : photo,
      )
      const dayTargets = state.dayTargets.map((target) =>
        target.taskId === action.id ? { ...target, taskId: null } : target,
      )

      return {
        ...state,
        tasks,
        tours,
        blockers,
        decisions,
        photos,
        dayTargets,
        pendingCount: bump(state),
        activity: log(state, "task_status", `נמחקה משימה: ${task.title}`, task.areaId, task.id),
      }
    }

    case "addObservation": {
      const observation = { ...action.observation, ...pending(state) }
      const tours = withTour(state, (t) => {
        const v = t.visits[observation.areaId]
        if (!v) return t
        return {
          ...t,
          visits: {
            ...t.visits,
            [observation.areaId]: { ...v, observationIds: [...v.observationIds, observation.id] },
          },
        }
      })
      return {
        ...state,
        observations: [observation, ...state.observations],
        tours,
        pendingCount: bump(state),
        activity: log(state, "observation", observation.text, observation.areaId, observation.id),
      }
    }

    case "addBlocker": {
      const blocker = { ...action.blocker, ...pending(state) }
      const tours = withTour(state, (t) => {
        const v = t.visits[blocker.areaId]
        if (!v) return t
        return {
          ...t,
          visits: { ...t.visits, [blocker.areaId]: { ...v, blockerIds: [...v.blockerIds, blocker.id] } },
        }
      })
      return {
        ...state,
        blockers: [blocker, ...state.blockers],
        tours,
        pendingCount: bump(state),
        activity: log(state, "blocker", `חסם: ${blocker.text}`, blocker.areaId, blocker.id),
      }
    }

    case "addDefect": {
      const defect = { ...action.defect, ...pending(state) }
      const tours = withTour(state, (t) => {
        const v = t.visits[defect.areaId]
        if (!v) return t
        return {
          ...t,
          visits: { ...t.visits, [defect.areaId]: { ...v, defectIds: [...v.defectIds, defect.id] } },
        }
      })
      return {
        ...state,
        defects: [defect, ...state.defects],
        tours,
        pendingCount: bump(state),
        activity: log(state, "defect", `ליקוי: ${defect.title}`, defect.areaId, defect.id),
      }
    }

    case "addDecision": {
      const decision = { ...action.decision, ...pending(state) }
      const tours = decision.areaId
        ? withTour(state, (t) => {
            const v = t.visits[decision.areaId as string]
            if (!v) return t
            return {
              ...t,
              visits: {
                ...t.visits,
                [decision.areaId as string]: { ...v, decisionIds: [...v.decisionIds, decision.id] },
              },
            }
          })
        : state.tours
      return {
        ...state,
        decisions: [decision, ...state.decisions],
        tours,
        pendingCount: bump(state),
        activity: log(state, "decision", `סיכום: ${decision.commitment}`, decision.areaId, decision.id),
      }
    }

    case "addPhoto": {
      const photo = { ...action.photo, ...pending(state) }
      const tours = withTour(state, (t) => {
        const v = t.visits[photo.areaId]
        if (!v) return t
        return { ...t, visits: { ...t.visits, [photo.areaId]: { ...v, photoIds: [...v.photoIds, photo.id] } } }
      })
      return {
        ...state,
        photos: [photo, ...state.photos],
        tours,
        pendingCount: bump(state),
        activity: log(state, "photo", `תמונה נוספה: ${photo.caption}`, photo.areaId, photo.id),
      }
    }

    case "setTargets":
      return {
        ...state,
        dayTargets: action.targets.map((x, i) => ({
          id: `dt-${i}-${Date.now().toString(36)}`,
          text: x.text,
          taskId: x.taskId ?? null,
          done: false,
          date: today(),
        })),
      }

    case "toggleTarget":
      return {
        ...state,
        dayTargets: state.dayTargets.map((d) => (d.id === action.id ? { ...d, done: !d.done } : d)),
      }

    case "log":
      return { ...state, activity: log(state, action.kind, action.text, action.areaId, action.refId) }

    default:
      return state
  }
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null
}

function asStateEnvelope(raw: unknown): ProjectState | null {
  if (!isRecord(raw)) return null
  if ("state" in raw && isRecord(raw.state)) return raw.state as ProjectState
  return raw as ProjectState
}

function normalizeStateShape(loaded: ProjectState): ProjectState {
  const seed = createSeedState()
  const base = loaded as Partial<ProjectState>

  return {
    ...seed,
    ...base,
    project: {
      ...seed.project,
      ...(base.project ?? {}),
    },
    tourRoute: base.tourRoute ?? seed.tourRoute,
    areas: (base.areas ?? seed.areas).map((a) => ({ active: true, ...a })),
    people: (base.people ?? []).map((p) => ({ active: true, ...p })),
    users: (base.users ?? []).map((u) => ({ active: true, ...u })),
    tasks: (base.tasks ?? []).map((task) => {
      const areaIds = taskAreaIds(task)
      return {
        ...task,
        areaIds,
        areaId: areaIds[0] ?? null,
      }
    }),
    observations: base.observations ?? [],
    blockers: base.blockers ?? [],
    defects: base.defects ?? [],
    decisions: base.decisions ?? [],
    photos: base.photos ?? [],
    tours: base.tours ?? [],
    activity: base.activity ?? [],
    dayTargets: base.dayTargets ?? [],
    offline: base.offline ?? false,
    pendingCount: base.pendingCount ?? 0,
    lastSyncAt: base.lastSyncAt ?? null,
  }
}

function stripDemoData(state: ProjectState): ProjectState {
  const removedPersonIds = new Set(
    state.people.filter((p) => DEMO_PERSON_IDS.has(p.id)).map((p) => p.id),
  )
  const removedUserIds = new Set(
    state.users.filter((u) => DEMO_USER_IDS.has(u.id)).map((u) => u.id),
  )

  const people = state.people.filter((p) => !DEMO_PERSON_IDS.has(p.id))
  const users = state.users.filter((u) => !DEMO_USER_IDS.has(u.id))

  const tasks = state.tasks.filter((t) => !DEMO_TASK_IDS.has(t.id))
  const taskIds = new Set(tasks.map((t) => t.id))

  const blockers = state.blockers.filter(
    (b) => !DEMO_BLOCKER_IDS.has(b.id) && (!b.taskId || taskIds.has(b.taskId)),
  )
  const blockerIds = new Set(blockers.map((b) => b.id))

  const defects = state.defects.filter((d) => !DEMO_DEFECT_IDS.has(d.id))
  const defectIds = new Set(defects.map((d) => d.id))

  const decisions = state.decisions
    .filter((d) => !DEMO_DECISION_IDS.has(d.id))
    .map((d) => ({ ...d, taskIds: d.taskIds.filter((id) => taskIds.has(id)) }))

  const observations = state.observations.filter((o) => !DEMO_OBSERVATION_IDS.has(o.id))

  const photos = state.photos.filter(
    (p) =>
      !DEMO_PHOTO_IDS.has(p.id) &&
      (!p.taskId || taskIds.has(p.taskId)) &&
      (!p.defectId || defectIds.has(p.defectId)),
  )

  const tours = state.tours
    .filter((t) => !DEMO_TOUR_IDS.has(t.id))
    .map((tour) => ({
      ...tour,
      visits: Object.fromEntries(
        Object.entries(tour.visits ?? {}).map(([areaId, visit]) => [
          areaId,
          {
            ...visit,
            taskIds: (visit.taskIds ?? []).filter((id) => taskIds.has(id)),
            blockerIds: (visit.blockerIds ?? []).filter((id) => blockerIds.has(id)),
            defectIds: (visit.defectIds ?? []).filter((id) => defectIds.has(id)),
            decisionIds: (visit.decisionIds ?? []).filter((id) => decisions.some((d) => d.id === id)),
            photoIds: (visit.photoIds ?? []).filter((id) => photos.some((p) => p.id === id)),
            observationIds: (visit.observationIds ?? []).filter((id) => observations.some((o) => o.id === id)),
          },
        ]),
      ),
    }))

  const removedRefIds = new Set<string>([
    ...removedPersonIds,
    ...removedUserIds,
    ...Array.from(DEMO_ACTIVITY_IDS),
    ...Array.from(DEMO_TASK_IDS),
    ...Array.from(DEMO_BLOCKER_IDS),
    ...Array.from(DEMO_DEFECT_IDS),
    ...Array.from(DEMO_DECISION_IDS),
    ...Array.from(DEMO_OBSERVATION_IDS),
    ...Array.from(DEMO_PHOTO_IDS),
    ...Array.from(DEMO_TOUR_IDS),
    ...Array.from(DEMO_DAY_TARGET_IDS),
  ])

  const activity = state.activity.filter(
    (a) =>
      !DEMO_ACTIVITY_IDS.has(a.id) &&
      (!a.personId || !removedRefIds.has(a.personId)) &&
      (!a.refId || !removedRefIds.has(a.refId)),
  )

  const dayTargets = state.dayTargets.filter(
    (t) => !DEMO_DAY_TARGET_IDS.has(t.id) && (!t.taskId || taskIds.has(t.taskId)),
  )

  return {
    ...state,
    people,
    users,
    tasks,
    blockers,
    defects,
    decisions,
    observations,
    photos,
    tours,
    activity,
    dayTargets,
  }
}

function ensureTodayTour(state: ProjectState): ProjectState {
  const activeAreaIds = new Set(state.areas.filter((a) => a.active !== false).map((a) => a.id))
  const defaultRoute =
    (state.tourRoute ?? []).filter((id) => activeAreaIds.has(id)).length > 0
      ? (state.tourRoute ?? []).filter((id) => activeAreaIds.has(id))
      : state.areas
          .filter((a) => a.active !== false)
          .sort((a, b) => a.routeOrder - b.routeOrder)
          .map((a) => a.id)

  const normalizeTour = (tour: Tour): Tour => {
    const route = (tour.routeAreaIds ?? []).filter((id) => activeAreaIds.has(id))
    const routeAreaIds = route.length > 0 ? route : defaultRoute
    const visits = Object.fromEntries(
      routeAreaIds.map((id) => {
        const existing = tour.visits?.[id]
        return [id, existing ? { ...emptyVisit(id), ...existing, areaId: id } : emptyVisit(id)]
      }),
    )
    return {
      ...tour,
      routeAreaIds,
      visits,
    }
  }

  const tours = (state.tours ?? []).map(normalizeTour)
  if (tours.some((t) => t.date === today())) return { ...state, tours }

  const todayTour: Tour = {
    id: `t-${today()}`,
    date: today(),
    startedAt: null,
    endedAt: null,
    status: "planned",
    routeAreaIds: defaultRoute,
    visits: Object.fromEntries(defaultRoute.map((id) => [id, emptyVisit(id)])),
    topPriorities: [],
  }

  return { ...state, tours: [...tours, todayTour] }
}

/* ------------------------------------------------------------- context ---- */

interface StoreValue {
  state: ProjectState
  hydrated: boolean
  dispatch: React.Dispatch<Action>
  commitAction: (action: Action) => Promise<{ ok: boolean; error?: string }>
  syncNow: () => Promise<void>
  syncing: boolean
  syncError: string | null
  loadError: string | null
  supabaseReady: boolean
  bootstrapping: boolean
  usingCachedFallback: boolean
  retryLoad: () => void
  /** helpers used across screens */
  uid: (prefix: string) => string
}

const StoreContext = React.createContext<StoreValue | null>(null)

function isDevelopment() {
  return process.env.NODE_ENV !== "production"
}

function humanizePersistenceError(message: string) {
  if (/invalid api key|unauthorized/i.test(message)) {
    return "החיבור ל-Supabase נכשל: מפתח הגישה אינו תקין"
  }
  if (/row level security|permission denied/i.test(message)) {
    return "השמירה ל-Supabase נחסמה בהרשאות הגישה"
  }
  return `השמירה ל-Supabase נכשלה: ${message}`
}

function humanizeLoadError(message: string) {
  if (/invalid api key|unauthorized/i.test(message)) {
    return "לא ניתן לטעון נתונים מ-Supabase כי מפתח הגישה אינו תקין"
  }
  if (/row level security|permission denied/i.test(message)) {
    return "לא ניתן לטעון נתונים מ-Supabase בגלל הרשאות גישה"
  }
  return `לא ניתן לטעון את הנתונים: ${message}`
}

function normalizeLoadedState(state: ProjectState) {
  return ensureTodayTour(normalizeStateShape(state))
}

function readCachedState() {
  if (typeof window === "undefined") return createSeedState()

  const sources = [CACHE_STORAGE_KEY, LEGACY_STORAGE_KEY]
  for (const key of sources) {
    try {
      const raw = window.localStorage.getItem(key)
      if (!raw) continue
      const parsed = JSON.parse(raw) as unknown
      const envelope = asStateEnvelope(parsed)
      if (envelope) {
        return key === LEGACY_STORAGE_KEY
          ? ensureTodayTour(stripDemoData(normalizeStateShape(envelope)))
          : normalizeLoadedState(envelope)
      }
    } catch {
      // Ignore corrupt cache and continue to the next source.
    }
  }

  return normalizeLoadedState(createSeedState())
}

function writeCachedState(state: ProjectState) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(
      CACHE_STORAGE_KEY,
      JSON.stringify({ version: CACHE_STORAGE_VERSION, savedAt: new Date().toISOString(), state }),
    )
  } catch {
    // Ignore storage failures: app continues in memory.
  }
}

function toQueuedAction(action: Action): Record<string, unknown> {
  return JSON.parse(JSON.stringify(action)) as Record<string, unknown>
}

function asQueuedAction(raw: unknown): Action | null {
  if (!isRecord(raw)) return null
  if (typeof raw.type !== "string") return null
  return raw as unknown as Action
}

function replayPendingMutations(baseState: ProjectState, queued = readQueue()) {
  return queued.reduce((current, item) => {
    const action = asQueuedAction(item.action)
    if (!action || !isPersistentAction(action)) return current
    return reducer({ ...current, offline: false }, action)
  }, baseState)
}

async function persistQueuedSideEffects(state: ProjectState, queued = readQueue()) {
  for (const item of queued) {
    const action = asQueuedAction(item.action)
    if (!action) continue
    if (action.type === "deleteTask") {
      await deleteTaskFromSupabase(state.project, action.id)
    }
  }
}

function withSyncedRuntimeState(state: ProjectState) {
  return {
    ...state,
    offline: false,
    pendingCount: 0,
    lastSyncAt: nowTime(),
  }
}

function comparableState(state: ProjectState) {
  return {
    ...state,
    offline: false,
    pendingCount: 0,
    lastSyncAt: null,
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, baseDispatch] = React.useReducer(reducer, null, createSeedState)
  const [hydrated, setHydrated] = React.useState(false)
  const [syncing, setSyncing] = React.useState(false)
  const [syncError, setSyncError] = React.useState<string | null>(null)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [bootstrapping, setBootstrapping] = React.useState(true)
  const [usingCachedFallback, setUsingCachedFallback] = React.useState(false)
  const [syncTick, setSyncTick] = React.useState(0)
  const [bootstrapVersion, setBootstrapVersion] = React.useState(0)
  const supabaseReady = isSupabaseConfigured()

  const stateRef = React.useRef(state)
  const hydratedRef = React.useRef(hydrated)
  const syncingRef = React.useRef(syncing)

  React.useEffect(() => {
    stateRef.current = state
  }, [state])

  React.useEffect(() => {
    hydratedRef.current = hydrated
  }, [hydrated])

  React.useEffect(() => {
    syncingRef.current = syncing
  }, [syncing])

  const refreshAuthoritativeState = React.useCallback(async () => {
    const remote = await loadProjectStateFromSupabase()
    if (!remote) return null
    return normalizeLoadedState(remote)
  }, [])

  const syncNow = React.useCallback(async () => {
    if (!supabaseReady) return
    if (typeof navigator !== "undefined" && !navigator.onLine) return
    if (stateRef.current.offline) return
    if (syncingRef.current) return

    const queued = queueSize()
    if (queued === 0 && stateRef.current.pendingCount === 0) return

    setSyncing(true)
    setSyncError(null)

    try {
      await saveProjectStateToSupabase(stateRef.current)
      await persistQueuedSideEffects(stateRef.current)
      const remote = await refreshAuthoritativeState()
      clearQueue()
      if (remote) {
        baseDispatch({ type: "hydrate", state: withSyncedRuntimeState(remote) })
      } else {
        baseDispatch({ type: "sync" })
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "שגיאה לא צפויה בסנכרון"
      if (isDevelopment()) {
        console.error("[Supabase syncNow] save failed", error)
      }
      setSyncError(msg)
    } finally {
      setSyncing(false)
    }
  }, [supabaseReady])

  const commitAction = React.useCallback(
    async (action: Action) => {
      if (!isPersistentAction(action)) {
        baseDispatch(action)
        return { ok: true }
      }

      const online = typeof navigator === "undefined" || navigator.onLine
      if (!supabaseReady || stateRef.current.offline || !online) {
        baseDispatch(action)
        if (hydratedRef.current) {
          enqueueOperation(action.type, toQueuedAction(action))
          setSyncTick((x) => x + 1)
        }
        return { ok: true }
      }

      const nextState = reducer(stateRef.current, action)
      setSyncing(true)
      setSyncError(null)

      try {
        await saveProjectStateToSupabase(nextState)
        await persistQueuedSideEffects(nextState, [
          { id: "commit", type: action.type, at: new Date().toISOString(), action: toQueuedAction(action) },
        ])
        const remote = await refreshAuthoritativeState()
        clearQueue()
        baseDispatch({
          type: "hydrate",
          state: withSyncedRuntimeState(remote ?? nextState),
        })
        return { ok: true }
      } catch (error) {
        const msg = error instanceof Error ? error.message : "שגיאה לא צפויה בשמירה"
        if (isDevelopment()) {
          console.error("[Supabase commitAction] save failed", { action, error })
        }
        setSyncError(msg)
        return { ok: false, error: msg }
      } finally {
        setSyncing(false)
      }
    },
    [supabaseReady],
  )

  const dispatch = React.useCallback(
    (action: Action) => {
      baseDispatch(action)
      if (!hydratedRef.current) return
      if (!isPersistentAction(action)) return
      enqueueOperation(action.type, toQueuedAction(action))
      setSyncTick((x) => x + 1)
    },
    [],
  )

  const retryLoad = React.useCallback(() => {
    setLoadError(null)
    setBootstrapping(true)
    setBootstrapVersion((v) => v + 1)
  }, [])

  React.useEffect(() => {
    let mounted = true

    const bootstrap = async () => {
      const cachedState = readCachedState()
      const hasCachedData = hasMeaningfulLocalData(cachedState)
      const queuedOps = readQueue()

      setLoadError(null)
      setUsingCachedFallback(false)

      if (!mounted) return
      baseDispatch({ type: "hydrate", state: cachedState })
      setHydrated(true)

      if (!supabaseReady || (typeof navigator !== "undefined" && !navigator.onLine)) {
        setUsingCachedFallback(hasCachedData)
        setBootstrapping(false)
        return
      }

      try {
        const remoteState = await refreshAuthoritativeState()
        if (!mounted) return

        if (remoteState) {
          let authoritativeState = remoteState
          if (queuedOps.length > 0) {
            const mergedState = replayPendingMutations(remoteState, queuedOps)
            await saveProjectStateToSupabase(mergedState)
            await persistQueuedSideEffects(mergedState, queuedOps)
            clearQueue()
            authoritativeState = (await refreshAuthoritativeState()) ?? mergedState
          }

          baseDispatch({ type: "hydrate", state: withSyncedRuntimeState(authoritativeState) })
        } else if (hasCachedData) {
          const mergedState = replayPendingMutations(cachedState, queuedOps)
          await saveProjectStateToSupabase(mergedState)
          await persistQueuedSideEffects(mergedState, queuedOps)
          clearQueue()
          const authoritativeState = (await refreshAuthoritativeState()) ?? mergedState
          baseDispatch({ type: "hydrate", state: withSyncedRuntimeState(authoritativeState) })
        }
      } catch (error) {
        if (!mounted) return
        const msg = error instanceof Error ? error.message : "שגיאה בטעינת נתונים"
        if (isDevelopment()) {
          console.error("[Supabase bootstrap] load failed", error)
        }
        setLoadError(msg)
        setUsingCachedFallback(hasCachedData)
      } finally {
        if (mounted) setBootstrapping(false)
      }
    }

    void bootstrap()

    return () => {
      mounted = false
    }
  }, [supabaseReady, refreshAuthoritativeState, bootstrapVersion])

  React.useEffect(() => {
    if (typeof window === "undefined") return

    const onOnline = () => {
      if (stateRef.current.offline) {
        baseDispatch({ type: "toggleOffline", value: false })
      }
      setSyncTick((x) => x + 1)
    }

    const onOffline = () => {
      if (!stateRef.current.offline) {
        baseDispatch({ type: "toggleOffline", value: true })
      }
    }

    window.addEventListener("online", onOnline)
    window.addEventListener("offline", onOffline)

    return () => {
      window.removeEventListener("online", onOnline)
      window.removeEventListener("offline", onOffline)
    }
  }, [])

  React.useEffect(() => {
    if (!hydrated) return
    if (!supabaseReady) return
    if (state.offline) return
    if (typeof navigator !== "undefined" && !navigator.onLine) return
    if (queueSize() === 0) return

    const timer = window.setTimeout(() => {
      void syncNow()
    }, 300)

    return () => window.clearTimeout(timer)
  }, [hydrated, state.offline, supabaseReady, syncNow, syncTick])

  React.useEffect(() => {
    if (!hydrated) return
    if (!supabaseReady) return
    if (state.offline) return

    const timer = window.setInterval(() => {
      if (queueSize() > 0 || syncingRef.current) return
      if (typeof navigator !== "undefined" && !navigator.onLine) return

      void (async () => {
        try {
          const remote = await refreshAuthoritativeState()
          if (!remote) return
          setLoadError(null)
          const localState = stateRef.current
          if (JSON.stringify(comparableState(localState)) !== JSON.stringify(comparableState(remote))) {
            baseDispatch({ type: "hydrate", state: { ...remote, pendingCount: localState.pendingCount, lastSyncAt: localState.lastSyncAt } })
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : "שגיאה ברענון הנתונים"
          if (isDevelopment()) {
            console.error("[Supabase refresh] load failed", error)
          }
          setLoadError(msg)
        }
      })()
    }, 25000)

    return () => window.clearInterval(timer)
  }, [hydrated, supabaseReady, state.offline])

  React.useEffect(() => {
    writeCachedState(state)
  }, [state, hydrated])

  React.useEffect(() => {
    if (!hydrated || !syncError) return
    toast.error("שמירה או טעינה מול Supabase נכשלה", {
      description: humanizePersistenceError(syncError),
    })
  }, [hydrated, syncError])

  React.useEffect(() => {
    if (!hydrated || !loadError) return
    toast.error("טעינת הנתונים נכשלה", {
      description: humanizeLoadError(loadError),
    })
  }, [hydrated, loadError])

  const value = React.useMemo(
    () => ({
      state,
      hydrated,
      dispatch,
      commitAction,
      syncNow,
      syncing,
      syncError,
      loadError,
      supabaseReady,
      bootstrapping,
      usingCachedFallback,
      retryLoad,
      uid,
    }),
    [
      state,
      hydrated,
      dispatch,
      commitAction,
      syncNow,
      syncing,
      syncError,
      loadError,
      supabaseReady,
      bootstrapping,
      usingCachedFallback,
      retryLoad,
    ],
  )
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = React.useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used inside StoreProvider")
  return ctx
}

export { dayOffset }
