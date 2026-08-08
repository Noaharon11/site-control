import type { ISODate } from "./types"

const HE_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"]
const HE_MONTHS = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
]

export function toISO(d: Date): ISODate {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function today(): ISODate {
  return toISO(new Date())
}

/** ISO date n days from today (negative = past) */
export function dayOffset(n: number, from?: ISODate): ISODate {
  const base = from ? parseISO(from) : new Date()
  base.setDate(base.getDate() + n)
  return toISO(base)
}

export function parseISO(s: ISODate): Date {
  const [y, m, d] = s.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export function diffDays(a: ISODate, b: ISODate): number {
  const ms = parseISO(a).getTime() - parseISO(b).getTime()
  return Math.round(ms / 86400000)
}

/** how many days a record has been open, relative to today */
export function daysOpen(created: ISODate): number {
  return Math.max(0, diffDays(today(), created))
}

/** grammatical Hebrew age of an open record: "נפתח היום" / "פתוח יומיים" */
export function ageLabel(created: ISODate): string {
  const n = daysOpen(created)
  if (n === 0) return "נפתח היום"
  if (n === 1) return "פתוח מאתמול"
  if (n === 2) return "פתוח יומיים"
  return `פתוח ${n} ימים`
}

export function isOverdue(due: ISODate | null): boolean {
  if (!due) return false
  return diffDays(due, today()) < 0
}

/** "היום" / "אתמול" / "מחר" / "יום שני 11.8" */
export function relativeDay(d: ISODate | null): string {
  if (!d) return "ללא יעד"
  const delta = diffDays(d, today())
  if (delta === 0) return "היום"
  if (delta === 1) return "מחר"
  if (delta === -1) return "אתמול"
  if (delta === 2) return "מחרתיים"
  if (delta < 0) return `באיחור ${Math.abs(delta)} ימים`
  const date = parseISO(d)
  return `יום ${HE_DAYS[date.getDay()]} ${date.getDate()}.${date.getMonth() + 1}`
}

/** "06/08" compact */
export function shortDate(d: ISODate): string {
  const date = parseISO(d)
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`
}

/** "יום חמישי, 7 באוגוסט 2026" */
export function longDate(d: ISODate): string {
  const date = parseISO(d)
  return `יום ${HE_DAYS[date.getDay()]}, ${date.getDate()} ב${HE_MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

export function dayName(d: ISODate): string {
  return HE_DAYS[parseISO(d).getDay()]
}

/** Sunday-based work week (Sun–Thu) containing `d` */
export function workWeek(d: ISODate = today()): ISODate[] {
  const date = parseISO(d)
  const sunday = new Date(date)
  sunday.setDate(date.getDate() - date.getDay())
  return Array.from({ length: 5 }, (_, i) => {
    const x = new Date(sunday)
    x.setDate(sunday.getDate() + i)
    return toISO(x)
  })
}

export function nowTime(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

export function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "בוקר טוב"
  if (h < 17) return "צהריים טובים"
  return "ערב טוב"
}

/** "08.08.2026" – Hebrew-style DD.MM.YYYY */
export function heDate(d: ISODate): string {
  const date = parseISO(d)
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`
}

/** Difference in minutes between two "HH:MM" strings, or null */
export function minutesBetween(start: string | null, end: string | null): number | null {
  if (!start || !end) return null
  const [sh, sm] = start.split(":").map(Number)
  const [eh, em] = end.split(":").map(Number)
  const diff = (eh * 60 + em) - (sh * 60 + sm)
  return diff > 0 ? diff : null
}

/** "1 שעה 6 דקות" / "45 דקות" */
export function durationLabel(minutes: number | null): string {
  if (!minutes) return ""
  if (minutes < 60) return `${minutes} דקות`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const hLabel = h === 1 ? "שעה" : `${h} שעות`
  return m > 0 ? `${hLabel} ${m} דקות` : hLabel
}
