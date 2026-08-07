import { Suspense } from "react"
import { PeopleManager } from "@/components/admin/people-manager"

export const dynamic = "force-dynamic"

export default function AdminTeamPage() {
  return (
    <Suspense>
      <PeopleManager
        group="team"
        title="הצוות שלי"
        subtitle="עובדים פנימיים – מנהלים, עובדים ומהנדסים"
      />
    </Suspense>
  )
}
