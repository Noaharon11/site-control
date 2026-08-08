"use client"

import * as React from "react"
import {
  AlertTriangle,
  Ban,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Handshake,
  Mic,
  Plus,
  SkipForward,
  Users,
  Wrench,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import {
  BLOCKER_LABEL,
  PROGRESS_TAGS,
  type Area,
  type AreaVisit,
  type BlockerReason,
} from "@/lib/types"
import { areaName, openBlockers, openTasksInArea, personName } from "@/lib/selectors"
import { dayOffset, daysOpen, nowTime, today } from "@/lib/dates"
import { AgeChip, PriorityChip, SelectChip, StatusChip } from "@/components/common/chips"
import { AreaMultiSelect } from "@/components/tasks/area-multi-select"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"

const SITE_PHOTOS = [
  { url: "/site/tiling.png", caption: "ריצוף בעבודה" },
  { url: "/site/electrical.png", caption: "חשמל בקירות" },
  { url: "/site/drywall.png", caption: "גבס במסדרון" },
  { url: "/site/paint.png", caption: "צבע הושלם" },
  { url: "/site/doorframes.png", caption: "משקוף חסר" },
  { url: "/site/pumproom.png", caption: "רטיבות בחדר משאבות" },
  { url: "/site/facade.png", caption: "חזית מערבית" },
  { url: "/site/earthworks.png", caption: "פיתוח חוץ" },
]

const BLOCKER_REASONS: BlockerReason[] = [
  "material",
  "manpower",
  "decision",
  "other_contractor",
  "design",
  "quality",
  "other",
]

/** simulated dictation – real device would use the Web Speech API */
const DICTATION = [
  "הריצוף בדירה 502 מתקדם, נשארו שני חדרים.",
  "הצוות עובד על טיח בחדרי המדרגות, נראה תקין.",
  "אין התקדמות מאתמול, הקבלן לא הביא חומר.",
  "הותקנו שלושה משקופים, שאר המשקופים בהמתנה.",
]

export function AreaCapture({
  area,
  index,
  total,
  onPrev,
  onNext,
  onBackToRoute,
}: {
  area: Area
  index: number
  total: number
  onPrev: () => void
  onNext: () => void
  onBackToRoute: () => void
}) {
  const { state, dispatch, uid } = useStore()
  const tour = state.tours.find((t) => t.date === today())
  const visit: AreaVisit | undefined = tour?.visits[area.id]

  const contractors = state.people.filter((p) => p.group === "contractor" && p.active !== false)
  const carriedTasks = openTasksInArea(state, area.id)
  const carriedBlockers = openBlockers(state).filter((b) => b.areaId === area.id)

  /* ------------------------------------------------------------ local form */
  const [active, setActive] = React.useState<boolean | null>(visit?.activeToday ?? null)
  const [teamIds, setTeamIds] = React.useState<string[]>(visit?.teamIds ?? [])
  const [workers, setWorkers] = React.useState<number>(visit?.workersCount ?? 0)
  const [tags, setTags] = React.useState<string[]>(visit?.progressTags ?? [])
  const [note, setNote] = React.useState(visit?.progressNote ?? "")

  // reset the form whenever we walk into a different area
  const areaKey = React.useRef(area.id)
  if (areaKey.current !== area.id) {
    areaKey.current = area.id
    setActive(visit?.activeToday ?? null)
    setTeamIds(visit?.teamIds ?? [])
    setWorkers(visit?.workersCount ?? 0)
    setTags(visit?.progressTags ?? [])
    setNote(visit?.progressNote ?? "")
  }

  /* ------------------------------------------------------------ mini forms */
  const [panel, setPanel] = React.useState<null | "blocker" | "task" | "defect" | "photo" | "deal">(
    null,
  )

  const capturedCount =
    (visit?.taskIds.length ?? 0) +
    (visit?.blockerIds.length ?? 0) +
    (visit?.defectIds.length ?? 0) +
    (visit?.photoIds.length ?? 0) +
    (visit?.decisionIds.length ?? 0)

  function persist() {
    dispatch({
      type: "saveVisit",
      areaId: area.id,
      patch: {
        activeToday: active,
        teamIds,
        workersCount: active ? workers : 0,
        progressTags: tags,
        progressNote: note,
      },
    })
    if (note.trim()) {
      dispatch({
        type: "addObservation",
        observation: {
          id: uid("ob"),
          tourId: tour?.id ?? null,
          areaId: area.id,
          date: today(),
          time: nowTime(),
          kind: "progress",
          text: note.trim(),
        },
      })
    }
  }

  function saveAndNext() {
    persist()
    onNext()
  }

  function skip() {
    dispatch({ type: "skipVisit", areaId: area.id })
    onNext()
  }

  const dirty = active !== null || tags.length > 0 || note.trim().length > 0

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background pb-48 lg:min-h-0 lg:pb-24">
      {/* ---------------------------------------------------- sticky header */}
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <Button variant="ghost" size="icon-sm" onClick={onBackToRoute} aria-label="חזרה למסלול">
            <ChevronRight />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold leading-tight text-foreground">
              {area.name}
            </p>
            <p className="nums text-[11px] font-medium text-muted-foreground">
              אזור {index + 1} מתוך {total}
              {capturedCount > 0 && ` • ${capturedCount} רשומות נשמרו`}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={skip}
            className="shrink-0 text-muted-foreground"
          >
            <SkipForward data-icon="inline-start" />
            דלג
          </Button>
        </div>
        <Progress value={((index + 1) / total) * 100} className="h-1 rounded-none" />
      </header>

      <div className="flex flex-col gap-5 px-3 py-4 lg:px-0">
        {/* ------------------------------------------- carried over context */}
        {(carriedTasks.length > 0 || carriedBlockers.length > 0) && (
          <section className="rounded-xl border border-warn/30 bg-warn-soft/50 p-3">
            <h3 className="flex items-center gap-1.5 pb-2 text-[12px] font-bold uppercase tracking-wide text-warn-foreground">
              <AlertTriangle className="size-3.5" />
              מה נשאר פתוח כאן
            </h3>
            <ul className="flex flex-col gap-1.5">
              {carriedBlockers.map((b) => (
                <li key={b.id} className="flex items-start gap-2 text-[13px] leading-snug">
                  <Ban className="mt-0.5 size-3.5 shrink-0 text-crit" />
                  <span className="flex-1 text-pretty text-foreground">
                    {b.text}
                    <span className="nums ms-1 text-[11px] font-semibold text-muted-foreground">
                      ({BLOCKER_LABEL[b.reason]}
                      {(b.streak ?? 1) > 1 && ` • ${b.streak} סיורים`})
                    </span>
                  </span>
                </li>
              ))}
              {carriedTasks.slice(0, 4).map((t) => (
                <li key={t.id} className="flex items-start gap-2 text-[13px] leading-snug">
                  <Wrench className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-pretty text-foreground">{t.title}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    <PriorityChip priority={t.priority} />
                    <AgeChip days={daysOpen(t.createdAt)} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ------------------------------------------------ work here today */}
        <section>
          <h3 className="pb-2 text-[13px] font-bold text-foreground">יש עבודה כאן היום?</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-pressed={active === true}
              onClick={() => setActive(true)}
              className={cn(
                "flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 text-[15px] font-bold transition-colors",
                active === true
                  ? "border-ok bg-ok text-ok-foreground"
                  : "border-border bg-card text-foreground hover:bg-muted",
              )}
            >
              <Check className="size-5" />
              כן, יש עבודה
            </button>
            <button
              type="button"
              aria-pressed={active === false}
              onClick={() => {
                setActive(false)
                setTeamIds([])
                setWorkers(0)
              }}
              className={cn(
                "flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 text-[15px] font-bold transition-colors",
                active === false
                  ? "border-crit bg-crit text-crit-foreground"
                  : "border-border bg-card text-foreground hover:bg-muted",
              )}
            >
              <Ban className="size-5" />
              לא, אזור ריק
            </button>
          </div>
        </section>

        {/* --------------------------------------------------- who is here */}
        {active === true && (
          <>
            <section>
              <h3 className="pb-2 text-[13px] font-bold text-foreground">מי נמצא כאן?</h3>
              <div className="flex flex-wrap gap-2">
                {contractors.map((c) => (
                  <SelectChip
                    key={c.id}
                    selected={teamIds.includes(c.id)}
                    onClick={() =>
                      setTeamIds((prev) =>
                        prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id],
                      )
                    }
                  >
                    {c.name}
                  </SelectChip>
                ))}
              </div>
            </section>

            <section>
              <h3 className="pb-2 text-[13px] font-bold text-foreground">כמה עובדים?</h3>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-12 shrink-0 text-lg"
                  onClick={() => setWorkers((w) => Math.max(0, w - 1))}
                  aria-label="הפחת עובד"
                >
                  −
                </Button>
                <span className="nums flex h-12 min-w-16 items-center justify-center rounded-lg border border-border bg-card px-4 text-xl font-bold text-foreground">
                  {workers}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-12 shrink-0 text-lg"
                  onClick={() => setWorkers((w) => w + 1)}
                  aria-label="הוסף עובד"
                >
                  +
                </Button>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="size-3.5" />
                  לפי הערכה
                </span>
              </div>
            </section>
          </>
        )}

        {/* ------------------------------------------------ progress tags */}
        <section>
          <h3 className="pb-2 text-[13px] font-bold text-foreground">מה ההתקדמות?</h3>
          <div className="flex flex-wrap gap-2">
            {PROGRESS_TAGS.map((tag) => (
              <SelectChip
                key={tag}
                selected={tags.includes(tag)}
                onClick={() =>
                  setTags((prev) =>
                    prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag],
                  )
                }
              >
                {tag}
              </SelectChip>
            ))}
          </div>
        </section>

        {/* -------------------------------------------------------- note */}
        <section>
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-[13px] font-bold text-foreground">הערה חופשית</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNote((n) => (n ? n + " " : "") + DICTATION[index % DICTATION.length])}
            >
              <Mic data-icon="inline-start" />
              הקלטה
            </Button>
          </div>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="מה ראית כאן? כותב פעם אחת – נשמר לתמיד."
            className="min-h-20 text-[15px]"
          />
        </section>

        {/* ------------------------------------------------ capture buttons */}
        <section>
          <h3 className="pb-2 text-[13px] font-bold text-foreground">תיעוד מהיר</h3>
          <div className="grid grid-cols-5 gap-1.5">
            <CaptureButton
              icon={Ban}
              label="חסם"
              tone="crit"
              count={visit?.blockerIds.length ?? 0}
              onClick={() => setPanel(panel === "blocker" ? null : "blocker")}
              open={panel === "blocker"}
            />
            <CaptureButton
              icon={Wrench}
              label="משימה"
              count={visit?.taskIds.length ?? 0}
              onClick={() => setPanel(panel === "task" ? null : "task")}
              open={panel === "task"}
            />
            <CaptureButton
              icon={AlertTriangle}
              label="ליקוי"
              tone="warn"
              count={visit?.defectIds.length ?? 0}
              onClick={() => setPanel(panel === "defect" ? null : "defect")}
              open={panel === "defect"}
            />
            <CaptureButton
              icon={Camera}
              label="תמונה"
              count={visit?.photoIds.length ?? 0}
              onClick={() => setPanel(panel === "photo" ? null : "photo")}
              open={panel === "photo"}
            />
            <CaptureButton
              icon={Handshake}
              label="סיכום"
              count={visit?.decisionIds.length ?? 0}
              onClick={() => setPanel(panel === "deal" ? null : "deal")}
              open={panel === "deal"}
            />
          </div>

          {panel === "blocker" && (
            <BlockerForm areaId={area.id} onDone={() => setPanel(null)} />
          )}
          {panel === "task" && <TaskForm areaId={area.id} onDone={() => setPanel(null)} />}
          {panel === "defect" && <DefectForm areaId={area.id} onDone={() => setPanel(null)} />}
          {panel === "photo" && <PhotoForm areaId={area.id} onDone={() => setPanel(null)} />}
          {panel === "deal" && <DealForm areaId={area.id} onDone={() => setPanel(null)} />}
        </section>

        {/* -------------------------------------------- what was captured */}
        {capturedCount > 0 && (
          <section className="rounded-xl border border-border bg-muted/40 p-3">
            <h3 className="pb-2 text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
              נשמר באזור הזה
            </h3>
            <ul className="flex flex-col gap-1.5 text-[13px]">
              {visit?.blockerIds.map((id) => {
                const b = state.blockers.find((x) => x.id === id)
                return b ? (
                  <li key={id} className="flex items-center gap-2">
                    <Ban className="size-3.5 shrink-0 text-crit" />
                    <span className="flex-1 truncate text-foreground">{b.text}</span>
                  </li>
                ) : null
              })}
              {visit?.taskIds.map((id) => {
                const t = state.tasks.find((x) => x.id === id)
                return t ? (
                  <li key={id} className="flex items-center gap-2">
                    <Wrench className="size-3.5 shrink-0 text-info" />
                    <span className="flex-1 truncate text-foreground">{t.title}</span>
                    <StatusChip status={t.status} withIcon={false} />
                  </li>
                ) : null
              })}
              {visit?.defectIds.map((id) => {
                const d = state.defects.find((x) => x.id === id)
                return d ? (
                  <li key={id} className="flex items-center gap-2">
                    <AlertTriangle className="size-3.5 shrink-0 text-warn-foreground" />
                    <span className="flex-1 truncate text-foreground">{d.title}</span>
                  </li>
                ) : null
              })}
              {visit?.decisionIds.map((id) => {
                const d = state.decisions.find((x) => x.id === id)
                return d ? (
                  <li key={id} className="flex items-center gap-2">
                    <Handshake className="size-3.5 shrink-0 text-info" />
                    <span className="flex-1 truncate text-foreground">{d.commitment}</span>
                  </li>
                ) : null
              })}
              {visit?.photoIds.length ? (
                <li className="flex items-center gap-2">
                  <Camera className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="nums flex-1 text-foreground">
                    {visit.photoIds.length} תמונות צורפו
                  </span>
                </li>
              ) : null}
            </ul>
          </section>
        )}
      </div>

      {/* --------------------------------------------------- sticky footer */}
      <div className="fixed inset-x-0 bottom-14 z-30 border-t border-border bg-card/95 p-3 backdrop-blur lg:bottom-0 lg:sticky lg:mt-4">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="size-12 shrink-0"
            onClick={onPrev}
            disabled={index === 0}
            aria-label="אזור קודם"
          >
            <ChevronRight />
          </Button>
          <Button className="h-12 flex-1 text-[15px]" onClick={saveAndNext}>
            {dirty ? "שמור והמשך" : "המשך"}
            <ChevronLeft data-icon="inline-end" />
          </Button>
        </div>
        {state.offline && (
          <p className="nums pt-1.5 text-center text-[11px] font-medium text-warn-foreground">
            נשמר במכשיר • {state.pendingCount} רשומות ממתינות לסנכרון
          </p>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ sub-widgets */

function CaptureButton({
  icon: Icon,
  label,
  count,
  onClick,
  open,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  count: number
  onClick: () => void
  open: boolean
  tone?: "default" | "crit" | "warn"
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className={cn(
        "relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border-2 px-0.5 text-[11px] font-bold transition-colors",
        open
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:bg-muted",
      )}
    >
      <span className="relative">
        <Icon
          className={cn(
            "size-5",
            !open && tone === "crit" && "text-crit",
            !open && tone === "warn" && "text-warn-foreground",
          )}
        />
        <Plus
          className={cn(
            "absolute -end-1.5 -top-1 size-3 stroke-[3]",
            open ? "text-accent" : "text-muted-foreground",
          )}
        />
      </span>
      {label}
      {count > 0 && (
        <span className="nums absolute end-1 top-1 flex size-4 items-center justify-center rounded-full bg-ok text-[9px] font-bold text-ok-foreground">
          {count}
        </span>
      )}
    </button>
  )
}

function PanelShell({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null)

  // the sticky save bar covers the bottom of the screen, so pull the freshly
  // opened panel into view instead of letting it open underneath it
  React.useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [])

  return (
    <div
      ref={ref}
      className="mt-2 flex scroll-mt-24 flex-col gap-3 rounded-xl border-2 border-primary/30 bg-card p-3"
    >
      {children}
    </div>
  )
}

function BlockerForm({ areaId, onDone }: { areaId: string; onDone: () => void }) {
  const { state, dispatch, commitAction, uid } = useStore()
  const tour = state.tours.find((t) => t.date === today())
  const [reason, setReason] = React.useState<BlockerReason>("material")
  const [text, setText] = React.useState("")
  const [alsoTask, setAlsoTask] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [draftBlockerId] = React.useState(() => uid("bl"))
  const [draftTaskId] = React.useState(() => uid("tk"))

  async function save() {
    if (!text.trim() || isSaving) return
    setIsSaving(true)
    const blockerId = draftBlockerId
    let taskId: string | null = null
    if (alsoTask) {
      taskId = draftTaskId
      const taskResult = await commitAction({
        type: "addTask",
        task: {
          id: taskId,
          title: `לטפל בחסם: ${text.trim()}`,
          areaIds: [areaId],
          areaId,
          assigneeId: "me",
          assigneeGroup: "me",
          priority: "critical",
          status: "new",
          dueDate: today(),
          createdAt: today(),
          source: `חסם שנרשם בסיור – ${areaName(state, areaId)}`,
          tourId: tour?.id ?? null,
          blockerId,
          history: [{ date: today(), time: nowTime(), text: "נוצר אוטומטית מחסם בסיור" }],
        },
      })
      if (!taskResult.ok) {
        setIsSaving(false)
        return
      }
    }
    dispatch({
      type: "addBlocker",
      blocker: {
        id: blockerId,
        areaId,
        date: today(),
        reason,
        text: text.trim(),
        status: "open",
        tourId: tour?.id ?? null,
        taskId,
        streak: 1,
      },
    })
    setIsSaving(false)
    onDone()
  }

  return (
    <PanelShell>
      <div>
        <p className="pb-2 text-[13px] font-bold text-foreground">מה עוצר את העבודה?</p>
        <div className="flex flex-wrap gap-2">
          {BLOCKER_REASONS.map((r) => (
            <SelectChip key={r} selected={reason === r} tone="crit" onClick={() => setReason(r)}>
              {BLOCKER_LABEL[r]}
            </SelectChip>
          ))}
        </div>
      </div>
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="תיאור קצר – למשל: חסרים 40 שקי דבק"
        className="h-11 text-[15px]"
      />
      <label className="flex min-h-11 items-center gap-2 text-[13px] font-medium text-foreground">
        <input
          type="checkbox"
          checked={alsoTask}
          onChange={(e) => setAlsoTask(e.target.checked)}
          className="size-4 accent-[var(--primary)]"
        />
        פתח גם משימה קריטית עליי לטיפול היום
      </label>
      <div className="flex gap-2">
        <Button className="h-11 flex-1" onClick={() => void save()} disabled={!text.trim() || isSaving}>
          שמור חסם
        </Button>
        <Button variant="ghost" className="h-11" onClick={onDone}>
          ביטול
        </Button>
      </div>
    </PanelShell>
  )
}

function TaskForm({ areaId, onDone }: { areaId: string; onDone: () => void }) {
  const { state, commitAction, uid } = useStore()
  const tour = state.tours.find((t) => t.date === today())
  const [title, setTitle] = React.useState("")
  const [areaIds, setAreaIds] = React.useState<string[]>([areaId])
  const [assigneeId, setAssigneeId] = React.useState("me")
  const [priority, setPriority] = React.useState<"critical" | "high" | "normal">("normal")
  const [due, setDue] = React.useState<"today" | "tomorrow" | "week">("tomorrow")
  const [isSaving, setIsSaving] = React.useState(false)
  const [draftTaskId] = React.useState(() => uid("tk"))

  const assignees = [{ id: "me", name: "אני", group: "me" as const }, ...state.people.filter((p) => p.id !== "me")]

  async function save() {
    if (!title.trim() || isSaving) return
    setIsSaving(true)
    const person = assignees.find((p) => p.id === assigneeId)
    const normalizedAreaIds = [...new Set(areaIds.filter(Boolean))]
    const result = await commitAction({
      type: "addTask",
      task: {
          id: draftTaskId,
        title: title.trim(),
        areaIds: normalizedAreaIds,
        areaId: normalizedAreaIds[0] ?? null,
        assigneeId,
        assigneeGroup: person?.group ?? "me",
        priority,
        status: "new",
        dueDate: due === "today" ? today() : due === "tomorrow" ? dayPlus(1) : dayPlus(7),
        createdAt: today(),
        source: `נרשם בסיור בוקר – ${areaName(state, areaId)}`,
        tourId: tour?.id ?? null,
        history: [{ date: today(), time: nowTime(), text: "נוצר בסיור הבוקר" }],
      },
    })
    setIsSaving(false)
    if (!result.ok) return
    onDone()
  }

  return (
    <PanelShell>
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="מה צריך לעשות?"
        className="h-11 text-[15px]"
      />
      <div>
        <p className="pb-2 text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
          אזורים
        </p>
        <AreaMultiSelect
          areas={state.areas.filter((a) => a.active !== false)}
          value={areaIds}
          onChange={setAreaIds}
          placeholder="בחר אזור אחד או יותר"
        />
      </div>
      <div>
        <p className="pb-2 text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
          על מי
        </p>
        <div className="flex flex-wrap gap-2">
          {assignees.map((p) => (
            <SelectChip
              key={p.id}
              selected={assigneeId === p.id}
              onClick={() => setAssigneeId(p.id)}
            >
              {p.id === "me" ? "עליי" : p.name}
            </SelectChip>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        <div>
          <p className="pb-2 text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
            דחיפות
          </p>
          <div className="flex gap-2">
            {(["critical", "high", "normal"] as const).map((p) => (
              <SelectChip
                key={p}
                selected={priority === p}
                tone={p === "critical" ? "crit" : p === "high" ? "warn" : "default"}
                onClick={() => setPriority(p)}
              >
                {p === "critical" ? "קריטי" : p === "high" ? "גבוה" : "רגיל"}
              </SelectChip>
            ))}
          </div>
        </div>
        <div>
          <p className="pb-2 text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
            עד מתי
          </p>
          <div className="flex gap-2">
            {(["today", "tomorrow", "week"] as const).map((d) => (
              <SelectChip key={d} selected={due === d} onClick={() => setDue(d)}>
                {d === "today" ? "היום" : d === "tomorrow" ? "מחר" : "שבוע"}
              </SelectChip>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Button className="h-11 flex-1" onClick={() => void save()} disabled={!title.trim() || isSaving}>
          שמור משימה
        </Button>
        <Button variant="ghost" className="h-11" onClick={onDone}>
          ביטול
        </Button>
      </div>
    </PanelShell>
  )
}

function DefectForm({ areaId, onDone }: { areaId: string; onDone: () => void }) {
  const { state, dispatch, uid } = useStore()
  const tour = state.tours.find((t) => t.date === today())
  const [title, setTitle] = React.useState("")
  const [severity, setSeverity] = React.useState<"critical" | "major" | "minor">("major")
  const [assigneeId, setAssigneeId] = React.useState<string>("")
  const contractors = state.people.filter((p) => p.group === "contractor" && p.active !== false)

  function save() {
    if (!title.trim()) return
    dispatch({
      type: "addDefect",
      defect: {
        id: uid("df"),
        areaId,
        date: today(),
        title: title.trim(),
        severity,
        status: "open",
        assigneeId: assigneeId || null,
        tourId: tour?.id ?? null,
      },
    })
    onDone()
  }

  return (
    <PanelShell>
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="מה הליקוי? למשל: אריח שקוע בסלון"
        className="h-11 text-[15px]"
      />
      <div className="flex flex-wrap gap-4">
        <div>
          <p className="pb-2 text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
            חמורה
          </p>
          <div className="flex gap-2">
            {(["critical", "major", "minor"] as const).map((s) => (
              <SelectChip
                key={s}
                selected={severity === s}
                tone={s === "critical" ? "crit" : s === "major" ? "warn" : "default"}
                onClick={() => setSeverity(s)}
              >
                {s === "critical" ? "קריטי" : s === "major" ? "משמעותי" : "קל"}
              </SelectChip>
            ))}
          </div>
        </div>
        <div>
          <p className="pb-2 text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
            אחראי לתיקון
          </p>
          <div className="flex flex-wrap gap-2">
            {contractors.map((c) => (
              <SelectChip
                key={c.id}
                selected={assigneeId === c.id}
                onClick={() => setAssigneeId(assigneeId === c.id ? "" : c.id)}
              >
                {c.name}
              </SelectChip>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Button className="h-11 flex-1" onClick={save} disabled={!title.trim()}>
          שמור ליקוי
        </Button>
        <Button variant="ghost" className="h-11" onClick={onDone}>
          ביטול
        </Button>
      </div>
    </PanelShell>
  )
}

function PhotoForm({ areaId, onDone }: { areaId: string; onDone: () => void }) {
  const { state, dispatch, uid } = useStore()
  const tour = state.tours.find((t) => t.date === today())
  const [picked, setPicked] = React.useState<number | null>(null)
  const [caption, setCaption] = React.useState("")

  function save() {
    if (picked === null) return
    const p = SITE_PHOTOS[picked]
    dispatch({
      type: "addPhoto",
      photo: {
        id: uid("ph"),
        areaId,
        date: today(),
        time: nowTime(),
        caption: caption.trim() || p.caption,
        url: p.url,
        tourId: tour?.id ?? null,
      },
    })
    onDone()
  }

  return (
    <PanelShell>
      <p className="text-[13px] font-bold text-foreground">בחר תמונה מהמצלמה</p>
      <div className="grid grid-cols-4 gap-2">
        {SITE_PHOTOS.map((p, i) => (
          <button
            key={p.url}
            type="button"
            onClick={() => {
              setPicked(i)
              setCaption(p.caption)
            }}
            aria-pressed={picked === i}
            className={cn(
              "relative aspect-square overflow-hidden rounded-lg border-2",
              picked === i ? "border-primary" : "border-border",
            )}
          >
            <img
              src={p.url || "/placeholder.svg"}
              alt={p.caption}
              className="size-full object-cover"
            />
            {picked === i && (
              <span className="absolute inset-0 flex items-center justify-center bg-primary/40">
                <Check className="size-5 text-primary-foreground" />
              </span>
            )}
          </button>
        ))}
      </div>
      <Input
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="כתובית לתמונה"
        className="h-11 text-[15px]"
      />
      <div className="flex gap-2">
        <Button className="h-11 flex-1" onClick={save} disabled={picked === null}>
          צרף תמונה
        </Button>
        <Button variant="ghost" className="h-11" onClick={onDone}>
          ביטול
        </Button>
      </div>
    </PanelShell>
  )
}

function DealForm({ areaId, onDone }: { areaId: string; onDone: () => void }) {
  const { state, dispatch, commitAction, uid } = useStore()
  const tour = state.tours.find((t) => t.date === today())
  const contractors = state.people.filter((p) => p.group === "contractor" && p.active !== false)
  const [contractorId, setContractorId] = React.useState(contractors[0]?.id ?? "")
  const [mine, setMine] = React.useState("")
  const [theirs, setTheirs] = React.useState("")
  const [commitment, setCommitment] = React.useState("")
  const [due, setDue] = React.useState<"today" | "tomorrow" | "week">("tomorrow")
  const [makeTask, setMakeTask] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [draftDecisionId] = React.useState(() => uid("dc"))
  const [draftTaskId] = React.useState(() => uid("tk"))

  async function save() {
    if (!commitment.trim() || !contractorId || isSaving) return
    setIsSaving(true)
    const decisionId = draftDecisionId
    const taskIds: string[] = []
    const dueDate = due === "today" ? today() : due === "tomorrow" ? dayPlus(1) : dayPlus(7)
    if (makeTask) {
      const taskId = draftTaskId
      taskIds.push(taskId)
      const taskResult = await commitAction({
        type: "addTask",
        task: {
          id: taskId,
          title: commitment.trim(),
          areaIds: [areaId],
          areaId,
          assigneeId: contractorId,
          assigneeGroup: "contractor",
          priority: "high",
          status: "new",
          dueDate,
          createdAt: today(),
          source: `סיכום בשטח עם ${personName(state, contractorId)} – ${areaName(state, areaId)}`,
          tourId: tour?.id ?? null,
          decisionId,
          history: [{ date: today(), time: nowTime(), text: "נוצר מסיכום בשטח" }],
        },
      })
      if (!taskResult.ok) {
        setIsSaving(false)
        return
      }
    }
    dispatch({
      type: "addDecision",
      decision: {
        id: decisionId,
        areaId,
        date: today(),
        time: nowTime(),
        contractorId,
        myRequirement: mine.trim(),
        theirRequirement: theirs.trim(),
        commitment: commitment.trim(),
        dueDate,
        taskIds,
        tourId: tour?.id ?? null,
      },
    })
    setIsSaving(false)
    onDone()
  }

  return (
    <PanelShell>
      {contractors.length === 0 && (
        <p className="rounded-lg border border-dashed border-border bg-muted/40 p-3 text-[13px] text-muted-foreground">
          עדיין לא נוספו קבלנים. אפשר להוסיף קבלן דרך מסך הניהול ואז לחזור לסיכום בשטח.
        </p>
      )}
      <div>
        <p className="pb-2 text-[13px] font-bold text-foreground">עם מי דיברת?</p>
        <div className="flex flex-wrap gap-2">
          {contractors.map((c) => (
            <SelectChip
              key={c.id}
              selected={contractorId === c.id}
              onClick={() => setContractorId(c.id)}
            >
              {c.name}
            </SelectChip>
          ))}
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
            מה דרשתי
          </label>
          <Input
            value={mine}
            onChange={(e) => setMine(e.target.value)}
            placeholder="למשל: להשלים ריצוף עד חמישי"
            className="h-11 text-[15px]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
            מה הוא דרש
          </label>
          <Input
            value={theirs}
            onChange={(e) => setTheirs(e.target.value)}
            placeholder="למשל: לפנות את המסדרון"
            className="h-11 text-[15px]"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
          מה סוכם
        </label>
        <Textarea
          value={commitment}
          onChange={(e) => setCommitment(e.target.value)}
          rows={2}
          placeholder="ההתחייבות המדויקת – זה מה שיישאר בתיעוד"
          className="text-[15px]"
        />
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <p className="pb-2 text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
            עד מתי
          </p>
          <div className="flex gap-2">
            {(["today", "tomorrow", "week"] as const).map((d) => (
              <SelectChip key={d} selected={due === d} onClick={() => setDue(d)}>
                {d === "today" ? "היום" : d === "tomorrow" ? "מחר" : "שבוע"}
              </SelectChip>
            ))}
          </div>
        </div>
      </div>
      <label className="flex min-h-11 items-center gap-2 text-[13px] font-medium text-foreground">
        <input
          type="checkbox"
          checked={makeTask}
          onChange={(e) => setMakeTask(e.target.checked)}
          className="size-4 accent-[var(--primary)]"
        />
        פתח משימה על הקבלן למעקב
      </label>
      <div className="flex gap-2">
        <Button className="h-11 flex-1" onClick={save} disabled={!commitment.trim() || !contractorId}>
          שמור סיכום
        </Button>
        <Button variant="ghost" className="h-11" onClick={onDone}>
          ביטול
        </Button>
      </div>
    </PanelShell>
  )
}

function dayPlus(n: number) {
  return dayOffset(n)
}
