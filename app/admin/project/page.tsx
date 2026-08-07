import { Suspense } from "react"
import { ProjectSettings } from "@/components/admin/project-settings"

export const dynamic = "force-dynamic"

export default function AdminProjectPage() {
  return (
    <Suspense>
      <ProjectSettings />
    </Suspense>
  )
}
