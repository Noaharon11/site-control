"use client"

import * as React from "react"
import { Check, Pencil, Phone, Plus, Search, UserX } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import type { Person, PersonGroup } from "@/lib/types"
import { PageBody, PageHeader } from "@/components/common/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ResponsiveSheet } from "@/components/common/responsive-sheet"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
import { Users } from "lucide-react"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// -------------------------------------------------------- person sheet ----

function PersonSheet({
  open,
  onOpenChange,
  group,
  initial,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  group: PersonGroup
  initial?: Person
}) {
  const { dispatch, uid } = useStore()
  const isEdit = Boolean(initial)
  const isContractor = group === "contractor"

  const [name, setName] = React.useState(initial?.name ?? "")
  const [role, setRole] = React.useState(initial?.role ?? "")
  const [trade, setTrade] = React.useState(initial?.trade ?? "")
  const [phone, setPhone] = React.useState(initial?.phone ?? "")
  const [email, setEmail] = React.useState(initial?.email ?? "")
  const [notes, setNotes] = React.useState(initial?.notes ?? "")

  React.useEffect(() => {
    if (!open) return
    setName(initial?.name ?? "")
    setRole(initial?.role ?? "")
    setTrade(initial?.trade ?? "")
    setPhone(initial?.phone ?? "")
    setEmail(initial?.email ?? "")
    setNotes(initial?.notes ?? "")
  }, [open, initial])

  function save() {
    if (!name.trim()) return
    if (isEdit && initial) {
      dispatch({
        type: "updatePerson",
        id: initial.id,
        patch: {
          name: name.trim(),
          role: role.trim(),
          trade: isContractor ? trade.trim() || undefined : undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          notes: notes.trim() || undefined,
        },
      })
      toast.success("הפרטים עודכנו")
    } else {
      const person: Person = {
        id: uid(group === "contractor" ? "c" : "p"),
        name: name.trim(),
        group,
        role: role.trim(),
        trade: isContractor ? trade.trim() || undefined : undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
        active: true,
      }
      dispatch({ type: "addPerson", person })
      toast.success(isContractor ? "קבלן נוסף" : "עובד נוסף", { description: person.name })
    }
    onOpenChange(false)
  }

  const title = isEdit
    ? isContractor ? "עריכת קבלן" : "עריכת עובד"
    : isContractor ? "קבלן חדש" : "עובד חדש"

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      footer={
        <Button className="h-12 w-full" onClick={save} disabled={!name.trim()}>
          <Check data-icon="inline-start" />
          {isEdit ? "שמור שינויים" : isContractor ? "הוסף קבלן" : "הוסף עובד"}
        </Button>
      }
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="ps-name">{isContractor ? "שם החברה / קבלן *" : "שם מלא *"}</FieldLabel>
          <Input
            id="ps-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isContractor ? "לדוגמה: חשמל הצפון" : "לדוגמה: יוסי לוי"}
            autoComplete="off"
          />
        </Field>

        {isContractor && (
          <Field>
            <FieldLabel htmlFor="ps-trade">מקצוע / תחום</FieldLabel>
            <Input
              id="ps-trade"
              value={trade}
              onChange={(e) => setTrade(e.target.value)}
              placeholder="לדוגמה: חשמל, ריצוף, גבס"
            />
          </Field>
        )}

        <Field>
          <FieldLabel htmlFor="ps-role">{isContractor ? "תפקיד / תיאור" : "תפקיד"}</FieldLabel>
          <Input
            id="ps-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder={isContractor ? "לדוגמה: קבלן חשמל" : "לדוגמה: מנהל עבודה"}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="ps-phone">טלפון</FieldLabel>
          <Input
            id="ps-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="050-0000000"
            dir="ltr"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="ps-email">אימייל</FieldLabel>
          <Input
            id="ps-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            dir="ltr"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="ps-notes">הערות</FieldLabel>
          <Textarea
            id="ps-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="מידע נוסף..."
            rows={2}
          />
        </Field>
      </FieldGroup>
    </ResponsiveSheet>
  )
}

// --------------------------------------------------------- archive dialog ---

function ArchiveDialog({
  person,
  open,
  onOpenChange,
}: {
  person: Person
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const { dispatch } = useStore()

  function handleArchive() {
    dispatch({ type: "archivePerson", id: person.id })
    toast.success(`${person.name} הועבר/ה לארכיון`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>להעביר לארכיון?</DialogTitle>
          <DialogDescription>
            {person.name} יוסר מהרשימה הפעילה אך ישמר בהיסטוריה. ניתן לשחזר בעתיד.
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

export function PeopleManager({
  group,
  title,
  subtitle,
}: {
  group: PersonGroup
  title: string
  subtitle: string
}) {
  const { state } = useStore()
  const [query, setQuery] = React.useState("")
  const [showInactive, setShowInactive] = React.useState(false)
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [editPerson, setEditPerson] = React.useState<Person | undefined>()
  const [archivePerson, setArchivePerson] = React.useState<Person | undefined>()

  const people = state.people
    .filter((p) => p.group === group)
    .filter((p) => showInactive || p.active !== false)
    .filter((p) => {
      if (!query) return true
      const q = query.toLowerCase()
      return (
        p.name.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q) ||
        (p.trade ?? "").toLowerCase().includes(q) ||
        (p.phone ?? "").includes(q)
      )
    })

  function openCreate() {
    setEditPerson(undefined)
    setSheetOpen(true)
  }

  function openEdit(p: Person) {
    setEditPerson(p)
    setSheetOpen(true)
  }

  const isContractor = group === "contractor"
  const addLabel = isContractor ? "+ הוסף קבלן" : "+ הוסף עובד"

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <Button size="sm" className="h-9" onClick={openCreate}>
            {addLabel}
          </Button>
        }
      >
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isContractor ? "חיפוש קבלן, מקצוע..." : "חיפוש עובד, תפקיד..."}
              className="h-10 pe-9"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Switch
              id="show-inactive"
              checked={showInactive}
              onCheckedChange={setShowInactive}
            />
            <Label htmlFor="show-inactive" className="text-xs text-muted-foreground whitespace-nowrap">
              כולל לא פעיל
            </Label>
          </div>
        </div>
      </PageHeader>

      <PageBody className="flex flex-col gap-3">
        {people.length === 0 ? (
          <Empty className="rounded-xl border border-border bg-card py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon"><Users /></EmptyMedia>
              <EmptyTitle>{isContractor ? "אין קבלנים" : "אין עובדים"}</EmptyTitle>
              <EmptyDescription>
                {query ? "לא נמצאו תוצאות לחיפוש" : `עדיין לא נוספו ${isContractor ? "קבלנים" : "עובדים"}`}
              </EmptyDescription>
            </EmptyHeader>
            {!query && (
              <Button size="sm" onClick={openCreate}>
                {addLabel}
              </Button>
            )}
          </Empty>
        ) : (
          <ul className="flex flex-col gap-2">
            {people.map((p) => (
              <li key={p.id}>
                <div
                  className={cn(
                    "flex items-start gap-3 rounded-xl border border-border bg-card p-3",
                    p.active === false && "opacity-50",
                  )}
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm select-none">
                    {p.name.slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{p.name}</span>
                      {isContractor && p.trade && (
                        <Badge variant="secondary" className="text-xs">{p.trade}</Badge>
                      )}
                      {p.active === false && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">לא פעיל</Badge>
                      )}
                    </div>
                    {p.role && <p className="text-xs text-muted-foreground mt-0.5">{p.role}</p>}
                    {p.phone && (
                      <a
                        href={`tel:${p.phone}`}
                        className="inline-flex items-center gap-1 mt-1 text-xs text-muted-foreground hover:text-foreground"
                        dir="ltr"
                      >
                        <Phone className="size-3" />
                        {p.phone}
                      </a>
                    )}
                    {p.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{p.notes}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="size-8 p-0" onClick={() => openEdit(p)}>
                      <Pencil className="size-4" />
                      <span className="sr-only">עריכה</span>
                    </Button>
                    {p.active !== false && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setArchivePerson(p)}
                      >
                        <UserX className="size-4" />
                        <span className="sr-only">ארכיון</span>
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PageBody>

      <PersonSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        group={group}
        initial={editPerson}
      />

      {archivePerson && (
        <ArchiveDialog
          person={archivePerson}
          open={Boolean(archivePerson)}
          onOpenChange={(v) => { if (!v) setArchivePerson(undefined) }}
        />
      )}
    </>
  )
}
