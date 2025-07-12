"use client"

import { useState } from "react"
import api from "@/lib/api"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"

interface AddNotificationModalProps {
  opened: boolean
  onClose: () => void
  onAddSuccess: (newNotification: any) => void
}

export function AddNotificationModal({ opened, onClose, onAddSuccess }: AddNotificationModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Notification information
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [recipientId, setRecipientId] = useState("")
  const [isRead, setIsRead] = useState(false)

  const handleSubmit = async () => {
    if (!title || !message) {
      alert("Title and message are required")
      return
    }

    setIsSubmitting(true)

    try {
      const notificationData = {
        Title: title,
        Message: message,
        RecipientId: recipientId ? Number.parseInt(recipientId) : null,
        IsRead: isRead,
      }

      const response = await api.post("/api/notifications", notificationData)
      console.log("Notification added successfully:", response.data)

      onAddSuccess(response.data)
      onClose()

      // Reset form
      setTitle("")
      setMessage("")
      setRecipientId("")
      setIsRead(false)
    } catch (error) {
      console.error("Error adding notification:", error)
      alert("Failed to add notification. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={opened} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Add New Notification</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 p-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter notification title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter notification message"
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipientId">Recipient ID (optional)</Label>
              <Input
                id="recipientId"
                type="number"
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                placeholder="Enter recipient ID (leave empty for all users)"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="isRead" checked={isRead} onCheckedChange={(checked) => setIsRead(checked === true)} />
              <Label htmlFor="isRead">Mark as read</Label>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !title || !message}>
            {isSubmitting ? "Adding..." : "Add Notification"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
