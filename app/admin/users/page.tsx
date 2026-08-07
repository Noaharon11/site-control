import { Suspense } from "react"
import { UsersManager } from "@/components/admin/users-manager"

export const dynamic = "force-dynamic"

export default function AdminUsersPage() {
  return (
    <Suspense>
      <UsersManager />
    </Suspense>
  )
}
