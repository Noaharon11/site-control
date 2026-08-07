import { dayOffset, today } from "./dates"
import type {
  Area,
  AreaVisit,
  ProjectState,
  Tour,
} from "./types"

/* -------------------------------------------------------------- areas ---- */

function buildAreas(): Area[] {
  const areas: Area[] = []
  let order = 1

  for (const n of [3, 2, 1]) {
    areas.push({
      id: `b${n}`,
      name: `מרתף ${n}`,
      zone: "basement",
      level: -n,
      wing: null,
      routeOrder: order++,
      active: true,
    })
  }

  areas.push(
    { id: "g-e", name: "קומת קרקע - מזרח", zone: "ground", level: 0, wing: "east", routeOrder: order++, active: true },
    { id: "g-w", name: "קומת קרקע - מערב", zone: "ground", level: 0, wing: "west", routeOrder: order++, active: true },
  )

  for (let f = 1; f <= 7; f++) {
    areas.push({
      id: `f${f}-e`,
      name: `קומה ${f} - מזרח`,
      zone: "floor",
      level: f,
      wing: "east",
      routeOrder: order++,
      active: true,
    })
  }

  areas.push({ id: "roof", name: "גג", zone: "roof", level: 8, wing: null, routeOrder: order++, active: true })

  for (let f = 7; f >= 1; f--) {
    areas.push({
      id: `f${f}-w`,
      name: `קומה ${f} - מערב`,
      zone: "floor",
      level: f,
      wing: "west",
      routeOrder: order++,
      active: true,
    })
  }

  areas.push(
    { id: "facade", name: "חזיתות", zone: "facade", level: 9, wing: null, routeOrder: order++, active: true },
    { id: "ext", name: "פיתוח חוץ", zone: "external", level: 9, wing: null, routeOrder: order++, active: true },
  )

  return areas
}

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
  const areas = buildAreas()
  const tourRoute = areas.map((a) => a.id)

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
