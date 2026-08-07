"use client"

import Link from "next/link"
import { AlertTriangle, ArrowLeft, Info, Lightbulb, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import { insights, recommendations } from "@/lib/selectors"
import { SectionTitle } from "@/components/common/chips"

const SEV = {
  crit: { icon: AlertTriangle, cls: "text-crit", bg: "bg-crit-soft", border: "border-crit/25" },
  warn: { icon: AlertTriangle, cls: "text-warn-foreground", bg: "bg-warn-soft", border: "border-warn/30" },
  info: { icon: Info, cls: "text-info", bg: "bg-info-soft", border: "border-info/25" },
} as const

export function InsightsPanel() {
  const { state } = useStore()
  const list = insights(state)

  if (list.length === 0) return null

  return (
    <section aria-labelledby="insights-heading">
      <SectionTitle>
        <span id="insights-heading">תובנות ניהוליות</span>
      </SectionTitle>
      <ul className="flex flex-col gap-2">
        {list.map((ins) => {
          const sev = SEV[ins.severity]
          return (
            <li key={ins.id}>
              <Link
                href={ins.href ?? "#"}
                className={cn(
                  "flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/40",
                  ins.severity === "crit" ? "border-crit/30" : "border-border",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md",
                    sev.bg,
                    sev.cls,
                  )}
                >
                  <sev.icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1 text-[13px] font-medium leading-relaxed text-foreground text-pretty">
                  {ins.text}
                </span>
                <ArrowLeft className="mt-1 size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function RecommendationsCard({ onOpenTask }: { onOpenTask?: (id: string) => void }) {
  const { state } = useStore()
  const recs = recommendations(state)
  if (recs.length === 0) return null

  return (
    <section
      aria-labelledby="recs-heading"
      className="rounded-xl border border-accent/40 bg-accent/8 p-4"
    >
      <h2
        id="recs-heading"
        className="flex items-center gap-2 text-sm font-bold text-foreground"
      >
        <span className="flex size-7 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <Lightbulb className="size-4" />
        </span>
        מה כדאי לך לעשות עכשיו
      </h2>
      <p className="mt-1 ps-9 text-xs text-muted-foreground">
        נגזר מהסיור של הבוקר ומהמשימות הפתוחות
      </p>
      <ol className="mt-3 flex flex-col gap-1.5">
        {recs.map((r, i) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => {
                const id = r.href.split("task=")[1]
                if (id && onOpenTask) onOpenTask(id)
              }}
              className="flex w-full items-start gap-3 rounded-lg bg-card/70 p-2.5 text-start transition-colors hover:bg-card"
            >
              <span className="nums mt-0.5 flex size-5 shrink-0 items-center justify-center rounded bg-accent/25 text-[11px] font-bold text-accent-foreground">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold leading-snug text-foreground text-pretty">
                  {r.text}
                </span>
                <span className="nums mt-0.5 block truncate text-[11px] text-muted-foreground">
                  {r.detail}
                </span>
              </span>
              <TrendingUp className="mt-1 size-3.5 shrink-0 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}
