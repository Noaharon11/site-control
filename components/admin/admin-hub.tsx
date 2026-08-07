"use client"

import Link from "next/link"
import {
  Building2,
  ClipboardList,
  Footprints,
  HardHat,
  Settings2,
  Users,
  UserSquare2,
} from "lucide-react"
import { PageBody, PageHeader } from "@/components/common/page-header"

const SECTIONS = [
  {
    href: "/admin/project",
    icon: Settings2,
    label: "פרטי הפרויקט",
    description: "שם, כתובת, תאריכים, סטטוס",
  },
  {
    href: "/admin/users",
    icon: UserSquare2,
    label: "משתמשים",
    description: "ניהול משתמשי המערכת ותפקידים",
  },
  {
    href: "/admin/team",
    icon: Users,
    label: "הצוות שלי",
    description: "עובדים פנימיים – מנהלים, עובדים, מהנדסים",
  },
  {
    href: "/admin/contractors",
    icon: HardHat,
    label: "קבלנים",
    description: "קבלני משנה ונותני שירות",
  },
  {
    href: "/admin/areas",
    icon: Building2,
    label: "מבנה הפרויקט",
    description: "אזורים, קומות, כניסות",
  },
  {
    href: "/admin/tour-route",
    icon: Footprints,
    label: "מסלול סיור בוקר",
    description: "סדר ואזורי הסיור היומי",
  },
  {
    href: "/admin/categories",
    icon: ClipboardList,
    label: "קטגוריות ורשימות",
    description: "מקצועות קבלנים, תגיות התקדמות",
  },
]

export function AdminHub() {
  return (
    <>
      <PageHeader
        title="ניהול מערכת"
        subtitle="הגדרות פרויקט, אנשים, אזורים ורשימות"
      />

      <PageBody className="flex flex-col gap-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="flex items-start gap-4 rounded-xl border border-border bg-card p-4 hover:bg-muted transition-colors"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-foreground">{s.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{s.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </PageBody>
    </>
  )
}
