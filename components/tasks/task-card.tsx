"use client"

import * as React from "react"
import { CalendarClock, MapPin, MoreVertical, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import { personName, taskAreaSummary } from "@/lib/selectors"
import { daysOpen, isOverdue, relativeDay } from "@/lib/dates"
import type { Task } from "@/lib/types"
import { AgeChip, PendingChip, PriorityBar, PriorityChip, StatusChip } from "@/components/common/chips"
import { TaskQuickMenu } from "./task-quick-menu"

export function TaskCard({
  task,
  onOpen,
  hideArea = false,
  compact = false,
  className,
}: {
  task: Task
  onOpen?: (id: string) => void
  hideArea?: boolean
  compact?: boolean
  className?: string
}) {
  const { state } = useStore()
  const overdue = isOverdue(task.dueDate) && task.status !== "done"
  const age = daysOpen(task.createdAt)

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-card transition-shadow",
        overdue ? "border-crit/35" : "border-border",
        onOpen && "hover:shadow-sm",
        className,
      )}
    >
      <PriorityBar priority={task.priority} />
      <div className={cn("flex items-start gap-2 ps-3.5", compact ? "p-2.5 ps-3.5" : "p-3 ps-4")}>
        <button
          type="button"
          onClick={onOpen ? () => onOpen(task.id) : undefined}
          className="min-w-0 flex-1 text-start"
          disabled={!onOpen}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusChip status={task.status} />
            {(task.priority === "critical" || task.priority === "high") && (
              <PriorityChip priority={task.priority} />
            )}
            {task.pending && <PendingChip />}
          </div>

          <h3
            className={cn(
              "mt-1.5 font-semibold leading-snug text-foreground text-pretty",
              compact ? "text-[13px]" : "text-sm",
              task.status === "done" && "line-through decoration-muted-foreground/50",
            )}
          >
            {task.title}
          </h3>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <User className="size-3 shrink-0" />
              {personName(state, task.assigneeId)}
            </span>
            {!hideArea && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3 shrink-0" />
                {taskAreaSummary(state, task)}
              </span>
            )}
            <span
              className={cn(
                "nums inline-flex items-center gap-1 font-medium",
                overdue && "text-crit font-bold",
              )}
            >
              <CalendarClock className="size-3 shrink-0" />
              {task.dueDate ? `יעד: ${relativeDay(task.dueDate)}` : "ללא יעד"}
            </span>
            {task.status !== "done" && <AgeChip days={age} />}
          </div>
        </button>

        <TaskQuickMenu
          task={task}
          trigger={
            <button
              type="button"
              className="-me-1 -mt-1 flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={`פעולות עבור ${task.title}`}
            >
              <MoreVertical className="size-4" />
            </button>
          }
        />
      </div>
    </article>
  )
}
