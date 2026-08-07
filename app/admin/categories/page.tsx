import { Suspense } from "react"
import { CategoriesManager } from "@/components/admin/categories-manager"

export const dynamic = "force-dynamic"

export default function AdminCategoriesPage() {
  return (
    <Suspense>
      <CategoriesManager />
    </Suspense>
  )
}
