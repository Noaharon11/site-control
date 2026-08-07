"use client"

import * as React from "react"
import { Check, Mail, Pencil, Phone, Plus, Search, UserX } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import type { User, UserRole } from "@/lib/types"
import { PageBody, PageHeader } from "@/components/common/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ResponsiveSheet } from "@/components/common/responsive-sheet"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
import { UserSquare2 } from "lucide-react"
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

const ROLE_OPTIONS: UserRole[] = [
  "מנהל פרויקט",
  "מנהל עבודה",
  "מהנדס ביצוע",
  "עובד",
  "צפייה בלבד",
]

// ---------------------------------------------------------------- sheet ---

function UserSheet({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: User
}) {
  const { dispatch, uid } = useStore()
  const isEdit = Boolean(initial)

  const [name, setName] = React.useState(initial?.name ?? "")
  const [email, setEmail] = React.useState(initial?.email ?? "")
  const [phone, setPhone] = React.useState(initial?.phone ?? "")
  const [role, setRole] = React.useState<UserRole>(initial?.role ?? "עובד")

  React.useEffect(() => {
    if (!open) return
    setName(initial?.name ?? "")
    setEmail(initial?.email ?? "")
    setPhone(initial?.phone ?? "")
    setRole(initial?.role ?? "עובד")
  }, [open, initial])

  function save() {
    if (!name.trim()) return
    if (isEdit && initial) {
      dispatch({
        type: "updateUser",
        id: initial.id,
        patch: {
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          role,
        },
      })
      toast.success("פרטי המשתמש עודכנו")
    } else {
      const user: User = {
        id: uid("u"),
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        role,
        active: true,
      }
      dispatch({ type: "addUser", user })
      toast.success("משתמש נוסף", { description: user.name })
    }
    onOpenChange(false)
  }

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "עריכת משתמש" : "משתמש חדש"}
      footer={
        <Button className="h-12 w-full" onClick={save} disabled={!name.trim()}>
          <Check data-icon="inline-start" />
          {isEdit ? "שמור שינויים" : "הוסף משתמש"}
        </Button>
      }
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="u-name">שם מלא *</FieldLabel>
          <Input
            id="u-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="שם מלא"
            autoComplete="off"
          />
        </Field>

        <Field>
          <FieldLabel>תפקיד</FieldLabel>
          <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="u-email">אימייל</FieldLabel>
          <Input
            id="u-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            dir="ltr"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="u-phone">טלפון</FieldLabel>
          <Input
            id="u-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="050-0000000"
            dir="ltr"
          />
        </Field>
      </FieldGroup>
    </ResponsiveSheet>
  )
}

// ----------------------------------------------------------------- main ---

export function UsersManager() {
  const { state } = useStore()
  const [query, setQuery] = React.useState("")
  const [showInactive, setShowInactive] = React.useState(false)
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [editUser, setEditUser] = React.useState<User | undefined>()
  const [archiveUser, setArchiveUser] = React.useState<User | undefined>()

  const users = (state.users ?? [])
    .filter((u) => showInactive || u.active !== false)
    .filter((u) => {
      if (!query) return true
      const q = query.toLowerCase()
      return (
        u.name.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q)
      )
    })

  function openCreate() {
    setEditUser(undefined)
    setSheetOpen(true)
  }

  return (
    <>
      <PageHeader
        title="משתמשים"
        subtitle="ניהול משתמשי המערכת ותפקידים"
        actions={
          <Button size="sm" className="h-9" onClick={openCreate}>
            + הוסף משתמש
          </Button>
        }
      >
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חיפוש משתמש, תפקיד, אימייל..."
              className="h-10 pe-9"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Switch id="show-inactive-u" checked={showInactive} onCheckedChange={setShowInactive} />
            <Label htmlFor="show-inactive-u" className="text-xs text-muted-foreground whitespace-nowrap">
              כולל לא פעיל
            </Label>
          </div>
        </div>
      </PageHeader>

      <PageBody className="flex flex-col gap-3">
        {users.length === 0 ? (
          <Empty className="rounded-xl border border-border bg-card py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon"><UserSquare2 /></EmptyMedia>
              <EmptyTitle>אין משתמשים</EmptyTitle>
              <EmptyDescription>
                {query ? "לא נמצאו תוצאות לחיפוש" : "עדיין לא נוספו משתמשים"}
              </EmptyDescription>
            </EmptyHeader>
            {!query && (
              <Button size="sm" onClick={openCreate}>
                + הוסף משתמש
              </Button>
            )}
          </Empty>
        ) : (
          <ul className="flex flex-col gap-2">
            {users.map((u) => (
              <li key={u.id}>
                <div className={cn(
                  "flex items-start gap-3 rounded-xl border border-border bg-card p-3",
                  u.active === false && "opacity-50",
                )}>
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm select-none">
                    {u.name.slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{u.name}</span>
                      <Badge variant="secondary" className="text-xs">{u.role}</Badge>
                      {u.active === false && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">לא פעיל</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1">
                      {u.email && (
                        <a href={`mailto:${u.email}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" dir="ltr">
                          <Mail className="size-3" />{u.email}
                        </a>
                      )}
                      {u.phone && (
                        <a href={`tel:${u.phone}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" dir="ltr">
                          <Phone className="size-3" />{u.phone}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="size-8 p-0" onClick={() => { setEditUser(u); setSheetOpen(true) }}>
                      <Pencil className="size-4" />
                      <span className="sr-only">עריכה</span>
                    </Button>
                    {u.active !== false && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setArchiveUser(u)}
                      >
                        <UserX className="size-4" />
                        <span className="sr-only">השבת</span>
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PageBody>

      <UserSheet open={sheetOpen} onOpenChange={setSheetOpen} initial={editUser} />

      {archiveUser && (
        <Dialog open={Boolean(archiveUser)} onOpenChange={(v) => { if (!v) setArchiveUser(undefined) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>להשבית משתמש?</DialogTitle>
              <DialogDescription>
                {archiveUser.name} לא יוכל להתחבר למערכת. ניתן לשחזר בעתיד.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">ביטול</Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={() => {
                  dispatch({ type: "archiveUser", id: archiveUser.id })
                  toast.success(`${archiveUser.name} הושבת`)
                  setArchiveUser(undefined)
                }}
              >
                השבת משתמש
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
