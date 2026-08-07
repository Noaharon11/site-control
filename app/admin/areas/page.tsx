import { Suspense } from "react"
import { AreasManager } from "@/components/admin/areas-manager"

export const dynamic = "force-dynamic"

export default function AdminAreasPage() {
  return (
    <Suspense>
      <AreasManager />
    </Suspense>
  )
}
