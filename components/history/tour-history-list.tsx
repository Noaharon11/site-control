"use client"

import * as React from "react"
import Link from "next/link"
import {
  Ban,
  Camera,
  ChevronLeft,
  Clock,
  Footprints,
  Handshake,
  History,
  Search,
  Users,
  Wrench,
} from "lucide-react"
import { useStore } from "@/lib/store"
import { tourStats } from "@/lib/selectors"
import { durationLabel, heDate, minutesBetween, parseISO } from "@/lib/dates"
import { PageBody, PageHeader } from "@/components/common/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Tour } from "@/lib/types"

/* ---------------------------------------------------------------- helpers */

function monthLabel(iso: string): string {
  const d = parseISO(iso)
  const MONTHS = [
    "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
    "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
  ]
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/* -------------------------------------------------------- tour card ------- */

function TourCard({
  tour,
}: {
  tour: Tour
}) {
  const { state } = useStore()
  const stats = tourStats(state, tour)
  const dur = durationLabel(minutesBetween(tour.startedAt, tour.endedAt))

  return (
    <Link
      href={`/history/${tour.id}`}
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-card/80 active:bg-muted"
    >
      {/* header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="nums text-[15px] font-bold text-foreground">{heDate(tour.date)}</span>
          <span className="text-[13px] text-muted-foreground">סיור בוקר</span>
        </div>
        <div className="flex items-center gap-1.5">
          {dur && (
            <span className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
              <Clock className="size-3" />
              {dur}
            </span>
          )}
          <ChevronLeft className="size-4 text-muted-foreground" />
        </div>
      </div>

      {/* time range */}
      {tour.startedAt && (
        <p className="nums text-[12px] text-muted-foreground">
          {tour.startedAt}
          {tour.endedAt ? `–${tour.endedAt}` : ""}
        </p>
      )}

      {/* stats row */}
      <dl className="flex flex-wrap gap-x-4 gap-y-1.5">
        <StatPill icon={Footprints} value={stats.scanned} label="אזורים" />
        {stats.teams > 0 && <StatPill icon={Users} value={stats.teams} label="צוותות" />}
        {stats.tasks > 0 && <StatPill icon={Wrench} value={stats.tasks} label="משימות" />}
        {stats.blockers > 0 && <StatPill icon={Ban} value={stats.blockers} label="חסמים" tone="crit" />}
        {stats.defects > 0 && <StatPill icon={Ban} value={stats.defects} label="ליקויים" tone="warn" />}
        {stats.decisions > 0 && <StatPill icon={Handshake} value={stats.decisions} label="סיכומים" />}
        {stats.photos > 0 && <StatPill icon={Camera} value={stats.photos} label="תמונות" />}
      </dl>
    </Link>
  )
}

function StatPill({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>
  value: number
  label: string
  tone?: "crit" | "warn"
}) {
  return (
    <dd
      className={`flex items-center gap-1 text-[12px] font-medium ${
        tone === "crit"
          ? "text-crit"
          : tone === "warn"
            ? "text-warn-foreground"
            : "text-muted-foreground"
      }`}
    >
      <Icon className="size-3.5 shrink-0" />
      <span className="nums">{value}</span>
      <span>{label}</span>
    </dd>
  )
}

/* -------------------------------------------------------- empty state ----- */

function EmptyState({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 py-12 text-center">
      <History className="size-10 text-muted-foreground/40" />
      <p className="text-[15px] font-bold text-foreground">
        {hasAny ? "לא נמצאו סיורים לחיפוש זה" : "עדיין אין סיורים קודמים"}
      </p>
      <p className="max-w-xs text-[13px] text-muted-foreground text-pretty">
        {hasAny
          ? "נסה לשנות את מונחי החיפוש או הסנן"
          : "סיורים שהושלמו יישמרו כאן אוטומטית."}
      </p>
    </div>
  )
}

/* -------------------------------------------------------- main component -- */

export function TourHistoryList() {
  const { state, hydrated } = useStore()
  const [search, setSearch] = React.useState("")
  const [monthFilter, setMonthFilter] = React.useState("")

  const completedTours = React.useMemo(
    () =>
      state.tours
        .filter((t) => t.status === "done")
        .sort((a, b) => b.date.localeCompare(a.date)),
    [state.tours],
  )

  const filtered = React.useMemo(() => {
    let result = completedTours

    if (monthFilter) {
      result = result.filter((t) => t.date.startsWith(monthFilter))
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter((tour) => {
        if (heDate(tour.date).includes(q)) return true
        if (tour.date.includes(q)) return true

        const areaNames = tour.routeAreaIds
          .map((id) => state.areas.find((a) => a.id === id)?.name ?? "")
          .join(" ")
          .toLowerCase()
        if (areaNames.includes(q)) return true

        const teamIds = new Set<string>()
        Object.values(tour.visits).forEach((v) => v.teamIds.forEach((id) => teamIds.add(id)))
        const teamNames = [...teamIds]
          .map((id) => state.people.find((p) => p.id === id)?.name ?? "")
          .join(" ")
          .toLowerCase()
        if (teamNames.includes(q)) return true

        const obsIds = Object.values(tour.visits).flatMap((v) => v.observationIds)
        const obsText = obsIds
          .map((id) => state.observations.find((o) => o.id === id)?.text ?? "")
          .join(" ")
          .toLowerCase()
        if (obsText.includes(q)) return true

        const taskIds = Object.values(tour.visits).flatMap((v) => v.taskIds)
        const taskTitles = taskIds
          .map((id) => state.tasks.find((t) => t.id === id)?.title ?? "")
          .join(" ")
          .toLowerCase()
        if (taskTitles.includes(q)) return true

        return false
      })
    }

    return result
  }, [completedTours, search, monthFilter, state])

  if (!hydrated) return null

  return (
    <>
      <PageHeader
        title="היסטוריית סיורים"
        subtitle={`${completedTours.length} סיורים שהושלמו`}
      />
      <PageBody className="flex flex-col gap-4">
        {/* filter bar */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש לפי אזור, קבלן, תצפית..."
              className="ps-9"
            />
          </div>
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>

        {/* results */}
        {filtered.length === 0 ? (
          <EmptyState hasAny={completedTours.length > 0} />
        ) : (
          <ul className="flex flex-col gap-3">
            {filtered.map((tour) => (
              <li key={tour.id}>
                <TourCard tour={tour} />
              </li>
            ))}
          </ul>
        )}
      </PageBody>
    </>
  )
}
