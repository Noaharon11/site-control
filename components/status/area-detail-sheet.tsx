"use client"

import * as React from "react"
import Image from "next/image"

import { ResponsiveSheet } from "@/components/common/responsive-sheet"
import { HealthChip, SectionTitle } from "@/components/common/chips"
import { TaskCard } from "@/components/tasks/task-card"
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import { areaById, areaStats, personName } from "@/lib/selectors"
import { BLOCKER_LABEL } from "@/lib/types"
import { ageLabel, shortDate } from "@/lib/dates"

export function AreaDetailSheet({
  areaId,
  onOpenChange,
}: {
  areaId: string | null
  onOpenChange: (v: boolean) => void
}) {
  const { state } = useStore()
  const [openTaskId, setOpenTaskId] = React.useState<string | null>(null)

  const area = areaById(state, areaId)
  const stats = React.useMemo(() => (areaId ? areaStats(state, areaId) : null), [state, areaId])

  return (
    <>
      <ResponsiveSheet
        open={!!areaId && !openTaskId}
        onOpenChange={onOpenChange}
        title={area?.name ?? ""}
        description={
          stats?.visit
            ? stats.visit.activeToday === false
              ? "נסרק היום – אין עבודה באזור"
              : `נסרק היום${stats.teams.length ? ` • ${stats.teams.join(", ")}` : ""}`
            : "לא נסרק בסיור של היום"
        }
        footer={
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-11 w-full">
            סגור
          </Button>
        }
      >
        {area && stats && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2">
              <HealthChip health={stats.health} />
              {stats.visit?.workersCount ? (
                <span className="nums rounded-md bg-muted px-2 py-1 text-xs font-semibold text-foreground">
                  {stats.visit.workersCount} עובדים
                </span>
              ) : null}
            </div>

            {/* what the manager actually noted while standing here */}
            {stats.visit && (stats.visit.progressTags.length > 0 || stats.visit.progressNote) ? (
              <section className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3">
                <SectionTitle className="pb-0">מה נרשם בסיור</SectionTitle>
                {stats.visit.progressTags.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5">
                    {stats.visit.progressTags.map((t) => (
                      <li
                        key={t}
                        className="rounded-md border border-border bg-card px-2 py-0.5 text-[11px] font-semibold"
                      >
                        {t}
                      </li>
                    ))}
                  </ul>
                )}
                {stats.visit.progressNote && (
                  <p className="text-sm leading-relaxed text-foreground">
                    {stats.visit.progressNote}
                  </p>
                )}
              </section>
            ) : null}

            {stats.blockers.length > 0 && (
              <section>
                <SectionTitle tone="crit" count={stats.blockers.length}>
                  חסמים פתוחים
                </SectionTitle>
                <ul className="flex flex-col gap-2">
                  {stats.blockers.map((b) => (
                    <li
                      key={b.id}
                      className="flex flex-col gap-1 rounded-lg border border-border border-s-4 border-s-crit bg-card p-3"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="rounded bg-crit/15 px-1.5 py-0.5 text-[11px] font-bold text-crit">
                          {BLOCKER_LABEL[b.reason]}
                        </span>
                        <span className="nums text-[11px] text-muted-foreground">
                          {ageLabel(b.date)}
                        </span>
                      </span>
                      <p className="text-sm font-medium leading-relaxed">{b.text}</p>
                      {(b.streak ?? 0) > 1 && (
                        <span className="nums text-[11px] font-bold text-crit">
                          חזר {b.streak} סיורים ברצף
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {stats.defects.length > 0 && (
              <section>
                <SectionTitle tone="warn" count={stats.defects.length}>
                  ליקויים
                </SectionTitle>
                <ul className="flex flex-col gap-2">
                  {stats.defects.map((d) => (
                    <li
                      key={d.id}
                      className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3"
                    >
                      <span className="text-sm font-medium leading-relaxed">{d.title}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {d.assigneeId ? personName(state, d.assigneeId) : "לא הוקצה"} •{" "}
                        {shortDate(d.date)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {stats.decisions.length > 0 && (
              <section>
                <SectionTitle count={stats.decisions.length}>סיכומים עם קבלנים</SectionTitle>
                <ul className="flex flex-col gap-2">
                  {stats.decisions.map((d) => (
                    <li
                      key={d.id}
                      className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3"
                    >
                      <span className="text-xs font-bold text-foreground">
                        {personName(state, d.contractorId)} • {shortDate(d.date)}
                      </span>
                      <p className="text-sm leading-relaxed">{d.commitment}</p>
                      {d.dueDate && (
                        <span className="nums text-[11px] font-semibold text-muted-foreground">
                          התחייב ל־{shortDate(d.dueDate)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <SectionTitle count={stats.openTasks.length}>משימות פתוחות</SectionTitle>
              {stats.openTasks.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  אין משימות פתוחות באזור הזה
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {stats.openTasks.map((t) => (
                    <li key={t.id}>
                      <TaskCard task={t} onOpen={setOpenTaskId} hideArea />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {stats.photos.length > 0 && (
              <section>
                <SectionTitle count={stats.photos.length}>תמונות</SectionTitle>
                <ul className="grid grid-cols-2 gap-2">
                  {stats.photos.map((p) => (
                    <li key={p.id} className="flex flex-col gap-1">
                      <span className="relative block aspect-4/3 overflow-hidden rounded-lg border border-border bg-muted">
                        <Image
                          src={p.url || "/placeholder.svg"}
                          alt={p.caption}
                          fill
                          sizes="(max-width: 640px) 45vw, 220px"
                          className="object-cover"
                        />
                      </span>
                      <span className="text-[11px] leading-snug text-muted-foreground">
                        {shortDate(p.date)} • {p.caption}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </ResponsiveSheet>

      <TaskDetailSheet taskId={openTaskId} onOpenChange={() => setOpenTaskId(null)} />
    </>
  )
}
