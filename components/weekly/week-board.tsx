"use client"

import * as React from "react"
import { CalendarPlus, GripVertical, Inbox } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import { areaName, personName, isOpen } from "@/lib/selectors"
import { dayName, isOverdue, shortDate, today, workWeek } from "@/lib/dates"
import type { ISODate, Task } from "@/lib/types"
import { PriorityBar } from "@/components/common/chips"

/** a day is over capacity when too many open items land on it */
const DAY_CAPACITY = 5

export function WeekBoard({ onOpenTask }: { onOpenTask: (id: string) => void }) {
  const { state, dispatch } = useStore()
  const [dragId, setDragId] = React.useState<string | null>(null)
  const [overCol, setOverCol] = React.useState<string | null>(null)

  const week = React.useMemo(() => workWeek(), [])
  const t = today()

  const open = React.useMemo(() => state.tasks.filter(isOpen), [state.tasks])

  /** tasks bucketed per weekday, plus overdue and unscheduled piles */
  const columns = React.useMemo(() => {
    const byDay = new Map<string, Task[]>(week.map((d) => [d, []]))
    const unscheduled: Task[] = []
    const overdue: Task[] = []

    for (const task of open) {
      if (!task.dueDate) {
        unscheduled.push(task)
        continue
      }
      const bucket = byDay.get(task.dueDate)
      if (bucket) bucket.push(task)
      else if (isOverdue(task.dueDate)) overdue.push(task)
      // dates outside this week and not overdue simply aren't shown on the board
    }

    const rank = { critical: 0, high: 1, normal: 2, low: 3 } as const
    for (const list of byDay.values()) list.sort((a, b) => rank[a.priority] - rank[b.priority])
    overdue.sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))

    return { byDay, unscheduled, overdue }
  }, [open, week])

  function moveTo(taskId: string, due: ISODate | null) {
    const task = state.tasks.find((x) => x.id === taskId)
    if (!task || task.dueDate === due) return
    dispatch({
      type: "updateTask",
      id: taskId,
      patch: { dueDate: due },
      note: due ? `תוזמן ל־${shortDate(due)}` : "הוסר יעד",
    })
  }

  function handleDrop(e: React.DragEvent, due: ISODate | null) {
    e.preventDefault()
    const id = e.dataTransfer.getData("text/plain") || dragId
    setOverCol(null)
    setDragId(null)
    if (id) moveTo(id, due)
  }

  return (
    <div className="flex flex-col gap-4">
      {columns.overdue.length > 0 && (
        <OverdueRail tasks={columns.overdue} onOpenTask={onOpenTask} onMove={moveTo} week={week} />
      )}

      {/* horizontal scroll on the phone, full grid on the desktop */}
      <div className="-mx-4 overflow-x-auto px-4 pb-2 lg:mx-0 lg:overflow-visible lg:px-0">
        <div className="flex min-w-max gap-3 lg:grid lg:min-w-0 lg:grid-cols-6">
          {week.map((date) => {
            const tasks = columns.byDay.get(date) ?? []
            const isToday = date === t
            const over = tasks.length > DAY_CAPACITY
            return (
              <Column
                key={date}
                title={dayName(date)}
                meta={shortDate(date)}
                count={tasks.length}
                highlight={isToday}
                warn={over}
                dropActive={overCol === date}
                onDragOver={(e) => {
                  e.preventDefault()
                  setOverCol(date)
                }}
                onDragLeave={() => setOverCol((c) => (c === date ? null : c))}
                onDrop={(e) => handleDrop(e, date)}
              >
                {tasks.map((task) => (
                  <BoardCard
                    key={task.id}
                    task={task}
                    week={week}
                    onOpen={onOpenTask}
                    onMove={moveTo}
                    onDragStart={() => setDragId(task.id)}
                    onDragEnd={() => setDragId(null)}
                  />
                ))}
                {tasks.length === 0 && <EmptyDrop />}
              </Column>
            )
          })}

          <Column
            title="ללא יעד"
            meta="מלאי"
            count={columns.unscheduled.length}
            icon={Inbox}
            dropActive={overCol === "none"}
            onDragOver={(e) => {
              e.preventDefault()
              setOverCol("none")
            }}
            onDragLeave={() => setOverCol((c) => (c === "none" ? null : c))}
            onDrop={(e) => handleDrop(e, null)}
          >
            {columns.unscheduled.map((task) => (
              <BoardCard
                key={task.id}
                task={task}
                week={week}
                onOpen={onOpenTask}
                onMove={moveTo}
                onDragStart={() => setDragId(task.id)}
                onDragEnd={() => setDragId(null)}
              />
            ))}
            {columns.unscheduled.length === 0 && <EmptyDrop />}
          </Column>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ column */

function Column({
  title,
  meta,
  count,
  children,
  highlight = false,
  warn = false,
  dropActive = false,
  icon: Icon,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  title: string
  meta: string
  count: number
  children: React.ReactNode
  highlight?: boolean
  warn?: boolean
  dropActive?: boolean
  icon?: React.ComponentType<{ className?: string }>
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
}) {
  return (
    <section
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "flex w-[78vw] shrink-0 flex-col rounded-xl border bg-muted/30 sm:w-64 lg:w-auto",
        highlight ? "border-primary/50 bg-primary/5" : "border-border",
        dropActive && "border-primary bg-primary/10 ring-2 ring-primary/25",
      )}
    >
      <header
        className={cn(
          "flex items-center gap-2 rounded-t-xl border-b px-3 py-2",
          highlight ? "border-primary/30 bg-primary/10" : "border-border",
        )}
      >
        {Icon && <Icon className="size-3.5 shrink-0 text-muted-foreground" />}
        <span className="text-[13px] font-bold text-foreground">{title}</span>
        <span className="nums text-[11px] text-muted-foreground">{meta}</span>
        <span
          className={cn(
            "nums ms-auto rounded px-1.5 py-0.5 text-[11px] font-bold",
            warn ? "bg-warn text-warn-foreground" : "bg-card text-muted-foreground",
          )}
          title={warn ? "עומס גבוה ליום אחד" : undefined}
        >
          {count}
        </span>
      </header>

      <div className="flex min-h-24 flex-col gap-2 p-2">{children}</div>
    </section>
  )
}

function EmptyDrop() {
  return (
    <p className="rounded-lg border border-dashed border-border py-5 text-center text-[11px] text-muted-foreground">
      גרור לכאן
    </p>
  )
}

/* -------------------------------------------------------------- board card */

function BoardCard({
  task,
  week,
  onOpen,
  onMove,
  onDragStart,
  onDragEnd,
}: {
  task: Task
  week: ISODate[]
  onOpen: (id: string) => void
  onMove: (id: string, due: ISODate | null) => void
  onDragStart: () => void
  onDragEnd: () => void
}) {
  const { state } = useStore()

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id)
        e.dataTransfer.effectAllowed = "move"
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      className="group relative overflow-hidden rounded-lg border border-border bg-card"
    >
      <PriorityBar priority={task.priority} />
      <div className="flex items-start gap-1 p-2 ps-3">
        <button
          type="button"
          onClick={() => onOpen(task.id)}
          className="min-w-0 flex-1 text-start"
        >
          <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-foreground">
            {task.title}
          </p>
          <p className="mt-1 truncate text-[11px] text-muted-foreground">
            {personName(state, task.assigneeId)}
            {task.areaId ? ` • ${areaName(state, task.areaId)}` : ""}
          </p>
        </button>

        <span className="hidden shrink-0 cursor-grab pt-0.5 text-muted-foreground/50 group-hover:block lg:block">
          <GripVertical className="size-3.5" />
        </span>
      </div>

      {/* keyboard + touch fallback: drag-and-drop is not reachable on a phone */}
      <div className="flex items-center gap-1 border-t border-border px-2 py-1.5">
        <CalendarPlus className="size-3 shrink-0 text-muted-foreground" />
        <label className="sr-only" htmlFor={`move-${task.id}`}>
          העבר את {task.title} ליום אחר
        </label>
        <select
          id={`move-${task.id}`}
          value={task.dueDate ?? ""}
          onChange={(e) => onMove(task.id, e.target.value ? (e.target.value as ISODate) : null)}
          className="nums w-full rounded border-0 bg-transparent py-0.5 text-[11px] font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">ללא יעד</option>
          {week.map((d) => (
            <option key={d} value={d}>
              {dayName(d)} {shortDate(d)}
            </option>
          ))}
        </select>
      </div>
    </article>
  )
}

/* ----------------------------------------------------------- overdue rail */

function OverdueRail({
  tasks,
  week,
  onOpenTask,
  onMove,
}: {
  tasks: Task[]
  week: ISODate[]
  onOpenTask: (id: string) => void
  onMove: (id: string, due: ISODate | null) => void
}) {
  return (
    <section className="rounded-xl border border-crit/40 bg-crit/5 p-3">
      <header className="flex items-center gap-2 pb-2">
        <span className="text-[13px] font-bold text-crit">גרר מהשבוע שעבר</span>
        <span className="nums rounded bg-crit px-1.5 py-0.5 text-[11px] font-bold text-crit-foreground">
          {tasks.length}
        </span>
        <span className="text-[11px] text-muted-foreground">
          חייב תאריך חדש – אחרת יישאר באיחור
        </span>
      </header>
      <ul className="flex gap-2 overflow-x-auto pb-1">
        {tasks.map((task) => (
          <li key={task.id} className="w-56 shrink-0">
            <BoardCard
              task={task}
              week={week}
              onOpen={onOpenTask}
              onMove={onMove}
              onDragStart={() => {}}
              onDragEnd={() => {}}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
