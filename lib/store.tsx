"use client"

import * as React from "react"
import { createSeedState, emptyVisit } from "./seed"
import { dayOffset, nowTime, today } from "./dates"
import type {
  ActivityKind,
  ActivityLog,
  AreaVisit,
  Blocker,
  Decision,
  Defect,
  Observation,
  Photo,
  ProjectState,
  Task,
  TaskStatus,
  Tour,
} from "./types"

const STORAGE_KEY = "rakafot.pm.v1"

/* ------------------------------------------------------------- reducer ---- */

type Action =
  | { type: "hydrate"; state: ProjectState }
  | { type: "reset" }
  | { type: "toggleOffline"; value?: boolean }
  | { type: "sync" }
  | { type: "startTour" }
  | { type: "endTour"; priorities: string[] }
  | { type: "saveVisit"; areaId: string; patch: Partial<AreaVisit> }
  | { type: "skipVisit"; areaId: string }
  | { type: "addTask"; task: Task }
  | { type: "updateTask"; id: string; patch: Partial<Task>; note?: string }
  | { type: "addObservation"; observation: Observation }
  | { type: "addBlocker"; blocker: Blocker }
  | { type: "addDefect"; defect: Defect }
  | { type: "addDecision"; decision: Decision }
  | { type: "addPhoto"; photo: Photo }
  | { type: "setTargets"; targets: { text: string; taskId?: string | null }[] }
  | { type: "toggleTarget"; id: string }
  | { type: "log"; kind: ActivityKind; text: string; areaId?: string | null; refId?: string | null }

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`
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

function reducer(state: ProjectState, action: Action): ProjectState {
  switch (action.type) {
    case "hydrate":
      return action.state

    case "reset":
      return createSeedState()

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
      const tours = withTour(state, (t) => ({
        ...t,
        status: "active",
        startedAt: t.startedAt ?? nowTime(),
        visits:
          Object.keys(t.visits).length > 0
            ? t.visits
            : Object.fromEntries(t.routeAreaIds.map((id) => [id, emptyVisit(id)])),
      }))
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
      const task = { ...action.task, ...pending(state) }
      const tours = task.areaId
        ? withTour(state, (t) => {
            const v = t.visits[task.areaId as string]
            if (!v) return t
            return {
              ...t,
              visits: { ...t.visits, [task.areaId as string]: { ...v, taskIds: [...v.taskIds, task.id] } },
            }
          })
        : state.tours
      return {
        ...state,
        tasks: [task, ...state.tasks],
        tours,
        pendingCount: bump(state),
        activity: log(state, "task_created", `משימה חדשה: ${task.title}`, task.areaId, task.id),
      }
    }

    case "updateTask": {
      const prev = state.tasks.find((t) => t.id === action.id)
      if (!prev) return state
      const patch = { ...action.patch }
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
      const next = { ...prev, ...patch, history, ...pending(state) }
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.id ? next : t)),
        pendingCount: bump(state),
        activity: log(
          state,
          "task_status",
          patch.status === "done" ? `הושלם: ${prev.title}` : `עודכן: ${prev.title}`,
          prev.areaId,
          prev.id,
        ),
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

/* ------------------------------------------------------------- context ---- */

interface StoreValue {
  state: ProjectState
  hydrated: boolean
  dispatch: React.Dispatch<Action>
  /** helpers used across screens */
  uid: (prefix: string) => string
}

const StoreContext = React.createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, null, createSeedState)
  const [hydrated, setHydrated] = React.useState(false)

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as { savedFor: string; state: ProjectState }
        // a stale demo day would show yesterday's tour as today's – reseed instead
        if (parsed.savedFor === today()) dispatch({ type: "hydrate", state: parsed.state })
      }
    } catch {
      /* ignore corrupt demo data */
    }
    setHydrated(true)
  }, [])

  React.useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ savedFor: today(), state }))
    } catch {
      /* storage full – demo continues in memory */
    }
  }, [state, hydrated])

  const value = React.useMemo(() => ({ state, hydrated, dispatch, uid }), [state, hydrated])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = React.useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used inside StoreProvider")
  return ctx
}

export function clearDemoData() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* noop */
  }
}

export { dayOffset }
