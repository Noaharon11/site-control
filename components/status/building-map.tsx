"use client"

import * as React from "react"

import { HealthDot } from "@/components/common/chips"
import { useStore } from "@/lib/store"
import { areaStats } from "@/lib/selectors"
import type { Area, AreaHealth } from "@/lib/types"
import { cn } from "@/lib/utils"

/** background + border per health state, used for the building cells */
const CELL: Record<AreaHealth, string> = {
  crit: "border-crit/45 bg-crit/12 hover:bg-crit/20",
  warn: "border-warn/50 bg-warn/15 hover:bg-warn/25",
  ok: "border-ok/45 bg-ok/12 hover:bg-ok/20",
  idle: "border-border bg-muted/60 hover:bg-muted",
}

interface CellData {
  area: Area
  health: AreaHealth
  openTasks: number
  blockers: number
  defects: number
  activeToday: boolean | null | undefined
  teams: string[]
}

/**
 * Building elevation: every row is a physical level, ordered roof-down-to-basement
 * the way the manager actually pictures the site. Colour is the worst signal in
 * that area, so a red cell always means "go here".
 */
export function BuildingMap({ onSelect }: { onSelect: (areaId: string) => void }) {
  const { state } = useStore()

  const cells = React.useMemo<Record<string, CellData>>(() => {
    const out: Record<string, CellData> = {}
    for (const area of state.areas.filter((a) => a.active !== false)) {
      const s = areaStats(state, area.id)
      out[area.id] = {
        area,
        health: s.health,
        openTasks: s.openTasks.length,
        blockers: s.blockers.length,
        defects: s.defects.length,
        activeToday: s.visit?.activeToday,
        teams: s.teams,
      }
    }
    return out
  }, [state])

  // group areas into physical levels, highest first
  const levels = React.useMemo(() => {
    const inside = state.areas.filter((a) => a.zone !== "facade" && a.zone !== "external" && a.active !== false)
    const byLevel = new Map<number, Area[]>()
    for (const a of inside) {
      const list = byLevel.get(a.level) ?? []
      list.push(a)
      byLevel.set(a.level, list)
    }
    return [...byLevel.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([level, areas]) => ({
        level,
        // east on the right, west on the left — matches how the plans are drawn
        areas: areas.sort((x, y) => (x.wing === "east" ? -1 : y.wing === "east" ? 1 : 0)),
      }))
  }, [state.areas])

  const outside = React.useMemo(
    () => state.areas.filter((a) => (a.zone === "facade" || a.zone === "external") && a.active !== false),
    [state.areas],
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* wing headers */}
        <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-2 py-1.5">
          <span className="w-14 shrink-0" />
          <span className="flex-1 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            מזרח
          </span>
          <span className="flex-1 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            מערב
          </span>
        </div>

        <div className="flex flex-col">
          {levels.map(({ level, areas }) => (
            <div
              key={level}
              className="flex items-stretch gap-1.5 border-b border-border/60 px-2 py-1.5 last:border-b-0"
            >
              <div className="flex w-14 shrink-0 items-center justify-end">
                <span className="nums text-xs font-bold text-muted-foreground">
                  {levelLabel(level)}
                </span>
              </div>
              {areas.map((area) => (
                <BuildingCell key={area.id} data={cells[area.id]} onSelect={onSelect} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* facade + site works sit outside the elevation */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          מחוץ למבנה
        </span>
        <div className="flex items-stretch gap-1.5">
          {outside.map((area) => (
            <BuildingCell key={area.id} data={cells[area.id]} onSelect={onSelect} />
          ))}
        </div>
      </div>

      <Legend />
    </div>
  )
}

function BuildingCell({
  data,
  onSelect,
}: {
  data: CellData | undefined
  onSelect: (areaId: string) => void
}) {
  if (!data) return null
  const { area, health, openTasks, blockers, defects, activeToday, teams } = data

  const signals: string[] = []
  if (blockers > 0) signals.push(`${blockers} חסמים`)
  if (defects > 0) signals.push(`${defects} ליקויים`)
  if (openTasks > 0) signals.push(`${openTasks} משימות`)

  return (
    <button
      type="button"
      onClick={() => onSelect(area.id)}
      aria-label={`${area.name} – ${signals.join(", ") || "אין פריטים פתוחים"}`}
      className={cn(
        "flex flex-1 flex-col gap-1 rounded-lg border-2 p-2 text-start transition-colors",
        CELL[health],
      )}
    >
      <span className="flex items-center gap-1.5">
        <span className="truncate text-xs font-bold text-foreground">{area.name}</span>
        <HealthDot health={health} />
      </span>

      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        {blockers > 0 && (
          <span className="nums text-[11px] font-bold text-crit">{blockers} חסם</span>
        )}
        {defects > 0 && (
          <span className="nums text-[11px] font-semibold text-warn-foreground">
            {defects} ליקוי
          </span>
        )}
        {openTasks > 0 && (
          <span className="nums text-[11px] font-medium text-muted-foreground">
            {openTasks} משימות
          </span>
        )}
        {signals.length === 0 && (
          <span className="text-[11px] font-medium text-muted-foreground">נקי</span>
        )}
      </span>

      <span className="truncate text-[11px] text-muted-foreground">
        {activeToday === false
          ? "אין עבודה היום"
          : teams.length > 0
            ? teams.join(", ")
            : activeToday
              ? "פעיל"
              : "לא נסרק היום"}
      </span>
    </button>
  )
}

function Legend() {
  const items: { health: AreaHealth; label: string }[] = [
    { health: "crit", label: "חסם או משימה קריטית" },
    { health: "warn", label: "איחור או ליקוי" },
    { health: "ok", label: "מתקדם כמצופה" },
    { health: "idle", label: "ללא פעילות / לא נסרק" },
  ]
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((i) => (
        <li key={i.health} className="flex items-center gap-1.5">
          <HealthDot health={i.health} />
          <span className="text-[11px] font-medium text-muted-foreground">{i.label}</span>
        </li>
      ))}
    </ul>
  )
}

function levelLabel(level: number) {
  if (level === 8) return "גג"
  if (level === 0) return "קרקע"
  if (level < 0) return `מרתף ${Math.abs(level)}`
  return `קומה ${level}`
}
