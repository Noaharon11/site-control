"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { AlertTriangle, Clock, Inbox, ListFilter, Plus, Search, User, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import type { Task } from "@/lib/types"
import { areaName, isOpen, personName } from "@/lib/selectors"
import { today } from "@/lib/dates"
import { PageBody, PageHeader } from "@/components/common/page-header"
import { SectionTitle } from "@/components/common/chips"
import { TaskCard } from "@/components/tasks/task-card"
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet"
import { NewTaskSheet } from "@/components/tasks/new-task-sheet"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/* --------------------------------------------------------------- the lenses
 * A site manager never wants "all tasks". He wants to know who has to move
 * next: him, a contractor, or nobody (which is the real problem).
 */
type LensId = "mine" | "late" | "critical" | "waiting" | "all" | "done"

const LENSES: { id: LensId; label: string; hint: string }[] = [
  { id: "mine", label: "עליי", hint: "משימות שאני חייב לסגור" },
  { id: "late", label: "באיחור", hint: "עבר תאריך היעד" },
  { id: "critical", label: "קריטי", hint: "לא יכול לחכות" },
  { id: "waiting", label: "ממתין לאחרים", hint: "הכדור אצל מישהו אחר" },
  { id: "all", label: "הכול הפתוח", hint: "כל המשימות הפתוחות" },
  { id: "done", label: "הושלם", hint: "נסגר לאחרונה" },
]

function matchesLens(task: Task, lens: LensId): boolean {
  const open = isOpen(task)
  switch (lens) {
    case "mine":
      return open && task.assigneeGroup === "me"
    case "late":
      return open && task.dueDate !== null && task.dueDate < today()
    case "critical":
      return open && task.priority === "critical"
    case "waiting":
      return open && (task.assigneeGroup === "contractor" || task.status === "waiting")
    case "all":
      return open
    case "done":
      return task.status === "done"
  }
}

/** open items first, then critical, then oldest — the order he should work in */
function triage(a: Task, b: Task) {
  const rank: Record<Task["priority"], number> = { critical: 0, high: 1, normal: 2, low: 3 }
  if (rank[a.priority] !== rank[b.priority]) return rank[a.priority] - rank[b.priority]
  const aDue = a.dueDate ?? "9999-12-31"
  const bDue = b.dueDate ?? "9999-12-31"
  if (aDue !== bDue) return aDue < bDue ? -1 : 1
  return a.createdAt < b.createdAt ? -1 : 1
}

export function TasksContent() {
  const { state, hydrated } = useStore()
  const params = useSearchParams()
  const deepLink = params.get("task")

  const [lens, setLens] = React.useState<LensId>("mine")
  const [query, setQuery] = React.useState("")
  const [groupByArea, setGroupByArea] = React.useState(false)
  const [openTaskId, setOpenTaskId] = React.useState<string | null>(null)
  const [newOpen, setNewOpen] = React.useState(false)

  // a link from the Today screen or a tour should open that task straight away
  React.useEffect(() => {
    if (deepLink) setOpenTaskId(deepLink)
  }, [deepLink])

  const counts = React.useMemo(() => {
    const out = {} as Record<LensId, number>
    for (const l of LENSES) out[l.id] = state.tasks.filter((t) => matchesLens(t, l.id)).length
    return out
  }, [state.tasks])

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.tasks
      .filter((t) => matchesLens(t, lens))
      .filter((t) => {
        if (!q) return true
        const haystack = [
          t.title,
          t.description ?? "",
          areaName(state, t.areaId),
          personName(state, t.assigneeId),
        ]
          .join(" ")
          .toLowerCase()
        return haystack.includes(q)
      })
      .sort(triage)
  }, [state, lens, query])

  const grouped = React.useMemo(() => {
    if (!groupByArea) return null
    const map = new Map<string, Task[]>()
    for (const t of visible) {
      const key = t.areaId ?? "__none"
      const list = map.get(key)
      if (list) list.push(t)
      else map.set(key, [t])
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [visible, groupByArea])

  if (!hydrated) return null

  const activeLens = LENSES.find((l) => l.id === lens)!

  return (
    <>
      <PageHeader
        title="משימות"
        subtitle={activeLens.hint}
        actions={
          <Button size="sm" className="h-9" onClick={() => setNewOpen(true)}>
            <Plus data-icon="inline-start" />
            משימה
          </Button>
        }
      >
        {/* ------------------------------------------------------ lens tabs */}
        <div
          role="tablist"
          aria-label="סינון משימות"
          className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 lg:mx-0 lg:flex-wrap lg:px-0"
        >
          {LENSES.map((l) => {
            const on = l.id === lens
            return (
              <button
                key={l.id}
                role="tab"
                aria-selected={on}
                onClick={() => setLens(l.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors",
                  on
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:bg-muted",
                )}
              >
                {l.id === "late" && <Clock className="size-3.5" />}
                {l.id === "critical" && <AlertTriangle className="size-3.5" />}
                {l.id === "mine" && <User className="size-3.5" />}
                {l.label}
                <span
                  className={cn(
                    "nums rounded px-1 text-[11px] font-bold",
                    on ? "bg-primary-foreground/20" : "bg-secondary text-secondary-foreground",
                  )}
                >
                  {counts[l.id]}
                </span>
              </button>
            )
          })}
        </div>

        {/* -------------------------------------------------- search + group */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חיפוש לפי משימה, אזור או קבלן"
              className="h-10 pe-9 text-[14px]"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="נקה חיפוש"
                className="absolute start-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <Button
            variant={groupByArea ? "default" : "outline"}
            size="sm"
            className="h-10 shrink-0"
            aria-pressed={groupByArea}
            onClick={() => setGroupByArea((v) => !v)}
          >
            <ListFilter data-icon="inline-start" />
            לפי אזור
          </Button>
        </div>
      </PageHeader>

      <PageBody className="flex flex-col gap-5">
        {visible.length === 0 ? (
          <Empty className="rounded-xl border border-border bg-card py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Inbox />
              </EmptyMedia>
              <EmptyTitle>
                {query ? "לא נמצאו משימות" : state.tasks.length === 0 ? "אין משימות עדיין" : `אין משימות ב"${activeLens.label}"`}
              </EmptyTitle>
              <EmptyDescription>
                {query
                  ? "נסה מונח אחר, או בדוק בעדשה אחרת."
                  : state.tasks.length === 0
                    ? "אפשר להתחיל ממשימה ראשונה לפרויקט."
                    : lens === "mine"
                    ? "הרשימה שלך ריקה. זה הזמן לצאת לסיור."
                    : "אין כאן כלום כרגע."}
              </EmptyDescription>
            </EmptyHeader>
            {!query && state.tasks.length === 0 && (
              <Button size="sm" onClick={() => setNewOpen(true)}>
                + צור משימה
              </Button>
            )}
          </Empty>
        ) : grouped ? (
          grouped.map(([areaId, tasks]) => (
            <section key={areaId}>
              <SectionTitle count={tasks.length}>
                {areaId === "__none" ? "ללא אזור" : areaName(state, areaId)}
              </SectionTitle>
              <ul className="grid gap-2 xl:grid-cols-2">
                {tasks.map((t) => (
                  <li key={t.id}>
                    <TaskCard task={t} onOpen={setOpenTaskId} hideArea />
                  </li>
                ))}
              </ul>
            </section>
          ))
        ) : (
          <ul className="grid gap-2 xl:grid-cols-2">
            {visible.map((t) => (
              <li key={t.id}>
                <TaskCard task={t} onOpen={setOpenTaskId} />
              </li>
            ))}
          </ul>
        )}

        {visible.length > 0 && (
          <p className="nums pt-1 text-center text-[12px] text-muted-foreground">
            {visible.length} משימות מוצגות
            {lens !== "done" && ` • הכי דחוף למעלה`}
          </p>
        )}
      </PageBody>

      <TaskDetailSheet taskId={openTaskId} onOpenChange={(v) => !v && setOpenTaskId(null)} />
      <NewTaskSheet open={newOpen} onOpenChange={setNewOpen} onCreated={(t) => setOpenTaskId(t.id)} />
    </>
  )
}
