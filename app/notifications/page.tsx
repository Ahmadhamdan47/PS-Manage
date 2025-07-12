"use client"

import { useState, useEffect } from "react"
import { NotificationTable } from "@/components/notifications/notification-table"
import { Loader2 } from "lucide-react"

export default function NotificationsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(false)
  }, [])

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 flex items-center justify-center h-[70vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#00A651]" />
          <p>Loading notifications...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <NotificationTable />
    </div>
  )
}
