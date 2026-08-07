"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Ban, Camera, Check, Flag, Footprints, Handshake, Users, Wrench } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import type { Tour } from "@/lib/types"
import { areaName, suggestedPriorities, tourStats } from "@/lib/selectors"
import { SectionTitle } from "@/components/common/chips"
import { Button } from "@/components/ui/button"

export function TourSummary({ tour }: { tour: Tour }) {
  const { state, dispatch } = useStore()
  const router = useRouter()
  const stats = tourStats(state, tour)
  const suggestions = suggestedPriorities(state)
  const done = tour.status === "done"

  const [picked, setPicked] = React.useState<string[]>(() =>
    done ? tour.topPriorities : suggestions.slice(0, 3).map((s) => s.id),
  )

  function toggle(id: string) {
    setPicked((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? prev : [...prev, id],
    )
  }

  function finish() {
    const chosen = suggestions.filter((s) => picked.includes(s.id))
    dispatch({
      type: "setTargets",
      targets: chosen.map((c) => ({ text: c.text, taskId: c.taskId ?? null })),
    })
    dispatch({ type: "endTour", priorities: picked })
    router.push("/")
  }

  const activeAreas = tour.routeAreaIds.filter((id) => tour.visits[id]?.activeToday === true)
  const emptyAreas = tour.routeAreaIds.filter((id) => tour.visits[id]?.activeToday === false)

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* -------------------------------------------------------- headline */}
      <div className="rounded-xl border border-border bg-primary p-4 text-primary-foreground">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Footprints className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold">
              {done ? "סיור הבוקר הושלם" : "סיכום הסיור"}
            </p>
            <p className="nums text-xs text-primary-foreground/70">
              {tour.startedAt}
              {tour.endedAt ? `–${tour.endedAt}` : ""} • {stats.scanned} מתוך {stats.total} אזורים
            </p>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
          <SummaryStat icon={Users} label="אזורים פעילים" value={activeAreas.length} />
          <SummaryStat icon={Ban} label="חסמים" value={stats.blockers} tone="crit" />
          <SummaryStat icon={Wrench} label="משימות חדשות" value={stats.tasks} />
          <SummaryStat icon={Handshake} label="סיכומים" value={stats.decisions} />
          <SummaryStat icon={Camera} label="תמונות" value={stats.photos} />
        </dl>
      </div>

      {/* ------------------------------------------------- pick priorities */}
      <section>
        <SectionTitle count={picked.length}>
          {done ? "3 הדברים החשובים שנקבעו" : "בחר את 3 הדברים החשובים להיום"}
        </SectionTitle>
        <p className="pb-3 text-[13px] text-muted-foreground text-pretty">
          המערכת דירגה את מה שנרשם בסיור לפי דחיפות, גיל וחסמים חוזרים. אשר או שנה – זה מה שיופיע
          בראש מסך היום.
        </p>
        <ul className="flex flex-col gap-2">
          {suggestions.map((s) => {
            const on = picked.includes(s.id)
            const order = picked.indexOf(s.id)
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => !done && toggle(s.id)}
                  disabled={done}
                  aria-pressed={on}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border-2 p-3 text-start transition-colors",
                    on
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/30",
                    done && "cursor-default",
                  )}
                >
                  <span
                    className={cn(
                      "nums mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold",
                      on
                        ? "bg-accent text-accent-foreground"
                        : "bg-secondary text-secondary-foreground",
                    )}
                  >
                    {on ? order + 1 : <Check className="size-3.5 opacity-30" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold leading-snug text-foreground text-pretty">
                      {s.text}
                    </span>
                    <span className="mt-0.5 block text-[12px] text-muted-foreground">
                      {s.reason}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      {/* --------------------------------------------------- idle warning */}
      {emptyAreas.length > 0 && (
        <section className="rounded-xl border border-warn/30 bg-warn-soft/50 p-3">
          <h3 className="flex items-center gap-1.5 pb-1.5 text-[13px] font-bold text-warn-foreground">
            <Flag className="size-4" />
            {emptyAreas.length} אזורים ללא עבודה
          </h3>
          <p className="text-[13px] text-foreground text-pretty">
            {emptyAreas.map((id) => areaName(state, id)).join(" • ")}
          </p>
        </section>
      )}

      {!done && (
        <div className="sticky bottom-16 lg:bottom-0">
          <Button className="h-12 w-full text-[15px]" onClick={finish} disabled={picked.length === 0}>
            <Check data-icon="inline-start" />
            סיים סיור וקבע יעדי יום
          </Button>
        </div>
      )}
    </div>
  )
}

function SummaryStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  tone?: "crit"
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-primary-foreground/10 p-2.5">
      <Icon className={cn("size-4", tone === "crit" ? "text-crit" : "text-accent")} />
      <span className="nums text-xl font-bold leading-none">{value}</span>
      <span className="text-[11px] leading-tight text-primary-foreground/70">{label}</span>
    </div>
  )
}
