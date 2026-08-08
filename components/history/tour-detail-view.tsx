"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowRight,
  Ban,
  Camera,
  Check,
  Footprints,
  Handshake,
  Users,
  Wrench,
} from "lucide-react"
import { useStore } from "@/lib/store"
import { areaName, personName, tourStats } from "@/lib/selectors"
import {
  durationLabel,
  heDate,
  longDate,
  minutesBetween,
  parseISO,
} from "@/lib/dates"
import { PageBody, PageHeader } from "@/components/common/page-header"
import { SectionTitle } from "@/components/common/chips"
import { Button } from "@/components/ui/button"
import { StatusChip } from "@/components/common/chips"
import type { AreaVisit, Tour } from "@/lib/types"

/* ---------------------------------------------------------------- helpers */

function StatCard({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>
  value: number
  label: string
  tone?: "crit" | "warn" | "ok"
}) {
  const toneClass =
    tone === "crit"
      ? "border-crit/30 bg-crit/10 text-crit"
      : tone === "warn"
        ? "border-warn/30 bg-warn/10 text-warn-foreground"
        : tone === "ok"
          ? "border-ok/30 bg-ok/10 text-ok"
          : "border-border bg-muted/40 text-foreground"

  return (
    <div className={`flex flex-col gap-1 rounded-xl border p-3 ${toneClass}`}>
      <Icon className="size-4 opacity-70" />
      <span className="nums text-2xl font-bold leading-none">{value}</span>
      <span className="text-[11px] font-medium leading-tight">{label}</span>
    </div>
  )
}

/* -------------------------------------------------------- area section ---- */

function AreaSection({
  visit,
  tour,
}: {
  visit: AreaVisit
  tour: Tour
}) {
  const { state } = useStore()

  const name = areaName(state, visit.areaId)
  const teams = visit.teamIds.map((id) => ({
    id,
    name: state.people.find((p) => p.id === id)?.name ?? id,
    trade: state.people.find((p) => p.id === id)?.trade,
  }))
  const observations = visit.observationIds
    .map((id) => state.observations.find((o) => o.id === id))
    .filter(Boolean)
  const blockers = visit.blockerIds
    .map((id) => state.blockers.find((b) => b.id === id))
    .filter(Boolean)
  const defects = visit.defectIds
    .map((id) => state.defects.find((d) => d.id === id))
    .filter(Boolean)
  const decisions = visit.decisionIds
    .map((id) => state.decisions.find((d) => d.id === id))
    .filter(Boolean)
  const photos = visit.photoIds
    .map((id) => state.photos.find((p) => p.id === id))
    .filter(Boolean)

  // tasks: created during tour + updated during tour
  const tourTasks = visit.taskIds
    .map((id) => state.tasks.find((t) => t.id === id))
    .filter(Boolean)

  const isEmpty =
    visit.skipped ||
    (!teams.length &&
      !observations.length &&
      !blockers.length &&
      !defects.length &&
      !decisions.length &&
      !photos.length &&
      !tourTasks.length &&
      !visit.progressNote)

  if (isEmpty && !visit.visitedAt) return null

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      {/* area header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[14px] font-bold text-foreground">{name}</h3>
        {visit.skipped ? (
          <span className="rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            דולג
          </span>
        ) : visit.activeToday === false ? (
          <span className="rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            ללא פעילות
          </span>
        ) : visit.activeToday === true ? (
          <span className="rounded bg-ok/15 px-2 py-0.5 text-[11px] font-medium text-ok">
            פעיל
          </span>
        ) : null}
      </div>

      {visit.skipped ? (
        <p className="text-[13px] text-muted-foreground">האזור דולג בסיור זה</p>
      ) : (
        <>
          {/* teams */}
          {teams.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                פעילות
              </p>
              <ul className="flex flex-col gap-1">
                {teams.map((t) => (
                  <li key={t.id} className="text-[13px] text-foreground">
                    {t.name}
                    {t.trade && <span className="text-muted-foreground"> – {t.trade}</span>}
                    {visit.workersCount != null && (
                      <span className="text-muted-foreground"> • {visit.workersCount} עובדים</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* progress */}
          {(visit.progressNote || visit.progressTags.length > 0) && (
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                התקדמות
              </p>
              {visit.progressTags.length > 0 && (
                <div className="mb-1 flex flex-wrap gap-1">
                  {visit.progressTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {visit.progressNote && (
                <p className="text-[13px] text-foreground">{visit.progressNote}</p>
              )}
            </div>
          )}

          {/* observations */}
          {observations.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                תצפיות
              </p>
              <ul className="flex flex-col gap-1">
                {observations.map(
                  (o) =>
                    o && (
                      <li key={o.id} className="text-[13px] leading-snug text-foreground">
                        "{o.text}"
                      </li>
                    ),
                )}
              </ul>
            </div>
          )}

          {/* blockers */}
          {blockers.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-crit">
                חסמים
              </p>
              <ul className="flex flex-col gap-1">
                {blockers.map(
                  (b) =>
                    b && (
                      <li
                        key={b.id}
                        className="rounded-md bg-crit/8 px-2 py-1.5 text-[13px] leading-snug text-foreground"
                      >
                        {b.text}
                      </li>
                    ),
                )}
              </ul>
            </div>
          )}

          {/* defects */}
          {defects.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-warn-foreground">
                ליקויים
              </p>
              <ul className="flex flex-col gap-1">
                {defects.map(
                  (d) =>
                    d && (
                      <li
                        key={d.id}
                        className="rounded-md bg-warn/8 px-2 py-1.5 text-[13px] leading-snug text-foreground"
                      >
                        {d.title}
                      </li>
                    ),
                )}
              </ul>
            </div>
          )}

          {/* tasks */}
          {tourTasks.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                משימות
              </p>
              <ul className="flex flex-col gap-2">
                {tourTasks.map(
                  (task) =>
                    task && (
                      <li
                        key={task.id}
                        className="flex items-start justify-between gap-2 rounded-md border border-border bg-muted/30 px-2 py-1.5"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[13px] leading-snug text-foreground">
                            {task.title}
                          </span>
                          {/* show events that occurred on the tour date */}
                          {task.history
                            .filter((ev) => ev.date === tour.date)
                            .map((ev, i) => (
                              <span
                                key={i}
                                className="text-[11px] text-muted-foreground"
                              >
                                {ev.text}
                                {ev.time && ` • ${ev.time}`}
                              </span>
                            ))}
                        </div>
                        <StatusChip status={task.status} withIcon={false} />
                      </li>
                    ),
                )}
              </ul>
            </div>
          )}

          {/* decisions */}
          {decisions.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                החלטות / סיכומים
              </p>
              <ul className="flex flex-col gap-2">
                {decisions.map(
                  (d) =>
                    d && (
                      <li
                        key={d.id}
                        className="flex flex-col gap-0.5 rounded-md border border-border bg-muted/30 px-2 py-1.5"
                      >
                        <span className="text-[13px] leading-snug text-foreground">
                          {d.commitment}
                        </span>
                        {d.dueDate && (
                          <span className="nums text-[11px] text-muted-foreground">
                            יעד: {heDate(d.dueDate)}
                          </span>
                        )}
                      </li>
                    ),
                )}
              </ul>
            </div>
          )}

          {/* photos */}
          {photos.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                תמונות
              </p>
              <div className="flex flex-wrap gap-2">
                {photos.map(
                  (ph) =>
                    ph && (
                      <div
                        key={ph.id}
                        className="flex flex-col gap-1"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={ph.url}
                          alt={ph.caption || "תמונה מהסיור"}
                          className="h-20 w-20 rounded-md object-cover border border-border"
                        />
                        {ph.caption && (
                          <span className="max-w-[80px] truncate text-[10px] text-muted-foreground">
                            {ph.caption}
                          </span>
                        )}
                      </div>
                    ),
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ----------------------------------------------------------- main view ---- */

export function TourDetailView({ tourId }: { tourId: string }) {
  const { state, hydrated } = useStore()

  if (!hydrated) return null

  const tour = state.tours.find((t) => t.id === tourId)

  if (!tour) {
    return (
      <>
        <PageHeader title="סיור לא נמצא" />
        <PageBody>
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-muted-foreground">הסיור המבוקש לא נמצא.</p>
            <Button variant="outline" nativeButton={false} render={<Link href="/history" />}>
              <ArrowRight data-icon="inline-start" />
              חזרה להיסטוריה
            </Button>
          </div>
        </PageBody>
      </>
    )
  }

  const stats = tourStats(state, tour)
  const dur = durationLabel(minutesBetween(tour.startedAt, tour.endedAt))

  // Collect top priorities (task ids or free text priority ids)
  const topPriorityTargets = state.dayTargets.filter(
    (dt) => dt.date === tour.date,
  )

  // Areas that have any activity
  const visitedAreas = tour.routeAreaIds
    .map((id) => tour.visits[id])
    .filter((v): v is AreaVisit => Boolean(v) && Boolean(v.visitedAt))

  return (
    <>
      <PageHeader
        title={`סיור בוקר — ${heDate(tour.date)}`}
        subtitle={longDate(tour.date)}
        actions={
          <Button variant="outline" size="sm" className="h-9" nativeButton={false} render={<Link href="/history" />}>
            <ArrowRight data-icon="inline-start" />
            היסטוריה
          </Button>
        }
      />

      <PageBody className="flex flex-col gap-6">
        {/* tour meta */}
        <div className="rounded-xl border border-border bg-primary p-4 text-primary-foreground">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Footprints className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold">סיור בוקר הושלם</p>
              <p className="nums text-xs text-primary-foreground/70">
                {tour.startedAt}
                {tour.endedAt ? `–${tour.endedAt}` : ""}
                {dur ? ` • ${dur}` : ""}
                {" • "}
                {stats.scanned} מתוך {stats.total} אזורים
              </p>
            </div>
          </div>

          {/* summary stats grid */}
          <dl className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
            <SummaryMini icon={Footprints} label="אזורים" value={stats.scanned} />
            <SummaryMini icon={Users} label="צוותות" value={stats.teams} />
            <SummaryMini icon={Wrench} label="משימות" value={stats.tasks} />
            <SummaryMini icon={Ban} label="חסמים" value={stats.blockers} />
            <SummaryMini icon={Handshake} label="סיכומים" value={stats.decisions} />
            <SummaryMini icon={Camera} label="תמונות" value={stats.photos} />
          </dl>
        </div>

        {/* stats cards */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCard icon={Footprints} value={stats.scanned} label="אזורים שנסרקו" tone="ok" />
          <StatCard icon={Wrench} value={stats.tasks} label="משימות שנוצרו" />
          {stats.blockers > 0 && (
            <StatCard icon={Ban} value={stats.blockers} label="חסמים" tone="crit" />
          )}
          {stats.defects > 0 && (
            <StatCard icon={Ban} value={stats.defects} label="ליקויים" tone="warn" />
          )}
        </div>

        {/* top priorities */}
        {topPriorityTargets.length > 0 && (
          <section>
            <SectionTitle count={topPriorityTargets.length}>3 יעדי היום שנבחרו</SectionTitle>
            <ul className="flex flex-col gap-2">
              {topPriorityTargets.map((dt, i) => (
                <li
                  key={dt.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-[14px] text-foreground">{dt.text}</span>
                  {dt.done && <Check className="size-4 text-ok" />}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* per-area breakdown */}
        {visitedAreas.length > 0 && (
          <section>
            <SectionTitle count={visitedAreas.length}>פעילות לפי אזור</SectionTitle>
            <div className="flex flex-col gap-3">
              {visitedAreas.map((visit) => (
                <AreaSection key={visit.areaId} visit={visit} tour={tour} />
              ))}
            </div>
          </section>
        )}
      </PageBody>
    </>
  )
}

function SummaryMini({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg bg-primary-foreground/10 p-2">
      <Icon className="size-4 text-primary-foreground/70" />
      <span className="nums text-lg font-bold leading-none text-primary-foreground">{value}</span>
      <span className="text-[10px] text-primary-foreground/60">{label}</span>
    </div>
  )
}
