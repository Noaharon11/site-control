"use client"

import * as React from "react"
import { Check, ChevronDown, ChevronUp, Pencil, Plus, Search, ArchiveX } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import type { Area, AreaZone } from "@/lib/types"
import { PageBody, PageHeader } from "@/components/common/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ResponsiveSheet } from "@/components/common/responsive-sheet"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
import { Building2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const ZONE_OPTIONS: { value: AreaZone; label: string }[] = [
  { value: "basement", label: "מרתף" },
  { value: "ground", label: "קומת קרקע" },
  { value: "floor", label: "קומה" },
  { value: "roof", label: "גג" },
  { value: "facade", label: "חזיתות" },
  { value: "external", label: "פיתוח חוץ" },
]

const ZONE_LABEL: Record<AreaZone, string> = {
  basement: "מרתף",
  ground: "קומת קרקע",
  floor: "קומה",
  roof: "גג",
  facade: "חזיתות",
  external: "פיתוח חוץ",
}

// ----------------------------------------------------------------- sheet ---

function AreaSheet({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: Area
}) {
  const { state, dispatch, uid } = useStore()
  const isEdit = Boolean(initial)

  const [name, setName] = React.useState(initial?.name ?? "")
  const [zone, setZone] = React.useState<AreaZone>(initial?.zone ?? "floor")
  const [level, setLevel] = React.useState(String(initial?.level ?? "1"))
  const [parentId, setParentId] = React.useState(initial?.parentId ?? "none")

  React.useEffect(() => {
    if (!open) return
    setName(initial?.name ?? "")
    setZone(initial?.zone ?? "floor")
    setLevel(String(initial?.level ?? "1"))
    setParentId(initial?.parentId ?? "none")
  }, [open, initial])

  function save() {
    if (!name.trim()) return

    if (isEdit && initial) {
      dispatch({
        type: "updateArea",
        id: initial.id,
        patch: {
          name: name.trim(),
          zone,
          level: Number(level) || 0,
          parentId: parentId === "none" ? null : parentId,
        },
      })
      toast.success("האזור עודכן")
    } else {
      const newArea: Area = {
        id: uid("area"),
        name: name.trim(),
        zone,
        level: Number(level) || 0,
        wing: null,
        routeOrder: 999,
        parentId: parentId === "none" ? null : parentId,
        active: true,
      }
      dispatch({ type: "addArea", area: newArea })
      toast.success("אזור חדש נוסף", { description: name.trim() })
    }
    onOpenChange(false)
  }

  const activeAreas = state.areas.filter((a) => a.active !== false && a.id !== initial?.id)

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "עריכת אזור" : "אזור חדש"}
      footer={
        <Button className="h-12 w-full" onClick={save} disabled={!name.trim()}>
          <Check data-icon="inline-start" />
          {isEdit ? "שמור שינויים" : "הוסף אזור"}
        </Button>
      }
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="area-name">שם האזור *</FieldLabel>
          <Input
            id="area-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="לדוגמה: קומה 3 - מזרח"
            autoComplete="off"
          />
        </Field>

        <Field>
          <FieldLabel>סוג אזור</FieldLabel>
          <Select value={zone} onValueChange={(v) => setZone(v as AreaZone)}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ZONE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="area-level">קומה / רמה</FieldLabel>
          <Input
            id="area-level"
            type="number"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            placeholder="0"
          />
        </Field>

        <Field>
          <FieldLabel>אזור אב (ייררכיה)</FieldLabel>
          <Select value={parentId} onValueChange={setParentId}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">ללא אב</SelectItem>
              {activeAreas.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </FieldGroup>
    </ResponsiveSheet>
  )
}

// ----------------------------------------------------------------- archive dialog ---

function ArchiveAreaDialog({
  area,
  open,
  onOpenChange,
}: {
  area: Area
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const { dispatch } = useStore()

  function handleArchive() {
    dispatch({ type: "archiveArea", id: area.id })
    toast.success(`${area.name} הועבר לארכיון`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>להעביר לארכיון?</DialogTitle>
          <DialogDescription>
            {area.name} יוסר מהרשימה הפעילה ומסלול הסיור. הנתונים ההיסטוריים ישמרו.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">ביטול</Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleArchive}>
            העבר לארכיון
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ----------------------------------------------------------------- main ---

export function AreasManager() {
  const { state } = useStore()
  const [query, setQuery] = React.useState("")
  const [showInactive, setShowInactive] = React.useState(false)
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [editArea, setEditArea] = React.useState<Area | undefined>()
  const [archiveArea, setArchiveArea] = React.useState<Area | undefined>()

  const areas = state.areas
    .filter((a) => showInactive || a.active !== false)
    .filter((a) => !query || a.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => a.routeOrder - b.routeOrder)

  // group by zone for display
  const grouped = React.useMemo(() => {
    const map = new Map<AreaZone, Area[]>()
    for (const a of areas) {
      const list = map.get(a.zone) ?? []
      list.push(a)
      map.set(a.zone, list)
    }
    return map
  }, [areas])

  function openCreate() {
    setEditArea(undefined)
    setSheetOpen(true)
  }

  function openEdit(a: Area) {
    setEditArea(a)
    setSheetOpen(true)
  }

  return (
    <>
      <PageHeader
        title="מבנה הפרויקט"
        subtitle="אזורי הבנייה המשמשים בסיור, משימות, ליקויים וחסמים"
        actions={
          <Button size="sm" className="h-9" onClick={openCreate}>
            + הוסף אזור
          </Button>
        }
      >
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חיפוש אזור..."
              className="h-10 pe-9"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Switch id="show-inactive-a" checked={showInactive} onCheckedChange={setShowInactive} />
            <Label htmlFor="show-inactive-a" className="text-xs text-muted-foreground whitespace-nowrap">
              כולל לא פעיל
            </Label>
          </div>
        </div>
      </PageHeader>

      <PageBody className="flex flex-col gap-4">
        {areas.length === 0 ? (
          <Empty className="rounded-xl border border-border bg-card py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon"><Building2 /></EmptyMedia>
              <EmptyTitle>אין אזורים</EmptyTitle>
              <EmptyDescription>
                {query ? "לא נמצאו תוצאות לחיפוש" : "עדיין לא נוספו אזורים לפרויקט"}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          [...grouped.entries()].map(([zone, zoneAreas]) => (
            <section key={zone}>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {ZONE_LABEL[zone]}
              </p>
              <ul className="flex flex-col gap-1.5">
                {zoneAreas.map((a) => (
                  <li key={a.id}>
                    <div
                      className={cn(
                        "flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5",
                        a.active === false && "opacity-50",
                      )}
                    >
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
                        {a.level}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium">{a.name}</span>
                        {a.active === false && (
                          <Badge variant="outline" className="mr-2 text-xs text-muted-foreground">לא פעיל</Badge>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="sm" className="size-8 p-0" onClick={() => openEdit(a)}>
                          <Pencil className="size-4" />
                          <span className="sr-only">עריכה</span>
                        </Button>
                        {a.active !== false && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-8 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => setArchiveArea(a)}
                          >
                            <ArchiveX className="size-4" />
                            <span className="sr-only">ארכיון</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </PageBody>

      <AreaSheet open={sheetOpen} onOpenChange={setSheetOpen} initial={editArea} />

      {archiveArea && (
        <ArchiveAreaDialog
          area={archiveArea}
          open={Boolean(archiveArea)}
          onOpenChange={(v) => { if (!v) setArchiveArea(undefined) }}
        />
      )}
    </>
  )
}
