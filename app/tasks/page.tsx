import { Suspense } from "react"
import { TasksContent } from "@/components/tasks/tasks-content"

export const dynamic = "force-dynamic"

export default function TasksPage() {
  return (
    <Suspense>
      <TasksContent />
    </Suspense>
  )
}
