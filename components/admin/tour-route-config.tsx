"use client"

import * as React from "react"
import { ArrowDown, ArrowUp, Check, GripVertical, Minus, Plus } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import type { Area } from "@/lib/types"
import { PageBody, PageHeader } from "@/components/common/page-header"
import { Button } from "@/components/ui/button"

export function TourRouteConfig() {
  const { state, dispatch } = useStore()

  // local copy of the route for editing
  const [route, setRoute] = React.useState<string[]>(() => {
    // start from saved tourRoute, filtered to only active areas
    const activeIds = new Set(state.areas.filter((a) => a.active !== false).map((a) => a.id))
    return (state.tourRoute ?? []).filter((id) => activeIds.has(id))
  })

  // IDs not yet in the route (active areas)
  const inRoute = new Set(route)
  const notInRoute = state.areas.filter((a) => a.active !== false && !inRoute.has(a.id))

  const areaById = (id: string) => state.areas.find((a) => a.id === id)

  function move(idx: number, dir: -1 | 1) {
    const next = [...route]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    setRoute(next)
  }

  function remove(id: string) {
    setRoute(route.filter((r) => r !== id))
  }

  function add(id: string) {
    setRoute([...route, id])
  }

  function save() {
    dispatch({ type: "setTourRoute", areaIds: route })
    toast.success("מסלול הסיור עודכן", {
      description: `${route.length} אזורים במסלול`,
    })
  }

  const isDirty = JSON.stringify(route) !== JSON.stringify(state.tourRoute ?? [])

  return (
    <>
      <PageHeader
        title="מסלול סיור בוקר"
        subtitle="גרור לסידור מחדש, הסר אזורים שאינם בסיור, הוסף אזורים חדשים"
        actions={
          <Button size="sm" onClick={save} disabled={!isDirty}>
            <Check data-icon="inline-start" />
            שמור מסלול
          </Button>
        }
      />

      <PageBody className="flex flex-col gap-6">
        {/* current route */}
        <section>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            אזורים במסלול ({route.length})
          </p>
          {route.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              אין אזורים במסלול — הוסף מהרשימה למטה
            </p>
          ) : (
            <ol className="flex flex-col gap-1.5">
              {route.map((id, idx) => {
                const area = areaById(id)
                if (!area) return null
                return (
                  <li key={id}>
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
                      <span className="nums flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
                        {idx + 1}
                      </span>
                      <span className="flex-1 text-sm font-medium">{area.name}</span>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-8 p-0"
                          disabled={idx === 0}
                          onClick={() => move(idx, -1)}
                          aria-label="הזז למעלה"
                        >
                          <ArrowUp className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-8 p-0"
                          disabled={idx === route.length - 1}
                          onClick={() => move(idx, 1)}
                          aria-label="הזז למטה"
                        >
                          <ArrowDown className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-8 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => remove(id)}
                          aria-label="הסר מהמסלול"
                        >
                          <Minus className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </section>

        {/* areas not in route */}
        {notInRoute.length > 0 && (
          <section>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              אזורים שאינם במסלול ({notInRoute.length})
            </p>
            <ul className="flex flex-col gap-1.5">
              {notInRoute.map((area) => (
                <li key={area.id}>
                  <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-card/50 px-3 py-2.5">
                    <span className="flex-1 text-sm text-muted-foreground">{area.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-8 p-0"
                      onClick={() => add(area.id)}
                      aria-label="הוסף למסלול"
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </PageBody>
    </>
  )
}
