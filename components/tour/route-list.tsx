"use client"

import { Ban, Camera, Check, ChevronLeft, Handshake, SkipForward, Users, Wrench } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import type { Area, Tour } from "@/lib/types"
import { HealthDot } from "@/components/common/chips"
import { areaHealth } from "@/lib/selectors"

const ZONE_LABEL: Record<Area["zone"], string> = {
  basement: "מרתפים",
  ground: "קומת קרקע",
  floor: "קומות מגורים",
  roof: "גג",
  facade: "חזיתות",
  external: "פיתוח חוץ",
}

/**
 * The route is rendered in walking order (not grouped), because the order is the
 * whole point – the manager walks up the east wing, crosses the roof and comes
 * down the west wing. A zone label is injected whenever the zone changes.
 */
export function RouteList({ tour, onPick }: { tour: Tour; onPick: (index: number) => void }) {
  const { state } = useStore()
  const route = tour.routeAreaIds
    .map((id) => state.areas.find((a) => a.id === id))
    .filter((a): a is Area => Boolean(a))

  return (
    <ol className="flex flex-col">
      {route.map((a, idx) => {
        const visit = tour.visits[a.id]
        const visited = Boolean(visit?.visitedAt) && !visit?.skipped
        const skipped = Boolean(visit?.skipped)
        const captured =
          (visit?.taskIds.length ?? 0) +
          (visit?.blockerIds.length ?? 0) +
          (visit?.defectIds.length ?? 0) +
          (visit?.decisionIds.length ?? 0) +
          (visit?.photoIds.length ?? 0)
        const newZone = idx === 0 || route[idx - 1].zone !== a.zone

        return (
          <li key={a.id}>
            {newZone && (
              <h3 className="px-1 pb-1.5 pt-4 text-[12px] font-bold uppercase tracking-wide text-muted-foreground first:pt-0">
                {ZONE_LABEL[a.zone]}
              </h3>
            )}
            <button
              type="button"
              onClick={() => onPick(idx)}
              className={cn(
                "flex min-h-14 w-full items-center gap-3 border border-border bg-card px-3 py-2.5 text-start hover:bg-muted",
                // seam the consecutive rows of a zone into one card
                newZone ? "rounded-t-xl" : "-mt-px",
                idx === route.length - 1 || route[idx + 1]?.zone !== a.zone
                  ? "rounded-b-xl"
                  : undefined,
              )}
            >
              <span
                className={cn(
                  "nums flex size-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold",
                  visited
                    ? "bg-ok text-ok-foreground"
                    : skipped
                      ? "bg-idle-soft text-muted-foreground"
                      : "bg-secondary text-secondary-foreground",
                )}
              >
                {visited ? (
                  <Check className="size-4" />
                ) : skipped ? (
                  <SkipForward className="size-3.5" />
                ) : (
                  idx + 1
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <HealthDot health={areaHealth(state, a.id)} />
                  <span className="truncate text-[14px] font-semibold text-foreground">
                    {a.name}
                  </span>
                </span>
                {visited && (
                  <span className="nums mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-muted-foreground">
                    {visit?.activeToday === false ? (
                      <span className="font-semibold text-crit">אין עבודה</span>
                    ) : (
                      <>
                        {visit?.workersCount ? (
                          <span className="flex items-center gap-1">
                            <Users className="size-3" />
                            {visit.workersCount}
                          </span>
                        ) : null}
                        {(visit?.blockerIds.length ?? 0) > 0 && (
                          <span className="flex items-center gap-1 font-semibold text-crit">
                            <Ban className="size-3" />
                            {visit?.blockerIds.length}
                          </span>
                        )}
                        {(visit?.taskIds.length ?? 0) > 0 && (
                          <span className="flex items-center gap-1">
                            <Wrench className="size-3" />
                            {visit?.taskIds.length}
                          </span>
                        )}
                        {(visit?.decisionIds.length ?? 0) > 0 && (
                          <span className="flex items-center gap-1">
                            <Handshake className="size-3" />
                            {visit?.decisionIds.length}
                          </span>
                        )}
                        {(visit?.photoIds.length ?? 0) > 0 && (
                          <span className="flex items-center gap-1">
                            <Camera className="size-3" />
                            {visit?.photoIds.length}
                          </span>
                        )}
                        {captured === 0 && <span>נסרק, ללא חריגים</span>}
                      </>
                    )}
                  </span>
                )}
                {skipped && (
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">דולג</span>
                )}
              </span>

              <ChevronLeft className="size-4 shrink-0 text-muted-foreground" />
            </button>
          </li>
        )
      })}
    </ol>
  )
}
