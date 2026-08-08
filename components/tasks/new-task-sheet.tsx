"use client"

import * as React from "react"
import { Check, MapPin } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import { areaName, currentTour } from "@/lib/selectors"
import { dayOffset, nowTime, today } from "@/lib/dates"
import { GROUP_LABEL, PRIORITY_LABEL, type Priority, type Task, type PersonGroup } from "@/lib/types"
import { ResponsiveSheet } from "@/components/common/responsive-sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { AreaMultiSelect } from "@/components/tasks/area-multi-select"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const DUE_OPTIONS = [
  { label: "היום", days: 0 },
  { label: "מחר", days: 1 },
  { label: "מחרתיים", days: 2 },
  { label: "סוף השבוע", days: 4 },
]

export function NewTaskSheet({
  open,
  onOpenChange,
  defaultAreaId = null,
  defaultAreaIds,
  defaultTitle = "",
  defaultAssigneeId,
  source = "ידני",
  observationId = null,
  decisionId = null,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  defaultAreaId?: string | null
  defaultAreaIds?: string[]
  defaultTitle?: string
  defaultAssigneeId?: string
  source?: string
  observationId?: string | null
  decisionId?: string | null
  onCreated?: (task: Task) => void
}) {
  const { state, dispatch, commitAction, uid, supabaseReady } = useStore()
  const tour = currentTour(state)

  const [title, setTitle] = React.useState(defaultTitle)
  const [description, setDescription] = React.useState("")
  const [areaIds, setAreaIds] = React.useState<string[]>(
    defaultAreaIds ?? (defaultAreaId ? [defaultAreaId] : []),
  )
  const [assigneeId, setAssigneeId] = React.useState(defaultAssigneeId ?? "me")
  const [priority, setPriority] = React.useState<Priority>("normal")
  const [dueDays, setDueDays] = React.useState(1)

  React.useEffect(() => {
    if (!open) return
    setTitle(defaultTitle)
    setDescription("")
    setAreaIds(defaultAreaIds ?? (defaultAreaId ? [defaultAreaId] : []))
    setAssigneeId(defaultAssigneeId ?? "me")
    setPriority("normal")
    setDueDays(1)
  }, [open, defaultTitle, defaultAreaId, defaultAreaIds, defaultAssigneeId])

  async function save() {
    if (!title.trim()) return
    const person = state.people.find((p) => p.id === assigneeId)
    const group: PersonGroup = assigneeId === "me" ? "me" : person?.group ?? "me"
    const normalizedAreaIds = [...new Set(areaIds.filter(Boolean))]
    const task: Task = {
      id: uid("tk"),
      title: title.trim(),
      description: description.trim() || undefined,
      areaIds: normalizedAreaIds,
      areaId: normalizedAreaIds[0] ?? null,
      assigneeId,
      assigneeGroup: group,
      priority,
      status: "new",
      dueDate: dayOffset(dueDays),
      createdAt: today(),
      source,
      tourId: tour?.status === "active" ? tour.id : null,
      observationId,
      decisionId,
      history: [
        {
          date: today(),
          time: nowTime(),
          text: source === "ידני" ? "נוצר במערכת" : `נוצר במהלך ${source}`,
        },
      ],
    }

    const result = supabaseReady && !state.offline
      ? await commitAction({ type: "addTask", task })
      : await Promise.resolve((() => {
          dispatch({ type: "addTask", task })
          return { ok: true }
        })())

    if (!result.ok) {
      toast.error("המשימה לא נשמרה", {
        description: "השמירה ל-Supabase נכשלה. אפשר לתקן ולנסות שוב.",
      })
      return
    }

    onCreated?.(task)
    onOpenChange(false)
    const areaSummary =
      normalizedAreaIds.length === 0
        ? "ללא אזור"
        : normalizedAreaIds.length === 1
          ? areaName(state, normalizedAreaIds[0])
          : `${normalizedAreaIds.length} אזורים`
    toast.success("משימה נוצרה", {
      description: state.offline
        ? "נשמר במכשיר – יסונכרן כשהקליטה תחזור"
        : `${areaSummary} • ${assigneeId === "me" ? "אני" : person?.name ?? "לא הוקצה"}`,
    })
  }

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title="משימה חדשה"
      description={
        (defaultAreaIds?.length || defaultAreaId) ? (
          <span className="inline-flex items-center gap-1 font-medium text-info">
            <MapPin className="size-3" />
            האזור הנוכחי מולא אוטומטית. אפשר להוסיף או להסיר אזורים.
          </span>
        ) : (
          "כל משימה נשמרת עם אזור, אחראי ומקור – כדי שאפשר יהיה לעקוב אחריה"
        )
      }
      footer={
        <Button className="h-12 w-full" onClick={save} disabled={!title.trim()}>
          <Check data-icon="inline-start" />
          צור משימה
        </Button>
      }
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="nt-title">מה צריך לעשות?</FieldLabel>
          <Input
            id="nt-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="לדוגמה: להכניס צוות חשמל לקומה 5 מערב"
            autoComplete="off"
          />
        </Field>

        <Field>
          <FieldLabel>אחראי</FieldLabel>
          <Select value={assigneeId} onValueChange={(v) => setAssigneeId(v as string)}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue className="text-start" />
            </SelectTrigger>
            <SelectContent>
              {(["me", "team", "contractor"] as const).map((g) => (
                <SelectGroup key={g}>
                  {g === "me" && (
                    <SelectItem value="me">אני — {GROUP_LABEL.me}</SelectItem>
                  )}
                  {state.people
                    .filter((p) => p.group === g && p.active !== false && p.id !== "me")
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {`${p.name} — ${GROUP_LABEL[g]}`}
                      </SelectItem>
                    ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel>אזורים</FieldLabel>
          <AreaMultiSelect
            areas={state.areas.filter((a) => a.active !== false)}
            value={areaIds}
            onChange={setAreaIds}
            placeholder="בחר אזור אחד או יותר"
          />
        </Field>

        <Field>
          <FieldLabel>יעד</FieldLabel>
          <div className="grid grid-cols-4 gap-1.5">
            {DUE_OPTIONS.map((o) => (
              <Button
                key={o.days}
                type="button"
                variant={dueDays === o.days ? "default" : "outline"}
                size="sm"
                className="h-10"
                onClick={() => setDueDays(o.days)}
              >
                {o.label}
              </Button>
            ))}
          </div>
        </Field>

        <Field>
          <FieldLabel>עדיפות</FieldLabel>
          <div className="grid grid-cols-4 gap-1.5">
            {(["critical", "high", "normal", "low"] as Priority[]).map((p) => (
              <Button
                key={p}
                type="button"
                variant={priority === p ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-10",
                  priority === p && p === "critical" && "bg-crit text-crit-foreground hover:bg-crit/90",
                )}
                onClick={() => setPriority(p)}
              >
                {PRIORITY_LABEL[p]}
              </Button>
            ))}
          </div>
        </Field>

        <Field>
          <FieldLabel htmlFor="nt-desc">פרטים (לא חובה)</FieldLabel>
          <Textarea
            id="nt-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="resize-none"
            placeholder="הקשר, מה נאמר, מה חסם"
          />
        </Field>
      </FieldGroup>
    </ResponsiveSheet>
  )
}
