"use client"

import * as React from "react"
import { CloudOff, RefreshCw, SignalHigh, Check } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export function ConnectionPill({
  variant = "default",
  className,
}: {
  variant?: "default" | "sidebar" | "compact"
  className?: string
}) {
  const { state, dispatch, hydrated, syncNow, syncing, syncError, loadError, supabaseReady } = useStore()
  const offline = state.offline
  const pending = state.pendingCount
  const effectiveError = syncError ?? loadError
  const hasSyncError = Boolean(effectiveError)

  async function sync() {
    await syncNow()
    if (syncError) {
      toast.error("הסנכרון נכשל", { description: syncError })
      return
    }
    if (pending > 0) {
      toast.success("כל נתוני הסיור סונכרנו בהצלחה", {
        description: `${pending} עדכונים הועלו לשרת`,
      })
    }
  }

  if (!hydrated) {
    return <div className={cn("h-8 w-28 rounded-full bg-muted/60", className)} />
  }

  const label = offline
    ? "אין קליטה • נשמר במכשיר"
    : hasSyncError
      ? "שגיאת Supabase"
    : pending > 0
      ? `${pending} ממתינים`
      : supabaseReady
        ? "מסונכרן"
        : "ללא Supabase"

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              offline
                ? "border-warn/40 bg-warn-soft text-warn-foreground"
                : variant === "sidebar"
                  ? "border-sidebar-border bg-sidebar-accent/60 text-sidebar-foreground hover:bg-sidebar-accent"
                  : "border-border bg-card text-muted-foreground hover:bg-muted",
              variant === "sidebar" && "w-full justify-center",
              className,
            )}
            aria-label={`מצב חיבור: ${label}`}
          >
            {offline ? (
              <CloudOff className="size-3.5 shrink-0" />
            ) : (
              <span className="relative flex size-2 shrink-0">
                <span className="absolute inset-0 animate-ping rounded-full bg-ok/70" />
                <span className="relative size-2 rounded-full bg-ok" />
              </span>
            )}
            <span className={cn(variant === "compact" && "sr-only")}>{label}</span>
            {pending > 0 && (
              <span className="nums rounded-full bg-warn px-1.5 text-[10px] font-bold text-warn-foreground">
                {pending}
              </span>
            )}
          </button>
        }
      />
      <PopoverContent align="end" className="w-72 p-0">
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md",
                offline ? "bg-warn-soft text-warn-foreground" : "bg-ok-soft text-ok",
              )}
            >
              {offline ? <CloudOff className="size-4" /> : <SignalHigh className="size-4" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {offline ? "עובד ללא קליטה" : supabaseReady ? "מחובר ומסונכרן" : "Supabase לא מוגדר"}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {offline
                  ? "הסיור נמשך כרגיל. כל תצפית, משימה ותמונה נשמרות במכשיר ויסונכרנו כשהקליטה תחזור."
                : hasSyncError
                  ? effectiveError
                    : !supabaseReady
                    ? "יש להגדיר NEXT_PUBLIC_SUPABASE_URL ו-NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY כדי לשתף נתונים בין מכשירים."
                    : state.lastSyncAt
                      ? `סונכרן לאחרונה ב-${state.lastSyncAt}`
                      : "אין עדכונים ממתינים"}
              </p>
            </div>
          </div>

          {pending > 0 && (
            <div className="flex items-center justify-between rounded-md border border-warn/40 bg-warn-soft px-3 py-2">
              <span className="text-xs font-medium text-warn-foreground">
                <span className="nums font-bold">{pending}</span> עדכונים ממתינים לסנכרון
              </span>
            </div>
          )}

          {!offline && pending > 0 && supabaseReady && (
            <Button size="sm" onClick={sync} disabled={syncing} className="w-full">
              {syncing ? (
                <RefreshCw data-icon="inline-start" className="animate-spin" />
              ) : (
                <RefreshCw data-icon="inline-start" />
              )}
              {syncing ? "מסנכרן…" : "סנכרן עכשיו"}
            </Button>
          )}

          {!offline && !hasSyncError && pending === 0 && supabaseReady && (
            <div className="flex items-center gap-2 rounded-md bg-ok-soft px-3 py-2 text-xs font-medium text-ok">
              <Check className="size-3.5" />
              הכול מסונכרן
            </div>
          )}

          {!offline && syncError && (
            <div className="rounded-md border border-crit/40 bg-crit-soft/50 px-3 py-2 text-xs text-crit">
              הסנכרון האחרון נכשל: {syncError}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 rounded-md border border-dashed border-border px-3 py-2.5">
            <div>
              <p className="text-xs font-semibold text-foreground">מצב ללא קליטה</p>
              <p className="text-[11px] text-muted-foreground">הדגמה: מרתפים ללא קליטה</p>
            </div>
            <Switch
              checked={offline}
              onCheckedChange={(v) => {
                dispatch({ type: "toggleOffline", value: v })
                toast(v ? "אין קליטה • נשמר במכשיר" : "החיבור חזר", {
                  description: v
                    ? "אפשר להמשיך לעבוד – שום דבר לא ייאבד"
                    : pending > 0
                      ? `${pending} עדכונים ממתינים לסנכרון`
                      : undefined,
                })
              }}
              aria-label="הדמיית מצב ללא קליטה"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
