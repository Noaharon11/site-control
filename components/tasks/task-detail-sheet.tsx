"use client"

import * as React from "react"
import Image from "next/image"
import {
  CalendarClock,
  Check,
  Footprints,
  Hand,
  ImagePlus,
  Loader2,
  MapPin,
  MessageSquarePlus,
  Phone,
  Route,
  Trash2,
  User,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import { personById, personName, taskAreaIds, taskAreaSummary } from "@/lib/selectors"
import { dayOffset, daysOpen, isOverdue, relativeDay, shortDate } from "@/lib/dates"
import { PRIORITY_LABEL, STATUS_LABEL, type Photo, type TaskStatus } from "@/lib/types"
import { ResponsiveSheet } from "@/components/common/responsive-sheet"
import { PhotoUpload } from "@/components/common/photo-upload"
import { PhotoDeleteDialog } from "@/components/common/photo-delete-dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { AgeChip, PriorityChip, StatusChip } from "@/components/common/chips"
import { AreaMultiSelect } from "@/components/tasks/area-multi-select"

const QUICK_STATUS: { value: TaskStatus; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "done", label: "הושלם", icon: Check },
  { value: "in_progress", label: "בטיפול", icon: Loader2 },
  { value: "open", label: "עדיין פתוח", icon: Hand },
]

export function TaskDetailSheet({
  taskId,
  onOpenChange,
}: {
  taskId: string | null
  onOpenChange: (v: boolean) => void
}) {
  const { state, dispatch, commitAction } = useStore()
  const [note, setNote] = React.useState("")
  const [areaIds, setAreaIds] = React.useState<string[]>([])
  const [showPhotoUpload, setShowPhotoUpload] = React.useState(false)
  const [deletePhoto, setDeletePhoto] = React.useState<Photo | null>(null)
  const task = state.tasks.find((t) => t.id === taskId)

  React.useEffect(() => {
    setNote("")
    setAreaIds(task ? taskAreaIds(task) : [])
    setShowPhotoUpload(false)
  }, [taskId, task])

  if (!task) {
    return <ResponsiveSheet open={false} onOpenChange={onOpenChange} title="">{null}</ResponsiveSheet>
  }

  const person = personById(state, task.assigneeId)
  const overdue = isOverdue(task.dueDate) && task.status !== "done"
  const photos = state.photos.filter((p) => task.photoIds?.includes(p.id))
  const observation = state.observations.find((o) => o.id === task.observationId)
  const decision = state.decisions.find((d) => d.id === task.decisionId)

  async function setStatus(status: TaskStatus) {
    const result = await commitAction({ type: "updateTask", id: task!.id, patch: { status } })
    if (!result.ok) return
    toast.success(status === "done" ? "המשימה הושלמה" : `הסטטוס עודכן ל"${STATUS_LABEL[status]}"`)
  }

  async function addNote() {
    if (!note.trim()) return
    const result = await commitAction({ type: "updateTask", id: task!.id, patch: {}, note: note.trim() })
    if (!result.ok) return
    setNote("")
    toast.success("הערה נוספה ליומן המשימה")
  }

  async function saveAreas() {
    if (!task) return
    const next = [...new Set(areaIds.filter(Boolean))]
    const result = await commitAction({
      type: "updateTask",
      id: task.id,
      patch: { areaIds: next },
      note: "עודכן שיוך אזורים למשימה",
    })
    if (!result.ok) return
    toast.success("שיוך האזורים עודכן")
  }

  return (
    <>
    <ResponsiveSheet
      open={Boolean(taskId)}
      onOpenChange={onOpenChange}
      title={task.title}
      description={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Route className="inline size-3" />
          מקור: {task.source}
          {` • ${taskAreaSummary(state, task)}`}
          {` • נוצר ${shortDate(task.createdAt)}`}
        </span>
      }
      footer={
        <div className="flex gap-2">
          {task.status !== "done" ? (
            <Button className="flex-1" onClick={() => setStatus("done")}>
              <Check data-icon="inline-start" />
              סמן כהושלם
            </Button>
          ) : (
            <Button variant="outline" className="flex-1" onClick={() => setStatus("open")}>
              החזר לפתוח
            </Button>
          )}
          <Button
            variant="outline"
            onClick={async () => {
              const result = await commitAction({
                type: "updateTask",
                id: task.id,
                patch: { dueDate: dayOffset(1) },
                note: "יעד נדחה למחר",
              })
              if (!result.ok) return
              toast("היעד נדחה למחר")
            }}
          >
            <CalendarClock data-icon="inline-start" />
            דחה למחר
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* meta */}
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusChip status={task.status} />
          <PriorityChip priority={task.priority} />
          <AgeChip days={daysOpen(task.createdAt)} />
        </div>

        {task.description && (
          <p className="text-sm leading-relaxed text-foreground text-pretty">{task.description}</p>
        )}

        {/* quick status */}
        {task.status !== "done" && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold text-muted-foreground">עדכון מהיר</p>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_STATUS.map((s) => (
                <Button
                  key={s.value}
                  variant={task.status === s.value ? "default" : "outline"}
                  size="sm"
                  className="h-11"
                  onClick={() => setStatus(s.value)}
                >
                  <s.icon data-icon="inline-start" />
                  {s.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* facts */}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div className="col-span-2 flex items-center justify-between gap-2">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="size-3.5" />
              אחראי
            </dt>
            <dd className="flex items-center gap-2 font-semibold">
              {personName(state, task.assigneeId)}
              {person?.phone && (
                <a
                  href={`tel:${person.phone}`}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted"
                >
                  <Phone className="size-3" />
                  {person.phone}
                </a>
              )}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3.5" />
              אזורים
            </dt>
            <dd className="font-semibold">{taskAreaSummary(state, task)}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClock className="size-3.5" />
              יעד
            </dt>
            <dd className={cn("nums font-semibold", overdue && "text-crit")}>
              {relativeDay(task.dueDate)}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">עדיפות</dt>
            <dd className="font-semibold">{PRIORITY_LABEL[task.priority]}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">גיל המשימה</dt>
            <dd className="nums font-semibold">{daysOpen(task.createdAt)} ימים</dd>
          </div>
        </dl>

        {/* source context */}
        {(observation || decision) && (
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <Footprints className="size-3.5" />
              ההקשר שממנו נוצרה המשימה
            </p>
            {observation && (
              <p className="mt-1.5 text-sm leading-relaxed text-foreground">
                <span className="font-semibold">תצפית:</span> {observation.text}
              </p>
            )}
            {decision && (
              <div className="mt-1.5 flex flex-col gap-1 text-sm leading-relaxed">
                <p>
                  <span className="font-semibold">סוכם עם {personName(state, decision.contractorId)}:</span>{" "}
                  {decision.commitment}
                </p>
                {decision.dueDate && (
                  <p className="nums text-xs text-muted-foreground">
                    עד {relativeDay(decision.dueDate)}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* photos */}
        {photos.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold text-muted-foreground">תמונות מקושרות</p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {photos.map((p) => (
                <figure key={p.id} className="group relative w-32 shrink-0">
                  <div className="relative aspect-4/3 overflow-hidden rounded-md border border-border">
                    <Image
                      src={p.url || "/placeholder.svg"}
                      alt={p.caption}
                      fill
                      sizes="128px"
                      className="object-cover"
                    />
                    <button
                      type="button"
                      aria-label="מחק תמונה"
                      onClick={() => setDeletePhoto(p)}
                      className="absolute end-1 top-1 hidden size-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:flex group-hover:opacity-100"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                  <figcaption className="nums mt-1 truncate text-[10px] text-muted-foreground">
                    {shortDate(p.date)} • {p.caption}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        )}

        <Separator />

        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold text-muted-foreground">אזורים</p>
          <AreaMultiSelect
            areas={state.areas.filter((a) => a.active !== false)}
            value={areaIds}
            onChange={setAreaIds}
            placeholder="בחר אזור אחד או יותר"
          />
          <Button variant="outline" size="sm" onClick={saveAreas}>
            שמור אזורים
          </Button>
        </div>

        <Separator />

        {/* timeline */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold text-muted-foreground">יומן המשימה</p>
          <ol className="flex flex-col">
            {task.history.map((h, i) => (
              <li key={`${h.date}-${i}`} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      i === task.history.length - 1 ? "bg-primary" : "bg-border",
                    )}
                  />
                  {i < task.history.length - 1 && <span className="w-px flex-1 bg-border" />}
                </div>
                <div className="pb-3">
                  <p className="nums text-[11px] font-medium text-muted-foreground">
                    {shortDate(h.date)}
                    {h.time ? ` • ${h.time}` : ""}
                  </p>
                  <p className="text-sm leading-snug text-foreground">{h.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* add note */}
        <div className="flex flex-col gap-2">
          <label htmlFor="task-note" className="text-xs font-bold text-muted-foreground">
            הוסף הערה
          </label>
          <Textarea
            id="task-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="מה קרה עם המשימה הזאת?"
            rows={2}
            className="resize-none"
          />
          <Button variant="outline" size="sm" onClick={addNote} disabled={!note.trim()}>
            <MessageSquarePlus data-icon="inline-start" />
            שמור הערה
          </Button>
        </div>

        <Separator />

        {/* photo upload */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground">תמונות</p>
            {!showPhotoUpload && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPhotoUpload(true)}
              >
                <ImagePlus data-icon="inline-start" />
                הוסף תמונה
              </Button>
            )}
          </div>
          {showPhotoUpload && task && taskAreaIds(task).length > 0 && (
            <PhotoUpload
              areaId={taskAreaIds(task)[0]!}
              taskId={task.id}
              onSuccess={() => setShowPhotoUpload(false)}
              onCancel={() => setShowPhotoUpload(false)}
            />
          )}
          {showPhotoUpload && task && taskAreaIds(task).length === 0 && (
            <p className="rounded-lg bg-muted px-3 py-2 text-[13px] text-muted-foreground">
              יש לשייך את המשימה לאזור לפני הוספת תמונה
            </p>
          )}
        </div>
      </div>
    </ResponsiveSheet>

    <PhotoDeleteDialog
      photo={deletePhoto}
      open={!!deletePhoto}
      onOpenChange={(v) => { if (!v) setDeletePhoto(null) }}
    />
    </>
  )
}
