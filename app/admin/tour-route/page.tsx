import { Suspense } from "react"
import { TourRouteConfig } from "@/components/admin/tour-route-config"

export const dynamic = "force-dynamic"

export default function AdminTourRoutePage() {
  return (
    <Suspense>
      <TourRouteConfig />
    </Suspense>
  )
}
