import { dayOffset, today } from "./dates"
import type {
  AreaVisit,
  ProjectState,
  Tour,
} from "./types"

/* -------------------------------------------------------------- tours ---- */

function emptyVisit(areaId: string): AreaVisit {
  return {
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
  }
}

function createTodayTour(areaIds: string[]): Tour {
  return {
    id: `t-${today()}`,
    date: today(),
    startedAt: null,
    endedAt: null,
    status: "planned",
    routeAreaIds: areaIds,
    visits: Object.fromEntries(areaIds.map((id) => [id, emptyVisit(id)])),
    topPriorities: [],
  }
}

/* -------------------------------------------------------- initial state -- */

export function createSeedState(): ProjectState {
  const areas: ProjectState["areas"] = []
  const tourRoute: string[] = []

  return {
    project: {
      id: "proj-1",
      name: "פרויקט הרקפות",
      description: "פרויקט בנייה למגורים – 45 יחידות דיור בשבע קומות",
      address: "רחוב הרקפות 12, תל אביב",
      companyName: "חברת בניה לדוגמה בע\"מ",
      apartments: 45,
      basements: 3,
      floors: 7,
      startedAt: dayOffset(-420),
      expectedCompletionDate: dayOffset(180),
      status: "active",
    },
    areas,
    tourRoute,
    people: [],
    users: [],
    tasks: [],
    observations: [],
    blockers: [],
    defects: [],
    decisions: [],
    photos: [],
    tours: [createTodayTour(tourRoute)],
    activity: [],
    dayTargets: [],
    offline: false,
    pendingCount: 0,
    lastSyncAt: null,
  }
}

export { emptyVisit }
