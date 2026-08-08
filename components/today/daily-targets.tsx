"use client"

import * as React from "react"
import { Check, Target, ChevronLeft } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import { personName, taskAreaSummary } from "@/lib/selectors"
import { relativeDay } from "@/lib/dates"

export function DailyTargets({ onOpenTask }: { onOpenTask: (id: string) => void }) {
  const { state, dispatch, commitAction } = useStore()
  const targets = state.dayTargets
  const doneCount = targets.filter((t) => t.done).length

  if (targets.length === 0) return null

  return (
    <section
      aria-labelledby="targets-heading"
      className="overflow-hidden rounded-xl bg-primary text-primary-foreground shadow-sm"
    >
      <div className="flex items-center justify-between gap-3 border-b border-primary-foreground/10 px-4 py-3">
        <h2 id="targets-heading" className="flex items-center gap-2 text-sm font-bold">
          <Target className="size-4 text-accent" />
          {targets.length} הדברים החשובים שלי להיום
        </h2>
        <span className="nums shrink-0 rounded-full bg-primary-foreground/10 px-2 py-0.5 text-xs font-bold">
          {doneCount}/{targets.length}
        </span>
      </div>

      <ol className="divide-y divide-primary-foreground/10">
        {targets.map((t, i) => {
          const task = state.tasks.find((x) => x.id === t.taskId)
          const done = t.done || task?.status === "done"
          return (
            <li key={t.id} className="flex items-stretch">
              <button
                type="button"
                onClick={async () => {
                  dispatch({ type: "toggleTarget", id: t.id })
                  if (task && !done) {
                    const result = await commitAction({ type: "updateTask", id: task.id, patch: { status: "done" } })
                    if (!result.ok) return
                  }
                  toast(done ? "הוחזר ליעדי היום" : "יעד הושלם — כל הכבוד")
                }}
                className="flex shrink-0 items-center px-4 py-3.5"
                aria-label={done ? `בטל השלמה: ${t.text}` : `סמן כבוצע: ${t.text}`}
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-md border-2 transition-colors",
                    done
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-primary-foreground/30",
                  )}
                >
                  {done ? (
                    <Check className="size-4" />
                  ) : (
                    <span className="nums text-xs font-bold text-primary-foreground/60">
                      {i + 1}
                    </span>
                  )}
                </span>
              </button>

              <button
                type="button"
                onClick={() => (task ? onOpenTask(task.id) : undefined)}
                disabled={!task}
                className="flex min-w-0 flex-1 items-center gap-2 py-3.5 pe-3 text-start"
              >
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-sm font-semibold leading-snug text-pretty",
                      done && "text-primary-foreground/50 line-through",
                    )}
                  >
                    {t.text}
                  </span>
                  {task && (
                    <span className="nums mt-0.5 block truncate text-[11px] text-primary-foreground/60">
                      {personName(state, task.assigneeId)}
                      {` • ${taskAreaSummary(state, task)}`}
                      {task.dueDate ? ` • יעד ${relativeDay(task.dueDate)}` : ""}
                    </span>
                  )}
                </span>
                {task && <ChevronLeft className="size-4 shrink-0 text-primary-foreground/40" />}
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
