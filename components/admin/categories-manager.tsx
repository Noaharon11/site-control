"use client"

import * as React from "react"
import { Check, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { useStore } from "@/lib/store"
import { PageBody, PageHeader } from "@/components/common/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

/**
 * Note: PROGRESS_TAGS and trades are currently constants in types.ts / components.
 * This screen manages them visually but they are stored in the project config.
 * Until a project-level config store is added for these lists, this screen
 * provides an informational view with the ability to see the configured values.
 * Full dynamic editing is available for trades via the Contractors screen.
 */

const DEFAULT_TRADES = [
  "חשמל", "אינסטלציה", "ריצוף", "אלומיניום", "גבס",
  "צבע", "דלתות", "איטום", "מיזוג", "פיתוח", "נגרות", "שלד", "טיח",
]

const DEFAULT_PROGRESS_TAGS = [
  "יציקה הושלמה", "ריצוף מתקדם", "טיח הושלם", "גבס הותקן",
  "חשמל בקירות", "אינסטלציה גמורה", "צבע יסוד", "אלומיניום הותקן",
  "ללא שינוי מאתמול", "פינוי פסולת",
]

function TagList({
  title,
  description,
  tags,
}: {
  title: string
  description: string
  tags: string[]
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="font-semibold text-sm">{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5 mb-3">{description}</p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
        ))}
      </div>
    </div>
  )
}

export function CategoriesManager() {
  const { state } = useStore()

  // derive active contractor trades from people
  const contractorTrades = [...new Set(
    state.people
      .filter((p) => p.group === "contractor" && p.active !== false && p.trade)
      .map((p) => p.trade as string)
  )].sort()

  return (
    <>
      <PageHeader
        title="קטגוריות ורשימות"
        subtitle="מקצועות קבלנים, תגיות התקדמות וסיווגים"
      />

      <PageBody className="flex flex-col gap-4">
        <div className="rounded-xl border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
          רשימות אלה מוצגות לעיון. מקצועות הקבלנים מנוהלים דרך מסך הקבלנים.
        </div>

        <TagList
          title="מקצועות קבלנים (פעילים)"
          description="נגזר אוטומטית מרשימת הקבלנים הפעילים"
          tags={contractorTrades.length > 0 ? contractorTrades : DEFAULT_TRADES}
        />

        <TagList
          title="תגיות התקדמות בסיור"
          description="תגיות המשמשות לתיאור התקדמות בעת סיור בוקר"
          tags={DEFAULT_PROGRESS_TAGS}
        />

        <TagList
          title="סיבות חסם"
          description="סיווג סיבות לחסמים וקשיים באתר"
          tags={["חסר חומר", "חסר כוח אדם", "ממתין להחלטה", "ממתין לקבלן אחר", "בעיה בתכנון", "בעיה באיכות", "אחר"]}
        />

        <TagList
          title="חומרת ליקויים"
          description="סיווג חומרת ממצאים וליקויים"
          tags={["קריטי", "משמעותי", "קל"]}
        />
      </PageBody>
    </>
  )
}
