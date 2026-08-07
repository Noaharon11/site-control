"use client"

import * as React from "react"
import Link from "next/link"
import { AlertTriangle, CalendarClock, Clock, Footprints, Plus } from "lucide-react"
import { useStore } from "@/lib/store"
import { greeting, longDate, today } from "@/lib/dates"
import { criticalTasks, currentTour, overdueTasks, tourStats, waitingTasks } from "@/lib/selectors"
import { PageBody, PageHeader } from "@/components/common/page-header"
import { SectionTitle } from "@/components/common/chips"
import { KpiStrip } from "@/components/today/kpi-strip"
import { DailyTargets } from "@/components/today/daily-targets"
import { InsightsPanel, RecommendationsCard } from "@/components/today/insights-panel"
import { ActivityFeed, RecurringIssues, SiteToday } from "@/components/today/site-today"
import { TaskCard } from "@/components/tasks/task-card"
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet"
import { NewTaskSheet } from "@/components/tasks/new-task-sheet"
import { Button } from "@/components/ui/button"
import { ConnectionPill } from "@/components/shell/connection-pill"

export default function TodayPage() {
  const { state, hydrated } = useStore()
  const [taskId, setTaskId] = React.useState<string | null>(null)
  const [newTask, setNewTask] = React.useState(false)

  const tour = currentTour(state)
  const stats = tourStats(state, tour)
  const critical = criticalTasks(state)
  const overdue = overdueTasks(state)
  const waiting = waitingTasks(state)
  const tourDone = tour?.status === "done"

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-baseline gap-2">
            {greeting()}
            <span className="text-sm font-medium text-muted-foreground lg:text-base">
              {state.project.name}
            </span>
          </span>
        }
        subtitle={longDate(today())}
        actions={
          <>
            <div className="hidden lg:block">
              <ConnectionPill />
            </div>
            <Button size="sm" variant="outline" className="h-9" onClick={() => setNewTask(true)}>
              <Plus data-icon="inline-start" />
              משימה
            </Button>
          </>
        }
      />

      <PageBody className="flex flex-col gap-6">
        {/* tour banner */}
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Footprints className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground">
              {tourDone
                ? "סיור הבוקר הושלם"
                : tour?.status === "active"
                  ? "סיור בוקר בעיצומו"
                  : "סיור הבוקר טרם התחיל"}
            </p>
            <p className="nums mt-0.5 text-xs text-muted-foreground">
              {tourDone
                ? `${stats.scanned} אזורים נסרקו • ${stats.tasks} משימות חדשות • ${stats.blockers} חסמים • ${stats.decisions} סיכומים`
                : tour?.status === "active"
                  ? `${stats.scanned} מתוך ${stats.total} אזורים נסרקו`
                  : `${state.areas.filter((a) => a.active !== false).length} אזורים במסלול • כשעה הליכה`}
            </p>
          </div>
          <Button
            className="h-11 shrink-0"
            variant={tourDone ? "outline" : "default"}
            nativeButton={false}
            render={<Link href="/tour" />}
          >
            <Footprints data-icon="inline-start" />
            {tourDone ? "סיכום הסיור" : tour?.status === "active" ? "המשך סיור" : "התחל סיור"}
          </Button>
        </div>

        <DailyTargets onOpenTask={setTaskId} />

        <KpiStrip />

        <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <div className="flex flex-col gap-6">
            <section aria-labelledby="attention-heading">
              <SectionTitle count={critical.length} tone="crit">
                <span id="attention-heading">דורש את תשומת הלב שלי</span>
              </SectionTitle>
              {critical.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border bg-card p-4 text-center text-xs text-muted-foreground">
                  אין כרגע פריטים קריטיים.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {critical.map((t) => (
                    <li key={t.id}>
                      <TaskCard task={t} onOpen={setTaskId} />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <SiteToday />

            <section aria-labelledby="overdue-heading">
              <SectionTitle
                count={overdue.length}
                tone="crit"
                action={
                  <Link
                    href="/tasks?tab=overdue"
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    לכל המשימות
                  </Link>
                }
              >
                <span id="overdue-heading" className="inline-flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5 text-crit" />
                  משימות באיחור
                </span>
              </SectionTitle>
              {overdue.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border bg-card p-4 text-center text-xs text-muted-foreground">
                  אין משימות באיחור.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {overdue.slice(0, 5).map((t) => (
                    <li key={t.id}>
                      <TaskCard task={t} onOpen={setTaskId} compact />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="waiting-heading">
              <SectionTitle count={waiting.length} tone="warn">
                <span id="waiting-heading" className="inline-flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  מחכה לאחרים
                </span>
              </SectionTitle>
              {waiting.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border bg-card p-4 text-center text-xs text-muted-foreground">
                  אין משימות שממתינות לגורם חיצוני.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {waiting.slice(0, 5).map((t) => (
                    <li key={t.id}>
                      <TaskCard task={t} onOpen={setTaskId} compact />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="flex flex-col gap-6">
            <RecommendationsCard onOpenTask={setTaskId} />
            <InsightsPanel />
            <RecurringIssues />
            <ActivityFeed />

            <Link
              href="/weekly"
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/40"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                <CalendarClock className="size-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">תכנון שבועי</span>
                <span className="block text-[11px] text-muted-foreground">
                  הלוח השבועי – יעדים לקבלנים, לצוות ולי
                </span>
              </span>
            </Link>
          </div>
        </div>
      </PageBody>

      <TaskDetailSheet taskId={taskId} onOpenChange={(v) => !v && setTaskId(null)} />
      <NewTaskSheet open={newTask} onOpenChange={setNewTask} />
    </>
  )
}
