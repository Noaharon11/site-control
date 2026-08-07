"use client"

import Link from "next/link"
import { AlertTriangle, Ban, Hand, HardHat, ListTodo, MoonStar } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import {
  activeContractorsToday,
  criticalTasks,
  idleAreas,
  openBlockers,
  openDefects,
  openTasks,
} from "@/lib/selectors"

interface Kpi {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  tone: "neutral" | "crit" | "warn" | "info" | "idle"
  href: string
}

const TONE: Record<Kpi["tone"], { box: string; value: string }> = {
  neutral: { box: "bg-secondary text-secondary-foreground", value: "text-foreground" },
  crit: { box: "bg-crit-soft text-crit", value: "text-crit" },
  warn: { box: "bg-warn-soft text-warn-foreground", value: "text-warn-foreground" },
  info: { box: "bg-info-soft text-info", value: "text-info" },
  idle: { box: "bg-idle-soft text-muted-foreground", value: "text-muted-foreground" },
}

export function KpiStrip() {
  const { state } = useStore()

  const kpis: Kpi[] = [
    {
      label: "משימות פתוחות",
      value: openTasks(state).length,
      icon: ListTodo,
      tone: "neutral",
      href: "/tasks",
    },
    {
      label: "משימות קריטיות",
      value: criticalTasks(state).length,
      icon: AlertTriangle,
      tone: "crit",
      href: "/tasks?tab=critical",
    },
    {
      label: "קבלנים פעילים היום",
      value: activeContractorsToday(state).length,
      icon: HardHat,
      tone: "info",
      href: "/status",
    },
    {
      label: "אזורים ללא פעילות",
      value: idleAreas(state).length,
      icon: MoonStar,
      tone: "idle",
      href: "/status?filter=idle",
    },
    {
      label: "חסמים פתוחים",
      value: openBlockers(state).length,
      icon: Ban,
      tone: "warn",
      href: "/status?filter=crit",
    },
    {
      label: "ליקויים פתוחים",
      value: openDefects(state).length,
      icon: Hand,
      tone: "warn",
      href: "/status",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {kpis.map((k) => {
        const tone = TONE[k.tone]
        return (
          <Link
            key={k.label}
            href={k.href}
            className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/30 hover:bg-muted/40"
          >
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-md",
                tone.box,
              )}
            >
              <k.icon className="size-[18px]" />
            </span>
            <span className="min-w-0">
              <span className={cn("nums block text-2xl font-bold leading-none", tone.value)}>
                {k.value}
              </span>
              <span className="mt-1 block truncate text-[11px] font-medium leading-tight text-muted-foreground">
                {k.label}
              </span>
            </span>
          </Link>
        )
      })}
    </div>
  )
}
