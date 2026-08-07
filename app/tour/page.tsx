"use client"

import * as React from "react"
import Link from "next/link"
import { Ban, ClipboardList, Footprints, ListChecks, Play, Wrench } from "lucide-react"
import { useStore } from "@/lib/store"
import type { Area } from "@/lib/types"
import { areaName, carriedOverTasks, openBlockers, tourStats } from "@/lib/selectors"
import { longDate, today } from "@/lib/dates"
import { PageBody, PageHeader } from "@/components/common/page-header"
import { AreaCapture } from "@/components/tour/area-capture"
import { RouteList } from "@/components/tour/route-list"
import { TourSummary } from "@/components/tour/tour-summary"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

type Mode = { kind: "route" } | { kind: "capture"; index: number } | { kind: "summary" }

export default function TourPage() {
  const { state, dispatch, hydrated } = useStore()
  const tour = state.tours.find((t) => t.date === today())
  const [mode, setMode] = React.useState<Mode>({ kind: "route" })

  const route = React.useMemo(
    () =>
      (tour?.routeAreaIds ?? [])
        .map((id) => state.areas.find((a) => a.id === id))
        .filter((a): a is Area => Boolean(a)),
    [tour?.routeAreaIds, state.areas],
  )

  if (!hydrated || !tour) return null

  const stats = tourStats(state, tour)

  /* --------------------------------------------------- capture (fullscreen) */
  if (mode.kind === "capture" && tour.status !== "planned") {
    const area = route[mode.index]
    if (area) {
      return (
        <main className="mx-auto w-full max-w-3xl lg:px-8 lg:py-6">
          <AreaCapture
            area={area}
            index={mode.index}
            total={route.length}
            onPrev={() => setMode({ kind: "capture", index: Math.max(0, mode.index - 1) })}
            onNext={() =>
              mode.index + 1 >= route.length
                ? setMode({ kind: "summary" })
                : setMode({ kind: "capture", index: mode.index + 1 })
            }
            onBackToRoute={() => setMode({ kind: "route" })}
          />
        </main>
      )
    }
  }

  /* ------------------------------------------------------ tour not started */
  if (tour.status === "planned") {
    const carried = carriedOverTasks(state)
    const blockers = openBlockers(state)

    return (
      <>
        <PageHeader title="סיור בוקר" subtitle={longDate(today())} />
        <PageBody className="flex flex-col gap-6">
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-[15px] font-bold text-foreground">
              {route.length} אזורים במסלול • כשעה הליכה
            </h2>
            <p className="pt-1 text-[13px] text-muted-foreground text-pretty">
              הפריטים הפתוחים נגררים מהסיורים הקודמים ויופיעו אוטומטית באזור הרלוונטי, כדי שלא תצטרך
              לזכור מה היה כאן אתמול.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-crit/25 bg-crit-soft/40 p-3">
                <p className="nums flex items-center gap-1.5 text-[13px] font-bold text-crit">
                  <Ban className="size-4" />
                  {blockers.length} חסמים פתוחים
                </p>
                <ul className="mt-2 flex flex-col gap-1">
                  {blockers.slice(0, 3).map((b) => (
                    <li key={b.id} className="text-[12px] leading-snug text-foreground text-pretty">
                      {areaName(state, b.areaId)} – {b.text}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-border bg-muted/50 p-3">
                <p className="nums flex items-center gap-1.5 text-[13px] font-bold text-foreground">
                  <Wrench className="size-4" />
                  {carried.length} משימות נגררות
                </p>
                <ul className="mt-2 flex flex-col gap-1">
                  {carried.slice(0, 3).map((t) => (
                    <li key={t.id} className="text-[12px] leading-snug text-foreground text-pretty">
                      {t.title}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <Button
              className="mt-4 h-12 w-full text-[15px]"
              onClick={() => {
                dispatch({ type: "startTour" })
                setMode({ kind: "capture", index: 0 })
              }}
            >
              <Play data-icon="inline-start" />
              התחל סיור
            </Button>
          </div>

          <section>
            <h2 className="pb-2 text-[13px] font-bold uppercase tracking-wide text-muted-foreground">
              המסלול הקבוע
            </h2>
            <RouteList
              tour={tour}
              onPick={(index) => {
                dispatch({ type: "startTour" })
                setMode({ kind: "capture", index })
              }}
            />
          </section>
        </PageBody>
      </>
    )
  }

  /* --------------------------------------------------------------- summary */
  if (mode.kind === "summary") {
    return (
      <>
        <PageHeader
          title="סיכום ויעדי היום"
          subtitle="הצעד האחרון בסיור: לקבוע מה חייב לקרות היום"
          actions={
            <Button variant="outline" size="sm" className="h-9" onClick={() => setMode({ kind: "route" })}>
              <ListChecks data-icon="inline-start" />
              המסלול
            </Button>
          }
        />
        <PageBody>
          <TourSummary tour={tour} />
        </PageBody>
      </>
    )
  }

  /* ------------------------------------------------------------ route view */
  const nextIndex = route.findIndex((a) => !tour.visits[a.id]?.visitedAt)
  const doneTour = tour.status === "done"

  return (
    <>
      <PageHeader
        title={doneTour ? "סיור הבוקר הושלם" : "סיור בוקר בעיצומו"}
        subtitle={`${stats.tasks} משימות • ${stats.blockers} חסמים • ${stats.decisions} סיכומים`}
        actions={
          <Button variant="outline" size="sm" className="h-9" onClick={() => setMode({ kind: "summary" })}>
            <ClipboardList data-icon="inline-start" />
            סיכום
          </Button>
        }
      />
      <PageBody className="flex flex-col gap-5">
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[13px] font-bold text-foreground">התקדמות הסיור</span>
            <span className="nums text-[13px] font-bold text-primary">
              {stats.scanned}/{stats.total}
            </span>
          </div>
          <Progress value={(stats.scanned / Math.max(1, stats.total)) * 100} className="h-2" />

          {!doneTour && nextIndex >= 0 ? (
            <Button
              className="mt-3 h-12 w-full text-[15px]"
              onClick={() => setMode({ kind: "capture", index: nextIndex })}
            >
              <Footprints data-icon="inline-start" />
              המשך אל {route[nextIndex].name}
            </Button>
          ) : (
            <Button
              className="mt-3 h-12 w-full text-[15px]"
              variant={doneTour ? "outline" : "default"}
              onClick={() => setMode({ kind: "summary" })}
            >
              <ClipboardList data-icon="inline-start" />
              {doneTour ? "צפה בסיכום הסיור" : "סיים סיור וקבע יעדים"}
            </Button>
          )}
        </div>

        <RouteList tour={tour} onPick={(index) => setMode({ kind: "capture", index })} />

        <Link href="/" className="text-center text-[13px] font-semibold text-primary hover:underline">
          חזרה למסך היום
        </Link>
      </PageBody>
    </>
  )
}
