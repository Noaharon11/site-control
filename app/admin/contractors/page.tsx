import { Suspense } from "react"
import { PeopleManager } from "@/components/admin/people-manager"

export const dynamic = "force-dynamic"

export default function AdminContractorsPage() {
  return (
    <Suspense>
      <PeopleManager
        group="contractor"
        title="קבלנים"
        subtitle="קבלני משנה ונותני שירות – כל הקבלנים הפעילים בפרויקט"
      />
    </Suspense>
  )
}
