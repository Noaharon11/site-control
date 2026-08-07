import { Suspense } from "react"
import { AdminHub } from "@/components/admin/admin-hub"

export const dynamic = "force-dynamic"

export default function AdminPage() {
  return (
    <Suspense>
      <AdminHub />
    </Suspense>
  )
}
