"use client"

import * as React from "react"
import { Check, ChevronDown, Search, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { Area } from "@/lib/types"

export function AreaMultiSelect({
  areas,
  value,
  onChange,
  placeholder = "בחר אזור אחד או יותר",
}: {
  areas: Area[]
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
}) {
  const [search, setSearch] = React.useState("")

  const selected = React.useMemo(() => {
    const set = new Set(value)
    return areas.filter((a) => set.has(a.id))
  }, [areas, value])

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return areas
    return areas.filter((a) => a.name.toLowerCase().includes(q))
  }, [areas, search])

  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((x) => x !== id))
      return
    }
    onChange([...value, id])
  }

  return (
    <div className="flex flex-col gap-2">
      <Popover>
        <PopoverTrigger
          render={
            <button
              type="button"
              className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 text-sm text-foreground"
              aria-label="בחירת אזורים"
            >
              <span className="truncate text-start">
                {selected.length > 0 ? `${selected.length} אזורים נבחרו` : placeholder}
              </span>
              <ChevronDown className="size-4 text-muted-foreground" />
            </button>
          }
        />
        <PopoverContent align="start" className="w-[min(92vw,24rem)] p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש אזור"
              className="h-9 pe-9"
            />
          </div>

          <div className="mt-2 max-h-60 overflow-y-auto rounded-md border border-border">
            {filtered.length === 0 ? (
              <p className="p-3 text-xs text-muted-foreground">לא נמצאו אזורים</p>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map((area) => {
                  const checked = value.includes(area.id)
                  return (
                    <li key={area.id}>
                      <button
                        type="button"
                        onClick={() => toggle(area.id)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-start text-sm hover:bg-muted"
                      >
                        <Checkbox checked={checked} readOnly />
                        <span className="flex-1">{area.name}</span>
                        {checked && <Check className="size-4 text-primary" />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{value.length} נבחרו</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => onChange([])}
              disabled={value.length === 0}
            >
              נקה הכול
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((area) => (
            <Badge key={area.id} variant="secondary" className="h-6 gap-1 px-2">
              <span>{area.name}</span>
              <button
                type="button"
                onClick={() => toggle(area.id)}
                aria-label={`הסר ${area.name}`}
                className="rounded p-0.5 hover:bg-black/10"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
