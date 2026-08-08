"use client"

import * as React from "react"
import { CalendarPlus, Check, Loader2, Hand, Clock, UserCog, CircleDot, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useStore } from "@/lib/store"
import { dayOffset, today } from "@/lib/dates"
import { GROUP_LABEL, STATUS_LABEL, type Task, type TaskStatus } from "@/lib/types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const STATUS_OPTIONS: { value: TaskStatus; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "open", icon: CircleDot },
  { value: "in_progress", icon: Loader2 },
  { value: "waiting", icon: Clock },
  { value: "blocked", icon: Hand },
  { value: "done", icon: Check },
]

export function TaskQuickMenu({ task, trigger }: { task: Task; trigger: React.ReactElement }) {
  const { state, dispatch, commitAction } = useStore()
  const hasValidTaskId = typeof task.id === "string" && task.id.trim().length > 0

  async function setStatus(status: TaskStatus) {
    if (!hasValidTaskId) return
    const result = await commitAction({ type: "updateTask", id: task.id, patch: { status } })
    if (!result.ok) return
    toast.success(
      status === "done" ? `הושלם: ${task.title}` : `הסטטוס עודכן ל"${STATUS_LABEL[status]}"`,
      state.offline ? { description: "נשמר במכשיר – יסונכרן כשהקליטה תחזור" } : undefined,
    )
  }

  async function snooze(days: number, label: string) {
    if (!hasValidTaskId) return
    const result = await commitAction({
      type: "updateTask",
      id: task.id,
      patch: { dueDate: dayOffset(days) },
      note: `יעד נדחה ל${label}`,
    })
    if (!result.ok) return
    toast(`היעד נדחה ל${label}`)
  }

  async function reassign(id: string, group: Task["assigneeGroup"], name: string) {
    if (!hasValidTaskId) return
    const result = await commitAction({
      type: "updateTask",
      id: task.id,
      patch: { assigneeId: id, assigneeGroup: group },
      note: `הוקצה מחדש ל${name}`,
    })
    if (!result.ok) return
    toast(`הוקצה ל${name}`)
  }

  async function deleteTask() {
    if (!hasValidTaskId) return
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(`למחוק את המשימה "${task.title}"?`)
      if (!confirmed) return
    }
    const result = await commitAction({ type: "deleteTask", id: task.id })
    if (!result.ok) return
    toast.success(`המשימה נמחקה: ${task.title}`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate">{task.title}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          {task.status !== "done" && (
            <DropdownMenuItem onClick={() => setStatus("done")}>
              <Check className="text-ok" />
              סמן כהושלם
            </DropdownMenuItem>
          )}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <CircleDot />
              שנה סטטוס
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="min-w-40">
              <DropdownMenuGroup>
                {STATUS_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => setStatus(opt.value)}
                    disabled={opt.value === task.status}
                  >
                    <opt.icon />
                    {STATUS_LABEL[opt.value]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <CalendarPlus />
              דחה יעד
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="min-w-40">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => snooze(0, "היום")}>היום</DropdownMenuItem>
                <DropdownMenuItem onClick={() => snooze(1, "מחר")}>מחר</DropdownMenuItem>
                <DropdownMenuItem onClick={() => snooze(2, "מחרתיים")}>מחרתיים</DropdownMenuItem>
                <DropdownMenuItem onClick={() => snooze(7, "שבוע הבא")}>שבוע הבא</DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <UserCog />
              הקצה מחדש
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-72 min-w-48 overflow-y-auto">
              {(["me", "team", "contractor"] as const).map((group) => (
                <DropdownMenuGroup key={group}>
                  <DropdownMenuLabel>{GROUP_LABEL[group]}</DropdownMenuLabel>
                  {group === "me" && (
                    <DropdownMenuItem
                      onClick={() => reassign("me", "me", "אני")}
                      disabled={task.assigneeId === "me"}
                    >
                      אני
                    </DropdownMenuItem>
                  )}
                  {state.people
                    .filter((p) => p.group === group && p.active !== false && p.id !== "me")
                    .map((p) => (
                      <DropdownMenuItem
                        key={p.id}
                        onClick={() => reassign(p.id, p.group, p.name)}
                        disabled={p.id === task.assigneeId}
                      >
                        {p.name}
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuGroup>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={async () => {
              if (!hasValidTaskId) return
              const result = await commitAction({
                type: "updateTask",
                id: task.id,
                patch: { priority: task.priority === "critical" ? "normal" : "critical" },
                note: task.priority === "critical" ? "הורד מעדיפות קריטית" : "הועלה לעדיפות קריטית",
              })
              if (!result.ok) return
              toast(task.priority === "critical" ? "העדיפות עודכנה ל\u05e8\u05d2\u05d9\u05dc" : "סומן כקריטי")
            }}
          >
            <Hand />
            {task.priority === "critical" ? "בטל סימון קריטי" : "סמן כקריטי"}
          </DropdownMenuItem>
          {task.dueDate !== today() && task.status !== "done" && (
            <DropdownMenuItem onClick={() => snooze(0, "היום")}>
              <CalendarPlus />
              העבר להיום
            </DropdownMenuItem>
          )}
          <DropdownMenuItem variant="destructive" onClick={deleteTask}>
            <Trash2 />
            מחק משימה
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
