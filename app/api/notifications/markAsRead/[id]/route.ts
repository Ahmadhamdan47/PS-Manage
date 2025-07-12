import { NextResponse } from "next/server"
import { notifications } from "@/app/api/notifications/route"

// PUT handler for marking a notification as read
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const notificationId = params.id

    console.log(`Backend: Marking notification ${notificationId} as read`)

    // Try external API first
    try {
      const response = await fetch(`https://apiv2.medleb.org/notification/markAsRead/${notificationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("External API mark as read success:", data)
        return NextResponse.json(data)
      }
    } catch (apiError) {
      console.log("Falling back to local implementation due to:", apiError)
    }

    // Fallback to local implementation
    const notificationIndex = notifications.findIndex((n) => n.id.toString() === notificationId)

    if (notificationIndex === -1) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 })
    }

    notifications[notificationIndex].IsRead = true
    console.log("Local mark as read success:", notifications[notificationIndex])

    return NextResponse.json({
      ...notifications[notificationIndex],
      _note: "Marked as read locally due to external API error",
    })
  } catch (error) {
    console.error("Error marking notification as read:", error)
    return NextResponse.json({ error: "Failed to mark notification as read", details: String(error) }, { status: 500 })
  }
}
