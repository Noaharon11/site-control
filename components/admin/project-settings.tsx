"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { toast } from "sonner"
import { useStore } from "@/lib/store"
import { PageBody, PageHeader } from "@/components/common/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "planning", label: "תכנון" },
  { value: "active", label: "פעיל" },
  { value: "finishing", label: "גמר" },
  { value: "completed", label: "הושלם" },
  { value: "on_hold", label: "מוקפא" },
]

export function ProjectSettings() {
  const { state, dispatch } = useStore()
  const p = state.project

  const [name, setName] = React.useState(p.name)
  const [description, setDescription] = React.useState(p.description ?? "")
  const [address, setAddress] = React.useState(p.address ?? "")
  const [companyName, setCompanyName] = React.useState(p.companyName ?? "")
  const [apartments, setApartments] = React.useState(String(p.apartments))
  const [floors, setFloors] = React.useState(String(p.floors))
  const [basements, setBasements] = React.useState(String(p.basements))
  const [startedAt, setStartedAt] = React.useState(p.startedAt)
  const [expectedCompletion, setExpectedCompletion] = React.useState(p.expectedCompletionDate ?? "")
  const [status, setStatus] = React.useState(p.status)

  // keep form in sync if state changes externally (e.g. reset)
  React.useEffect(() => {
    setName(p.name)
    setDescription(p.description ?? "")
    setAddress(p.address ?? "")
    setCompanyName(p.companyName ?? "")
    setApartments(String(p.apartments))
    setFloors(String(p.floors))
    setBasements(String(p.basements))
    setStartedAt(p.startedAt)
    setExpectedCompletion(p.expectedCompletionDate ?? "")
    setStatus(p.status)
  }, [p])

  function save() {
    if (!name.trim()) return
    dispatch({
      type: "updateProject",
      patch: {
        name: name.trim(),
        description: description.trim() || undefined,
        address: address.trim() || undefined,
        companyName: companyName.trim() || undefined,
        apartments: Number(apartments) || p.apartments,
        floors: Number(floors) || p.floors,
        basements: Number(basements) || p.basements,
        startedAt,
        expectedCompletionDate: expectedCompletion || undefined,
        status: status as typeof p.status,
      },
    })
    toast.success("פרטי הפרויקט עודכנו")
  }

  return (
    <>
      <PageHeader
        title="פרטי הפרויקט"
        subtitle="הגדרות כלליות של הפרויקט"
        actions={
          <Button size="sm" onClick={save} disabled={!name.trim()}>
            <Check data-icon="inline-start" />
            שמור שינויים
          </Button>
        }
      />

      <PageBody>
        <div className="max-w-xl">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="proj-name">שם הפרויקט *</FieldLabel>
              <Input
                id="proj-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="לדוגמה: פרויקט הרקפות"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="proj-desc">תיאור קצר</FieldLabel>
              <Textarea
                id="proj-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="תיאור הפרויקט, מספר יחידות, אפיון..."
                rows={2}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="proj-addr">כתובת</FieldLabel>
              <Input
                id="proj-addr"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="רחוב, עיר"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="proj-company">שם החברה / יזם</FieldLabel>
              <Input
                id="proj-company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="שם החברה הקבלנית או היזם"
              />
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <Field>
                <FieldLabel htmlFor="proj-apts">דירות</FieldLabel>
                <Input
                  id="proj-apts"
                  type="number"
                  min={0}
                  value={apartments}
                  onChange={(e) => setApartments(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="proj-floors">קומות</FieldLabel>
                <Input
                  id="proj-floors"
                  type="number"
                  min={0}
                  value={floors}
                  onChange={(e) => setFloors(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="proj-basements">מרתפים</FieldLabel>
                <Input
                  id="proj-basements"
                  type="number"
                  min={0}
                  value={basements}
                  onChange={(e) => setBasements(e.target.value)}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="proj-start">תאריך התחלה</FieldLabel>
                <Input
                  id="proj-start"
                  type="date"
                  value={startedAt}
                  onChange={(e) => setStartedAt(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="proj-end">תאריך סיום משוער</FieldLabel>
                <Input
                  id="proj-end"
                  type="date"
                  value={expectedCompletion}
                  onChange={(e) => setExpectedCompletion(e.target.value)}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel>סטטוס פרויקט</FieldLabel>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof p.status)}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
        </div>
      </PageBody>
    </>
  )
}
