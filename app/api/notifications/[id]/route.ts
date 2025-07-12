import { NextResponse } from "next/server"
import { notifications } from "@/app/api/notifications/route"

// PUT handler for updating a notification
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const notificationId = params.id
    const notificationData = await request.json()

    console.log(`Backend: Updating notification ${notificationId}:`, notificationData)

    // Try external API first
    try {
      const response = await fetch(`https://apiv2.medleb.org/notification/${notificationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(notificationData),
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("External API update success:", data)
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

    const updatedNotification = {
      ...notifications[notificationIndex],
      ...notificationData,
    }

    notifications[notificationIndex] = updatedNotification
    console.log("Local update success:", updatedNotification)

    return NextResponse.json({ ...updatedNotification, _note: "Updated locally due to external API error" })
  } catch (error) {
    console.error("Error updating notification:", error)
    return NextResponse.json({ error: "Failed to update notification", details: String(error) }, { status: 500 })
  }
}

// DELETE handler for deleting a notification
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const notificationId = params.id

    // Try external API first
    try {
      const response = await fetch(`https://apiv2.medleb.org/notification/${notificationId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      })

      if (response.ok) {
        const data = await response.json()
        return NextResponse.json(data)
      }
    } catch (apiError) {
      console.error("External API error:", apiError)
    }

    // Fallback to local implementation
    const notificationIndex = notifications.findIndex((n) => n.id.toString() === notificationId)

    if (notificationIndex === -1) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 })
    }

    notifications.splice(notificationIndex, 1)
    return NextResponse.json({ success: true, _note: "Deleted locally due to external API error" })
  } catch (error) {
    console.error("Error deleting notification:", error)
    return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 })
  }
}
