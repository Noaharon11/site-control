"use client"

import { use } from "react"
import { TourDetailView } from "@/components/history/tour-detail-view"

export default function TourHistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  return <TourDetailView tourId={id} />
}
