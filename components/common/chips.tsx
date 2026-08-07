"use client"

import * as React from "react"
import { AlertTriangle, CircleDot, Clock, Hand, Loader2, Check, CloudOff } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  HEALTH_LABEL,
  PRIORITY_LABEL,
  STATUS_LABEL,
  type AreaHealth,
  type Priority,
  type TaskStatus,
} from "@/lib/types"

/* ------------------------------------------------------------ status chip */

const STATUS_STYLE: Record<TaskStatus, string> = {
  new: "bg-info-soft text-info border-info/25",
  open: "bg-secondary text-secondary-foreground border-border",
  in_progress: "bg-info-soft text-info border-info/25",
  waiting: "bg-warn-soft text-warn-foreground border-warn/30",
  blocked: "bg-crit-soft text-crit border-crit/25",
  done: "bg-ok-soft text-ok border-ok/25",
}

const STATUS_ICON: Record<TaskStatus, React.ComponentType<{ className?: string }>> = {
  new: CircleDot,
  open: CircleDot,
  in_progress: Loader2,
  waiting: Clock,
  blocked: Hand,
  done: Check,
}

export function StatusChip({
  status,
  className,
  withIcon = true,
}: {
  status: TaskStatus
  className?: string
  withIcon?: boolean
}) {
  const Icon = STATUS_ICON[status]
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-semibold leading-4",
        STATUS_STYLE[status],
        className,
      )}
    >
      {withIcon && <Icon className="size-3" />}
      {STATUS_LABEL[status]}
    </span>
  )
}

/* ---------------------------------------------------------- priority chip */

const PRIORITY_STYLE: Record<Priority, string> = {
  critical: "bg-crit text-crit-foreground",
  high: "bg-warn text-warn-foreground",
  normal: "bg-secondary text-secondary-foreground",
  low: "bg-muted text-muted-foreground",
}

export function PriorityChip({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-bold leading-4",
        PRIORITY_STYLE[priority],
        className,
      )}
    >
      {priority === "critical" && <AlertTriangle className="size-3" />}
      {PRIORITY_LABEL[priority]}
    </span>
  )
}

/** thin colour bar used on the start edge of task cards */
export function PriorityBar({ priority }: { priority: Priority }) {
  const color =
    priority === "critical"
      ? "bg-crit"
      : priority === "high"
        ? "bg-warn"
        : priority === "normal"
          ? "bg-info/50"
          : "bg-border"
  return <span className={cn("absolute inset-y-0 start-0 w-1", color)} aria-hidden />
}

/* ------------------------------------------------------------ health dot */

export const HEALTH_BG: Record<AreaHealth, string> = {
  ok: "bg-ok",
  warn: "bg-warn",
  crit: "bg-crit",
  idle: "bg-idle",
}

export const HEALTH_SOFT: Record<AreaHealth, string> = {
  ok: "bg-ok-soft text-ok border-ok/25",
  warn: "bg-warn-soft text-warn-foreground border-warn/30",
  crit: "bg-crit-soft text-crit border-crit/25",
  idle: "bg-idle-soft text-muted-foreground border-border",
}

export function HealthDot({ health, className }: { health: AreaHealth; className?: string }) {
  return (
    <span
      className={cn("inline-block size-2 shrink-0 rounded-full", HEALTH_BG[health], className)}
      aria-label={HEALTH_LABEL[health]}
    />
  )
}

export function HealthChip({ health, className }: { health: AreaHealth; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded border px-1.5 py-0.5 text-[11px] font-semibold leading-4",
        HEALTH_SOFT[health],
        className,
      )}
    >
      <HealthDot health={health} />
      {HEALTH_LABEL[health]}
    </span>
  )
}

/* --------------------------------------------------------------- age chip */

export function AgeChip({ days, className }: { days: number; className?: string }) {
  if (days <= 0) return <span className={cn("text-[11px] text-muted-foreground", className)}>נפתח היום</span>
  const hot = days >= 5
  return (
    <span
      className={cn(
        "nums inline-flex shrink-0 items-center gap-1 text-[11px] font-medium",
        hot ? "text-crit" : "text-muted-foreground",
        className,
      )}
    >
      <Clock className="size-3" />
      {days === 1 ? "פתוח יום" : `פתוח ${days} ימים`}
    </span>
  )
}

/* ------------------------------------------------------------ pending dot */

export function PendingChip({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded border border-warn/30 bg-warn-soft px-1.5 py-0.5 text-[10px] font-semibold text-warn-foreground",
        className,
      )}
    >
      <CloudOff className="size-3" />
      במכשיר
    </span>
  )
}

/* ------------------------------------------------- selectable input chip */

/**
 * Thumb-sized multi-select chip used all over the tour capture flow.
 * Min height 44px so it stays tappable with work gloves on.
 */
export function SelectChip({
  selected,
  onClick,
  children,
  tone = "default",
  className,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
  tone?: "default" | "crit" | "warn"
  className?: string
}) {
  const active =
    tone === "crit"
      ? "border-crit bg-crit text-crit-foreground"
      : tone === "warn"
        ? "border-warn bg-warn text-warn-foreground"
        : "border-primary bg-primary text-primary-foreground"

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3.5 text-[13px] font-semibold transition-colors",
        selected
          ? active
          : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted",
        className,
      )}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------- section heading */

export function SectionTitle({
  children,
  count,
  tone = "default",
  action,
  className,
}: {
  children: React.ReactNode
  count?: number
  tone?: "default" | "crit" | "warn"
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-end justify-between gap-3 pb-2.5", className)}>
      <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-muted-foreground">
        <span
          className={cn(
            "h-3.5 w-1 rounded-full",
            tone === "crit" ? "bg-crit" : tone === "warn" ? "bg-warn" : "bg-primary/40",
          )}
        />
        {children}
        {count !== undefined && (
          <span className="nums rounded bg-secondary px-1.5 py-0.5 text-[11px] font-bold text-secondary-foreground">
            {count}
          </span>
        )}
      </h2>
      {action}
    </div>
  )
}
