import { NextResponse } from "next/server"

// Sample notification data for fallback
const notifications = [
  {
    id: 1,
    Title: "System Maintenance",
    Message: "The system will be under maintenance from 2:00 AM to 4:00 AM",
    RecipientId: null,
    IsRead: false,
    createdAt: "2024-01-15T10:30:00Z",
  },
  {
    id: 2,
    Title: "New Drug Added",
    Message: "A new drug has been added to the database: Aspirin 100mg",
    RecipientId: 1,
    IsRead: true,
    createdAt: "2024-01-14T15:45:00Z",
  },
  {
    id: 3,
    Title: "Hospital Registration",
    Message: "New hospital registered: City Medical Center",
    RecipientId: null,
    IsRead: false,
    createdAt: "2024-01-13T09:20:00Z",
  },
]

// Make notifications available for import
export { notifications }

// GET handler to return all notifications
export async function GET() {
  try {
    // Try to fetch from external API first
    const response = await fetch("https://apiv2.medleb.org/notification/all", {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    })

    const contentType = response.headers.get("content-type")
    if (contentType && contentType.includes("text/html")) {
      console.error("External API returned HTML instead of JSON")
      return NextResponse.json(notifications)
    }

    if (response.ok) {
      const data = await response.json()
      if (Array.isArray(data)) {
        return NextResponse.json(data)
      }
    }

    // Fallback to local data
    return NextResponse.json(notifications)
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json(notifications)
  }
}

// POST handler to add a new notification
export async function POST(request: Request) {
  try {
    const data = await request.json()

    // Try external API first
    try {
      const response = await fetch("https://apiv2.medleb.org/notification/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      })

      if (response.ok) {
        const result = await response.json()
        return NextResponse.json(result, { status: 201 })
      }
    } catch (apiError) {
      console.error("External API error:", apiError)
    }

    // Fallback to local implementation
    const newId = Math.max(...notifications.map((n) => n.id)) + 1
    const newNotification = {
      id: newId,
      Title: data.Title,
      Message: data.Message,
      RecipientId: data.RecipientId || null,
      IsRead: data.IsRead || false,
      createdAt: new Date().toISOString(),
    }

    notifications.push(newNotification)
    return NextResponse.json(newNotification, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to add notification" }, { status: 400 })
  }
}
