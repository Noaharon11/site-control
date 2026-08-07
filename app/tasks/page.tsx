import { Suspense } from "react"
import { TasksContent } from "@/components/tasks/tasks-content"

export default function TasksPage() {
  return (
    <Suspense>
      <TasksContent />
    </Suspense>
  )
}
