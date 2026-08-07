"use client"

import * as React from "react"

import { PageBody, PageHeader } from "@/components/common/page-header"
import { SectionTitle } from "@/components/common/chips"
import { BuildingMap } from "@/components/status/building-map"
import { AreaDetailSheet } from "@/components/status/area-detail-sheet"
import { useStore } from "@/lib/store"
import { areaHealth, contractorSummary } from "@/lib/selectors"
import { shortDate } from "@/lib/dates"
import type { AreaHealth } from "@/lib/types"

export default function StatusPage() {
  const { state, hydrated } = useStore()
  const [openAreaId, setOpenAreaId] = React.useState<string | null>(null)

  const counts = React.useMemo(() => {
    const out: Record<AreaHealth, number> = { crit: 0, warn: 0, ok: 0, idle: 0 }
    if (!hydrated) return out
    for (const a of state.areas) out[areaHealth(state, a.id)] += 1
    return out
  }, [state, hydrated])

  const contractors = React.useMemo(() => {
    if (!hydrated) return []
    return state.people
      .filter((p) => p.group === "contractor")
      .map((p) => ({ person: p, summary: contractorSummary(state, p.id) }))
      .filter((c) => c.summary.open.length > 0 || c.summary.commitments.length > 0)
      .sort((a, b) => b.summary.overdue.length - a.summary.overdue.length)
  }, [state, hydrated])

  return (
    <>
      <PageHeader
        title="מצב הפרויקט"
        subtitle="מפת חום של כל אזור באתר – לחץ על אזור לפירוט מלא"
      />

      <PageBody>
        {/* health summary */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <SummaryTile
            label="דורש התערבות"
            value={counts.crit}
            className="border-crit/40 bg-crit/10 text-crit"
          />
          <SummaryTile
            label="לעקוב"
            value={counts.warn}
            className="border-warn/50 bg-warn/15 text-warn-foreground"
          />
          <SummaryTile
            label="מתקדם"
            value={counts.ok}
            className="border-ok/40 bg-ok/10 text-ok"
          />
          <SummaryTile
            label="ללא פעילות"
            value={counts.idle}
            className="border-border bg-muted text-muted-foreground"
          />
        </div>

        <section>
          <SectionTitle>חתך הבניין</SectionTitle>
          <BuildingMap onSelect={setOpenAreaId} />
        </section>

        {contractors.length > 0 && (
          <section>
            <SectionTitle count={contractors.length}>אחריות קבלנים</SectionTitle>
            <ul className="grid gap-2 lg:grid-cols-2">
              {contractors.map(({ person, summary }) => (
                <li
                  key={person.id}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-foreground">{person.name}</span>
                      {person.trade && (
                        <span className="text-[11px] text-muted-foreground">{person.trade}</span>
                      )}
                    </div>
                    {summary.overdue.length > 0 ? (
                      <span className="nums shrink-0 rounded-md bg-crit/15 px-2 py-1 text-[11px] font-bold text-crit">
                        {summary.overdue.length} באיחור
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-md bg-ok/15 px-2 py-1 text-[11px] font-bold text-ok">
                        בזמן
                      </span>
                    )}
                  </div>

                  {summary.total > 0 && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="nums">{summary.open.length} משימות פתוחות</span>
                      <span className="nums">{summary.areas.length} אזורים</span>
                      <span className="nums">
                        {summary.doneCount}/{summary.total} הושלמו
                      </span>
                    </div>
                  )}

                  {summary.commitments.length > 0 && (
                    <ul className="flex flex-col gap-1 border-t border-border pt-2">
                      {summary.commitments.slice(0, 2).map((c) => (
                        <li key={c.id} className="flex flex-col">
                          <span className="text-xs leading-snug text-foreground">
                            {c.commitment}
                          </span>
                          {c.dueDate && (
                            <span className="nums text-[11px] text-muted-foreground">
                              התחייב ל־{shortDate(c.dueDate)}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </PageBody>

      <AreaDetailSheet areaId={openAreaId} onOpenChange={() => setOpenAreaId(null)} />
    </>
  )
}

function SummaryTile({
  label,
  value,
  className,
}: {
  label: string
  value: number
  className: string
}) {
  return (
    <div className={`flex flex-col gap-0.5 rounded-xl border-2 p-3 ${className}`}>
      <span className="nums text-2xl font-bold leading-none">{value}</span>
      <span className="text-[11px] font-semibold">{label}</span>
    </div>
  )
}
