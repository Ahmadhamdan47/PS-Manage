"use client"

import { useState, useCallback, useEffect } from "react"
import { GenericTable } from "../shared/generic-table"
import { AddNotificationModal } from "./add-notification-modal"
import api from "@/lib/api"

interface Notification {
  id: number
  Title: string
  Message: string
  RecipientId: number | null
  IsRead: boolean
  createdAt: string
}

const columns = [
  { accessor: "id", title: "ID", width: 80 },
  { accessor: "Title", title: "Title", width: 200 },
  { accessor: "Message", title: "Message", width: 300 },
  { accessor: "RecipientId", title: "Recipient ID", width: 120 },
  { accessor: "IsRead", title: "Read Status", width: 120 },
  { accessor: "createdAt", title: "Created At", width: 180 },
]

const formatNotificationData = (notification: any): Notification => ({
  id: notification.id,
  Title: notification.Title || "N/A",
  Message: notification.Message || "N/A",
  RecipientId: notification.RecipientId || null,
  IsRead: notification.IsRead || false,
  createdAt: notification.createdAt || new Date().toISOString(),
})

export function NotificationTable() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [allNotifications, setAllNotifications] = useState<Notification[]>([])

  const fetchNotificationsFromAPI = useCallback(async (): Promise<Notification[]> => {
    try {
      const response = await api.get("/api/notifications")
      if (response.data && Array.isArray(response.data)) {
        return response.data.map(formatNotificationData)
      }
      return []
    } catch (error) {
      console.error("Error fetching notifications:", error)
      return []
    }
  }, [])

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotificationsFromAPI().then((data: Notification[]) => {
      setNotifications(data)
      setAllNotifications(data)
    })
  }, [fetchNotificationsFromAPI])

  return (
    <GenericTable
      title="Notifications"
      apiEndpoint="/api/notifications"
      columns={columns}
      data={notifications}
      setData={setNotifications}
      allData={allNotifications}
      setAllData={setAllNotifications}
      idField="id"
      AddModal={AddNotificationModal}
      formatData={formatNotificationData}
      fetchDataFromAPI={fetchNotificationsFromAPI}
    />
  )
}
