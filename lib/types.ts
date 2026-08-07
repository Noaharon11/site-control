/**
 * Domain model for the project-manager OS.
 * Records are linked by id only, so this layer can move to a real database
 * without touching the UI.
 */

export type ISODate = string // YYYY-MM-DD

export type AreaZone = "basement" | "ground" | "floor" | "roof" | "facade" | "external"
export type Wing = "east" | "west" | null

export interface Area {
  id: string
  name: string
  zone: AreaZone
  /** floor index: -3..7, roof = 8, facade/external = 9 */
  level: number
  wing: Wing
  /** order along the manager's standard walking route */
  routeOrder: number
  /** parent area id for hierarchical display */
  parentId?: string | null
  /** false = archived/inactive */
  active: boolean
}

export type PersonGroup = "me" | "team" | "contractor"

export interface Person {
  id: string
  name: string
  group: PersonGroup
  role: string
  trade?: string
  phone?: string
  email?: string
  notes?: string
  /** false = archived/inactive */
  active: boolean
}

export type UserRole = "מנהל פרויקט" | "מנהל עבודה" | "מהנדס ביצוע" | "עובד" | "צפייה בלבד"

export interface User {
  id: string
  name: string
  email?: string
  phone?: string
  role: UserRole
  /** false = deactivated */
  active: boolean
}

export type TaskStatus = "new" | "open" | "in_progress" | "waiting" | "blocked" | "done"
export type Priority = "critical" | "high" | "normal" | "low"

export interface TaskEvent {
  date: ISODate
  time?: string
  text: string
}

export interface Task {
  id: string
  title: string
  description?: string
  areaId: string | null
  assigneeId: string
  assigneeGroup: PersonGroup
  priority: Priority
  status: TaskStatus
  dueDate: ISODate | null
  createdAt: ISODate
  /** where this came from, e.g. "סיור בוקר" / "סיכום עם קבלן" / "ידני" */
  source: string
  tourId?: string | null
  observationId?: string | null
  decisionId?: string | null
  blockerId?: string | null
  defectId?: string | null
  photoIds?: string[]
  history: TaskEvent[]
  completedAt?: ISODate | null
  /** true when created/edited while offline and not yet synced */
  pending?: boolean
}

export type ObservationKind = "activity" | "progress" | "note" | "voice"

export interface Observation {
  id: string
  tourId: string | null
  areaId: string
  date: ISODate
  time: string
  kind: ObservationKind
  text: string
  pending?: boolean
}

export type BlockerReason =
  | "material"
  | "manpower"
  | "decision"
  | "other_contractor"
  | "design"
  | "quality"
  | "other"

export interface Blocker {
  id: string
  areaId: string
  date: ISODate
  reason: BlockerReason
  text: string
  status: "open" | "resolved"
  tourId?: string | null
  taskId?: string | null
  /** how many consecutive tours this blocker was recorded in */
  streak?: number
  pending?: boolean
}

export type DefectSeverity = "critical" | "major" | "minor"

export interface Defect {
  id: string
  areaId: string
  date: ISODate
  title: string
  severity: DefectSeverity
  status: "open" | "in_progress" | "fixed"
  assigneeId?: string | null
  photoId?: string | null
  tourId?: string | null
  pending?: boolean
}

export interface Decision {
  id: string
  areaId: string | null
  date: ISODate
  time: string
  contractorId: string
  myRequirement: string
  theirRequirement: string
  commitment: string
  dueDate: ISODate | null
  notes?: string
  taskIds: string[]
  tourId?: string | null
  pending?: boolean
}

export interface Photo
  extends Record<string, unknown> {
  id: string
  areaId: string
  date: ISODate
  time: string
  caption: string
  url: string
  tourId?: string | null
  taskId?: string | null
  defectId?: string | null
  /** used for before/after pairing inside an area */
  pairKey?: string
  stage?: "before" | "after"
  pending?: boolean
}

export interface AreaVisit {
  areaId: string
  visitedAt: string | null
  skipped: boolean
  /** null = not answered yet */
  activeToday: boolean | null
  teamIds: string[]
  workersCount: number | null
  progressTags: string[]
  progressNote: string
  observationIds: string[]
  taskIds: string[]
  blockerIds: string[]
  defectIds: string[]
  decisionIds: string[]
  photoIds: string[]
}

export interface Tour {
  id: string
  date: ISODate
  startedAt: string | null
  endedAt: string | null
  status: "planned" | "active" | "done"
  routeAreaIds: string[]
  visits: Record<string, AreaVisit>
  /** task ids or free-text priorities chosen at the end of the tour */
  topPriorities: string[]
}

export type ActivityKind =
  | "observation"
  | "task_created"
  | "task_status"
  | "decision"
  | "blocker"
  | "defect"
  | "photo"
  | "tour"
  | "sync"

export interface ActivityLog {
  id: string
  date: ISODate
  time: string
  kind: ActivityKind
  text: string
  areaId?: string | null
  personId?: string | null
  refId?: string | null
}

export interface DayTarget {
  id: string
  text: string
  taskId?: string | null
  done: boolean
  date: ISODate
}

export interface ProjectState {
  project: {
    id: string
    name: string
    description?: string
    address?: string
    companyName?: string
    projectManagerId?: string
    apartments: number
    basements: number
    floors: number
    startedAt: ISODate
    expectedCompletionDate?: ISODate
    status: "planning" | "active" | "finishing" | "completed" | "on_hold"
  }
  areas: Area[]
  /** configured tour route: ordered list of areaIds to visit */
  tourRoute: string[]
  people: Person[]
  users: User[]
  tasks: Task[]
  observations: Observation[]
  blockers: Blocker[]
  defects: Defect[]
  decisions: Decision[]
  photos: Photo[]
  tours: Tour[]
  activity: ActivityLog[]
  dayTargets: DayTarget[]
  /** demo connectivity simulation */
  offline: boolean
  pendingCount: number
  lastSyncAt: string | null
}

/* ---------- display helpers (labels are the product's language) ---------- */

export const STATUS_LABEL: Record<TaskStatus, string> = {
  new: "חדש",
  open: "פתוח",
  in_progress: "בטיפול",
  waiting: "ממתין לאחר",
  blocked: "חסום",
  done: "הושלם",
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  critical: "קריטי",
  high: "גבוה",
  normal: "רגיל",
  low: "נמוך",
}

export const GROUP_LABEL: Record<PersonGroup, string> = {
  me: "אני",
  team: "הצוות שלי",
  contractor: "קבלנים",
}

export const BLOCKER_LABEL: Record<BlockerReason, string> = {
  material: "חסר חומר",
  manpower: "חסר כוח אדם",
  decision: "ממתין להחלטה",
  other_contractor: "ממתין לקבלן אחר",
  design: "בעיה בתכנון",
  quality: "בעיה באיכות",
  other: "אחר",
}

export const SEVERITY_LABEL: Record<DefectSeverity, string> = {
  critical: "קריטי",
  major: "משמעותי",
  minor: "קל",
}

export const DEFECT_STATUS_LABEL: Record<Defect["status"], string> = {
  open: "פתוח",
  in_progress: "בטיפול",
  fixed: "תוקן",
}

export const ACTIVITY_LABEL: Record<ActivityKind, string> = {
  observation: "תצפית",
  task_created: "משימה",
  task_status: "שינוי סטטוס",
  decision: "סיכום עם קבלן",
  blocker: "חסם",
  defect: "ליקוי",
  photo: "תמונה",
  tour: "סיור",
  sync: "סנכרון",
}

export const PROGRESS_TAGS = [
  "יציקה הושלמה",
  "ריצוף מתקדם",
  "טיח הושלם",
  "גבס הותקן",
  "חשמל בקירות",
  "אינסטלציה גמורה",
  "צבע יסוד",
  "אלומיניום הותקן",
  "ללא שינוי מאתמול",
  "פינוי פסולת",
]

/** area health used by the building heat map */
export type AreaHealth = "ok" | "warn" | "crit" | "idle"

export const HEALTH_LABEL: Record<AreaHealth, string> = {
  ok: "תקין",
  warn: "דורש תשומת לב",
  crit: "חסום",
  idle: "ללא פעילות",
}
