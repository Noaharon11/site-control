"use client"

import Link from "next/link"
import {
  Ban,
  Camera,
  CheckCircle2,
  Footprints,
  HardHat,
  MessageSquare,
  Repeat,
  Users,
  Wrench,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import { ACTIVITY_LABEL, BLOCKER_LABEL, type ActivityKind } from "@/lib/types"
import { activityToday, areaName, openBlockers, personName } from "@/lib/selectors"
import { daysOpen, today } from "@/lib/dates"
import { HealthDot, SectionTitle } from "@/components/common/chips"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Button } from "@/components/ui/button"

/* -------------------------------------------------- what's happening today */

export function SiteToday() {
  const { state } = useStore()
  const rows = activityToday(state)
  const tour = state.tours.find((t) => t.date === today())
  const tourNotStarted = tour?.status === "planned"

  return (
    <section aria-labelledby="site-today-heading">
      <SectionTitle count={rows.length}>
        <span id="site-today-heading">מה קורה באתר היום</span>
      </SectionTitle>

      {rows.length === 0 ? (
        <Empty className="rounded-lg border border-dashed border-border bg-card py-8">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Footprints />
            </EmptyMedia>
            <EmptyTitle className="text-sm">
              {tourNotStarted ? "הסיור עוד לא התחיל" : "אין דיווחי נוכחות"}
            </EmptyTitle>
            <EmptyDescription className="text-xs">
              נוכחות הקבלנים מתעדכנת בזמן הסיור. התחל סיור כדי למלא את התמונה.
            </EmptyDescription>
          </EmptyHeader>
          <Button size="sm" nativeButton={false} render={<Link href="/tour" />}>
            <Footprints data-icon="inline-start" />
            התחל סיור
          </Button>
        </Empty>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {rows.map((r) => (
            <li
              key={r.areaId}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-info-soft text-info">
                <HardHat className="size-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{r.areaName}</p>
                <p className="truncate text-[11px] text-muted-foreground">{r.teams.join(" • ")}</p>
              </div>
              {r.workers ? (
                <span className="nums flex shrink-0 items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-bold text-secondary-foreground">
                  <Users className="size-3" />
                  {r.workers}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/* --------------------------------------------------------- recurring issues */

export function RecurringIssues() {
  const { state } = useStore()
  const recurring = openBlockers(state)
    .filter((b) => (b.streak ?? 1) >= 2)
    .sort((a, b) => (b.streak ?? 0) - (a.streak ?? 0))

  if (recurring.length === 0) return null

  return (
    <section aria-labelledby="recurring-heading">
      <SectionTitle count={recurring.length} tone="warn">
        <span id="recurring-heading">בעיות חוזרות</span>
      </SectionTitle>
      <ul className="flex flex-col gap-2">
        {recurring.map((b) => (
          <li
            key={b.id}
            className="flex items-start gap-3 rounded-lg border border-warn/30 bg-warn-soft/50 p-3"
          >
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-warn text-warn-foreground">
              <Repeat className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold leading-snug text-foreground text-pretty">
                {areaName(state, b.areaId)} – {b.text}
              </p>
              <p className="nums mt-0.5 text-[11px] font-medium text-muted-foreground">
                {BLOCKER_LABEL[b.reason]} • מופיע {b.streak} סיורים ברציפות • פתוח{" "}
                {daysOpen(b.date)} ימים
              </p>
            </div>
            {b.taskId && (
              <Link
                href={`/tasks?task=${b.taskId}`}
                className="shrink-0 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-muted"
              >
                למשימה
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ------------------------------------------------------------ activity feed */

const ACT_ICON: Record<ActivityKind, React.ComponentType<{ className?: string }>> = {
  observation: MessageSquare,
  task_created: Wrench,
  task_status: CheckCircle2,
  decision: MessageSquare,
  blocker: Ban,
  defect: Wrench,
  photo: Camera,
  tour: Footprints,
  sync: CheckCircle2,
}

const ACT_TONE: Partial<Record<ActivityKind, string>> = {
  blocker: "bg-crit-soft text-crit",
  defect: "bg-warn-soft text-warn-foreground",
  task_created: "bg-info-soft text-info",
  decision: "bg-info-soft text-info",
  photo: "bg-secondary text-secondary-foreground",
  tour: "bg-primary/10 text-primary",
}

export function ActivityFeed({ limit = 8 }: { limit?: number }) {
  const { state } = useStore()
  const items = state.activity.filter((a) => a.date === today()).slice(0, limit)

  return (
    <section aria-labelledby="activity-heading">
      <SectionTitle
        action={
          <Link href="/history" className="text-xs font-semibold text-primary hover:underline">
            כל ההיסטוריה
          </Link>
        }
      >
        <span id="activity-heading">פעילות אחרונה</span>
      </SectionTitle>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-card p-4 text-center text-xs text-muted-foreground">
          עוד לא נרשמה פעילות היום.
        </p>
      ) : (
        <ol className="rounded-lg border border-border bg-card">
          {items.map((a, i) => {
            const Icon = ACT_ICON[a.kind]
            return (
              <li
                key={a.id}
                className={cn(
                  "flex items-start gap-3 px-3 py-2.5",
                  i > 0 && "border-t border-border",
                )}
              >
                <span className="nums w-9 shrink-0 pt-0.5 text-[11px] font-bold text-muted-foreground">
                  {a.time}
                </span>
                <span
                  className={cn(
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded",
                    ACT_TONE[a.kind] ?? "bg-secondary text-secondary-foreground",
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-snug text-foreground text-pretty">{a.text}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="font-semibold">{ACTIVITY_LABEL[a.kind]}</span>
                    {a.areaId && (
                      <>
                        <HealthDot health="idle" className="size-1" />
                        {areaName(state, a.areaId)}
                      </>
                    )}
                    {a.personId && (
                      <>
                        <HealthDot health="idle" className="size-1" />
                        {personName(state, a.personId)}
                      </>
                    )}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
