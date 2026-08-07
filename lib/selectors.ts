import { daysOpen, diffDays, isOverdue, today } from "./dates"
import type {
  Area,
  AreaHealth,
  ProjectState,
  Task,
  Tour,
} from "./types"

export const OPEN_STATUSES: Task["status"][] = ["new", "open", "in_progress", "waiting", "blocked"]

export function isOpen(task: Task) {
  return task.status !== "done"
}

export function openTasks(s: ProjectState) {
  return s.tasks.filter(isOpen)
}

export function overdueTasks(s: ProjectState) {
  return openTasks(s).filter((t) => isOverdue(t.dueDate))
}

export function criticalTasks(s: ProjectState) {
  return openTasks(s).filter((t) => t.priority === "critical")
}

export function waitingTasks(s: ProjectState) {
  return openTasks(s).filter((t) => t.status === "waiting" || t.status === "blocked")
}

export function openBlockers(s: ProjectState) {
  return s.blockers.filter((b) => b.status === "open")
}

export function openDefects(s: ProjectState) {
  return s.defects.filter((d) => d.status !== "fixed")
}

export function currentTour(s: ProjectState): Tour | undefined {
  return s.tours.find((t) => t.date === today())
}

export function personById(s: ProjectState, id: string) {
  return s.people.find((p) => p.id === id)
}

export function personName(s: ProjectState, id: string) {
  const p = personById(s, id)
  if (!p) return "לא הוקצה"
  return p.id === "me" ? "אני" : p.name
}

export function areaById(s: ProjectState, id: string | null | undefined) {
  if (!id) return undefined
  return s.areas.find((a) => a.id === id)
}

export function areaName(s: ProjectState, id: string | null | undefined) {
  return areaById(s, id)?.name ?? "ללא אזור"
}

export function tasksInArea(s: ProjectState, areaId: string) {
  return s.tasks.filter((t) => t.areaId === areaId)
}

export function openTasksInArea(s: ProjectState, areaId: string) {
  return tasksInArea(s, areaId).filter(isOpen)
}

/** contractors/teams recorded as working today, by area */
export function activityToday(s: ProjectState) {
  const tour = currentTour(s)
  if (!tour) return []
  return Object.values(tour.visits)
    .filter((v) => v.activeToday === true && v.teamIds.length > 0)
    .map((v) => ({
      areaId: v.areaId,
      areaName: areaName(s, v.areaId),
      teams: v.teamIds.map((id) => personName(s, id)),
      workers: v.workersCount,
    }))
}

export function activeContractorsToday(s: ProjectState): string[] {
  const tour = currentTour(s)
  const ids = new Set<string>()
  if (tour) {
    Object.values(tour.visits).forEach((v) => {
      if (v.activeToday) v.teamIds.forEach((id) => ids.add(id))
    })
  }
  // before the tour starts, fall back to yesterday's picture so the
  // dashboard is never empty in the demo
  if (ids.size === 0) {
    s.tasks
      .filter((t) => isOpen(t) && t.assigneeGroup === "contractor" && t.status === "in_progress")
      .forEach((t) => ids.add(t.assigneeId))
  }
  return [...ids]
}

export function idleAreas(s: ProjectState): Area[] {
  const tour = currentTour(s)
  if (tour && tour.status !== "planned") {
    const idle = s.areas.filter((a) => tour.visits[a.id]?.activeToday === false)
    if (idle.length) return idle
  }
  // demo fallback: areas with no open in-progress work at all
  return s.areas.filter(
    (a) => !s.tasks.some((t) => t.areaId === a.id && t.status === "in_progress"),
  ).slice(0, 4)
}

/* ------------------------------------------------------------- health ----- */

export function areaHealth(s: ProjectState, areaId: string): AreaHealth {
  const tour = currentTour(s)
  const visit = tour?.visits[areaId]
  const tasks = openTasksInArea(s, areaId)
  const blockers = openBlockers(s).filter((b) => b.areaId === areaId)
  const defects = openDefects(s).filter((d) => d.areaId === areaId)

  if (blockers.length > 0 || tasks.some((t) => t.status === "blocked" || t.priority === "critical")) {
    return "crit"
  }
  if (tasks.some((t) => isOverdue(t.dueDate)) || defects.length > 0) return "warn"
  if (visit?.activeToday === false) return "idle"
  if (tasks.length === 0 && defects.length === 0) {
    return visit?.activeToday ? "ok" : "idle"
  }
  return "ok"
}

export function areaStats(s: ProjectState, areaId: string) {
  const tour = currentTour(s)
  const visit = tour?.visits[areaId]
  return {
    health: areaHealth(s, areaId),
    openTasks: openTasksInArea(s, areaId),
    blockers: openBlockers(s).filter((b) => b.areaId === areaId),
    defects: openDefects(s).filter((d) => d.areaId === areaId),
    photos: s.photos.filter((p) => p.areaId === areaId),
    observations: s.observations.filter((o) => o.areaId === areaId),
    decisions: s.decisions.filter((d) => d.areaId === areaId),
    visit,
    teams: (visit?.teamIds ?? []).map((id) => personName(s, id)),
  }
}

/* ---------------------------------------------------------- contractors --- */

export function contractorSummary(s: ProjectState, personId: string) {
  const tasks = s.tasks.filter((t) => t.assigneeId === personId)
  const open = tasks.filter(isOpen)
  const overdue = open.filter((t) => isOverdue(t.dueDate))
  const commitments = s.decisions.filter(
    (d) => d.contractorId === personId && d.dueDate && diffDays(d.dueDate, today()) >= -7,
  )
  const areas = [...new Set(open.map((t) => t.areaId).filter(Boolean))] as string[]
  const lastDecision = s.decisions
    .filter((d) => d.contractorId === personId)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0]
  return {
    open,
    overdue,
    commitments,
    areas,
    lastInteraction: lastDecision ? `${lastDecision.date} – ${lastDecision.commitment}` : null,
    doneCount: tasks.filter((t) => t.status === "done").length,
    total: tasks.length,
  }
}

/* -------------------------------------------------------------- insights -- */

export interface Insight {
  id: string
  severity: "crit" | "warn" | "info"
  text: string
  /** deep link target */
  href?: string
}

/** deterministic, rule-based "AI" insights */
export function insights(s: ProjectState): Insight[] {
  const out: Insight[] = []

  // recurring blockers
  openBlockers(s)
    .filter((b) => (b.streak ?? 1) >= 2)
    .sort((a, b) => (b.streak ?? 0) - (a.streak ?? 0))
    .slice(0, 3)
    .forEach((b) =>
      out.push({
        id: `ins-bl-${b.id}`,
        severity: (b.streak ?? 0) >= 3 ? "crit" : "warn",
        text: `${areaName(s, b.areaId)} – ${b.text} מופיע ${b.streak} סיורים ברציפות.`,
        href: "/status",
      }),
    )

  // contractor load
  s.people
    .filter((p) => p.group === "contractor")
    .map((p) => ({ p, sum: contractorSummary(s, p.id) }))
    .filter(({ sum }) => sum.open.length >= 3)
    .sort((a, b) => b.sum.overdue.length - a.sum.overdue.length)
    .slice(0, 2)
    .forEach(({ p, sum }) =>
      out.push({
        id: `ins-c-${p.id}`,
        severity: sum.overdue.length >= 2 ? "warn" : "info",
        text: `${p.name} מחזיק ${sum.open.length} משימות פתוחות, מתוכן ${sum.overdue.length} באיחור.`,
        href: `/tasks?person=${p.id}`,
      }),
    )

  // material shortages mentioned repeatedly this week
  const materialMentions = s.blockers.filter(
    (b) => b.reason === "material" && diffDays(today(), b.date) <= 7,
  )
  if (materialMentions.length >= 2) {
    out.push({
      id: "ins-material",
      severity: "warn",
      text: `חוסרי חומר הוזכרו ${materialMentions.length} פעמים השבוע – בעיקר משקופים ואריחים.`,
      href: "/tasks?tab=critical",
    })
  }

  // idle areas
  const idle = idleAreas(s)
  if (idle.length >= 2) {
    out.push({
      id: "ins-idle",
      severity: "info",
      text: `${idle.length} אזורים ללא פעילות מדווחת: ${idle.slice(0, 3).map((a) => a.name).join(", ")}.`,
      href: "/status?filter=idle",
    })
  }

  // risk chain
  const alum = s.tasks.find((t) => t.id === "tk-3")
  if (alum && isOpen(alum)) {
    out.push({
      id: "ins-alum",
      severity: "crit",
      text: "אם האלומיניום לא ייכנס עד יום שני, עבודות הגמר בחזית המערבית עלולות להיפגע.",
      href: "/tasks?tab=critical",
    })
  }

  // aging tasks
  const old = openTasks(s).filter((t) => daysOpen(t.createdAt) >= 6)
  if (old.length) {
    out.push({
      id: "ins-old",
      severity: "warn",
      text: `${old.length} משימות פתוחות מעל 6 ימים – הזמן הפתוח הארוך ביותר: ${Math.max(
        ...old.map((t) => daysOpen(t.createdAt)),
      )} ימים.`,
      href: "/tasks?tab=overdue",
    })
  }

  return out
}

/** short list of "what should I do now" recommendations */
export function recommendations(s: ProjectState) {
  const recs: { id: string; text: string; detail: string; href: string }[] = []
  const crit = criticalTasks(s).slice(0, 2)
  crit.forEach((t) =>
    recs.push({
      id: `rec-${t.id}`,
      text: t.title,
      detail: `${areaName(s, t.areaId)} • ${t.priority === "critical" ? "קריטי" : "גבוה"}`,
      href: `/tasks?task=${t.id}`,
    }),
  )
  const od = overdueTasks(s)
    .filter((t) => t.assigneeGroup === "contractor")
    .slice(0, 2)
  od.forEach((t) =>
    recs.push({
      id: `rec-od-${t.id}`,
      text: `להתקשר ל${personName(s, t.assigneeId)} בנוגע ל"${t.title}"`,
      detail: `באיחור ${Math.abs(diffDays(t.dueDate!, today()))} ימים • ${areaName(s, t.areaId)}`,
      href: `/tasks?task=${t.id}`,
    }),
  )
  const waiting = waitingTasks(s).slice(0, 1)
  waiting.forEach((t) =>
    recs.push({
      id: `rec-w-${t.id}`,
      text: `לדחוף תשובה: ${t.title}`,
      detail: `ממתין ${daysOpen(t.createdAt)} ימים`,
      href: `/tasks?task=${t.id}`,
    }),
  )
  return recs.slice(0, 5)
}

/** suggested priorities at the end of a tour */
export function suggestedPriorities(s: ProjectState) {
  const items: { id: string; text: string; reason: string; taskId?: string }[] = []

  openBlockers(s)
    .sort((a, b) => (b.streak ?? 0) - (a.streak ?? 0))
    .slice(0, 3)
    .forEach((b) =>
      items.push({
        id: `sp-${b.id}`,
        text: b.text,
        reason: `${areaName(s, b.areaId)} • חסם פתוח ${daysOpen(b.date)} ימים`,
        taskId: b.taskId ?? undefined,
      }),
    )

  criticalTasks(s)
    .slice(0, 3)
    .forEach((t) =>
      items.push({
        id: `sp-${t.id}`,
        text: t.title,
        reason: `${areaName(s, t.areaId)} • קריטי • פתוח ${daysOpen(t.createdAt)} ימים`,
        taskId: t.id,
      }),
    )

  overdueTasks(s)
    .slice(0, 3)
    .forEach((t) =>
      items.push({
        id: `sp-od-${t.id}`,
        text: t.title,
        reason: `${areaName(s, t.areaId)} • באיחור`,
        taskId: t.id,
      }),
    )

  // de-dup by task
  const seen = new Set<string>()
  return items.filter((i) => {
    const key = i.taskId ?? i.text
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 6)
}

/* ------------------------------------------------------------ tour stats -- */

export function tourStats(s: ProjectState, tour: Tour | undefined) {
  if (!tour) {
    return {
      scanned: 0,
      total: 0,
      teams: 0,
      observations: 0,
      tasks: 0,
      blockers: 0,
      defects: 0,
      photos: 0,
      decisions: 0,
    }
  }
  const visits = Object.values(tour.visits)
  const teams = new Set<string>()
  visits.forEach((v) => v.teamIds.forEach((t) => teams.add(t)))
  const count = (key: keyof typeof visits[number]) =>
    visits.reduce((acc, v) => acc + ((v[key] as string[])?.length ?? 0), 0)
  return {
    scanned: visits.filter((v) => v.visitedAt && !v.skipped).length,
    total: tour.routeAreaIds.length,
    teams: teams.size,
    observations: count("observationIds"),
    tasks: count("taskIds"),
    blockers: count("blockerIds"),
    defects: count("defectIds"),
    photos: count("photoIds"),
    decisions: count("decisionIds"),
  }
}

/** open tasks located in areas the manager will walk through today */
export function carriedOverTasks(s: ProjectState) {
  const tour = currentTour(s)
  if (!tour) return []
  const route = new Set(tour.routeAreaIds)
  return openTasks(s).filter((t) => t.areaId && route.has(t.areaId) && diffDays(today(), t.createdAt) >= 1)
}
