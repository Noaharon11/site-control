"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CalendarRange,
  ClipboardList,
  Footprints,
  History,
  LayoutGrid,
  Building2,
  FileText,
  Settings2,
  Sun,
  RefreshCw,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import { ConnectionPill } from "./connection-pill"
import { openTasks, overdueTasks } from "@/lib/selectors"

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  mobile?: boolean
}

const NAV: NavItem[] = [
  { href: "/", label: "היום", icon: Sun, mobile: true },
  { href: "/tour", label: "סיור בוקר", icon: Footprints, mobile: true },
  { href: "/tasks", label: "משימות", icon: ClipboardList, mobile: true },
  { href: "/status", label: "מצב הפרויקט", icon: Building2, mobile: true },
  { href: "/weekly", label: "תכנון שבועי", icon: CalendarRange },
  { href: "/reports", label: "דוחות", icon: FileText },
  { href: "/history", label: "היסטוריה", icon: History, mobile: true },
  { href: "/admin", label: "ניהול מערכת", icon: Settings2, mobile: true },
]

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  return pathname.startsWith(href)
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { state, hydrated, bootstrapping, loadError, usingCachedFallback, retryLoad } = useStore()

  const open = openTasks(state).length
  const overdue = overdueTasks(state).length

  const badges: Record<string, number> = {
    "/tasks": open,
  }

  return (
    <div className="min-h-dvh lg:flex lg:flex-row-reverse">
      {/* ---------------------------------------------- desktop rail (right) */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:gap-1 bg-sidebar text-sidebar-foreground border-e border-sidebar-border sticky top-0 h-dvh">
        <div className="flex items-center gap-3 px-5 pt-6 pb-5">
          <div className="flex size-9 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <LayoutGrid className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{hydrated ? state.project.name : "פרויקט"}</p>
            <p className="truncate text-xs text-sidebar-foreground/60">
              {hydrated ? `${state.project.apartments} דירות • ${state.project.floors} קומות` : ""}
            </p>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5 px-3">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href)
            const count = badges[item.href]
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <item.icon className="size-[18px] shrink-0" />
                <span className="flex-1">{item.label}</span>
                {hydrated && count ? (
                  <span className="nums rounded bg-sidebar-foreground/10 px-1.5 py-0.5 text-[11px] font-semibold">
                    {count}
                  </span>
                ) : null}
                {active && <span className="h-5 w-0.5 rounded-full bg-sidebar-primary" />}
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-3 border-t border-sidebar-border p-4">
          {hydrated && overdue > 0 && (
            <Link
              href="/tasks?tab=overdue"
              className="flex items-center justify-between rounded-md bg-crit/15 px-3 py-2 text-xs font-medium text-sidebar-foreground hover:bg-crit/25"
            >
              <span>משימות באיחור</span>
              <span className="nums font-bold">{overdue}</span>
            </Link>
          )}
          <ConnectionPill variant="sidebar" />
        </div>
      </aside>

      {/* ------------------------------------------------------------ content */}
      <div className="flex min-w-0 flex-1 flex-col pb-[env(safe-area-inset-bottom)]">
        {bootstrapping ? (
          <main className="flex min-h-[40dvh] items-center justify-center px-4 py-10 lg:px-8">
            <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 text-center">
              <RefreshCw className="size-5 animate-spin text-primary" />
              <p className="text-sm font-semibold text-foreground">טוען נתונים מ-Supabase…</p>
              <p className="text-xs text-muted-foreground">המערכת מוודאת שהנתונים העדכניים נטענו לפני הצגה.</p>
            </div>
          </main>
        ) : loadError && !usingCachedFallback ? (
          <main className="flex min-h-[40dvh] items-center justify-center px-4 py-10 lg:px-8">
            <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-xl border border-crit/30 bg-card p-6 text-center">
              <AlertTriangle className="size-5 text-crit" />
              <p className="text-sm font-semibold text-foreground">לא ניתן לטעון את הנתונים</p>
              <p className="text-xs leading-relaxed text-muted-foreground">נסה שוב. הנתונים ב-Supabase לא נטענו ולכן לא מוצג מצב ריק מטעה.</p>
              <Button size="sm" onClick={retryLoad}>
                <RefreshCw data-icon="inline-start" />
                נסה שוב
              </Button>
            </div>
          </main>
        ) : (
          <>
            {loadError && usingCachedFallback && (
              <div className="border-b border-warn/30 bg-warn-soft px-4 py-2 text-center text-xs font-medium text-warn-foreground lg:px-8">
                מוצגים נתונים שמורים מקומית עד ש-Supabase יחזור להגיב. <button type="button" className="underline underline-offset-2" onClick={retryLoad}>נסה שוב</button>
              </div>
            )}
            {children}
          </>
        )}
      </div>

      {/* ------------------------------------------------- mobile bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur lg:hidden print:hidden">
        <ul className="flex items-stretch justify-around px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1">
          {NAV.filter((n) => n.mobile).map((item) => {
            const active = isActive(pathname, item.href)
            const count = badges[item.href]
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className={cn(
                    "relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="relative">
                    <item.icon className={cn("size-5", active && "stroke-[2.4]")} />
                    {hydrated && count ? (
                      <span className="nums absolute -top-1.5 -end-2 min-w-4 rounded-full bg-crit px-1 text-[9px] font-bold leading-4 text-crit-foreground">
                        {count}
                      </span>
                    ) : null}
                  </span>
                  <span className="truncate">{item.label}</span>
                  {active && (
                    <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
