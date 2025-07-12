"use client"

import { useState } from "react"
import api from "@/lib/api"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"

interface AddHospitalModalProps {
  opened: boolean
  onClose: () => void
  onAddSuccess: (newHospital: any) => void
}

export function AddHospitalModal({ opened, onClose, onAddSuccess }: AddHospitalModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Hospital information
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [type, setType] = useState("")
  const [capacity, setCapacity] = useState("")
  const [established, setEstablished] = useState("")

  const hospitalTypes = [
    "General Hospital",
    "University Hospital",
    "Private Hospital",
    "Public Hospital",
    "Specialty Hospital",
    "Emergency Hospital",
    "Rehabilitation Hospital",
    "Psychiatric Hospital",
  ]

  const handleSubmit = async () => {
    if (!name) {
      alert("Hospital name is required")
      return
    }

    setIsSubmitting(true)

    try {
      const hospitalData = {
        name,
        address: address || null,
        phone: phone || null,
        email: email || null,
        type: type || null,
        capacity: capacity ? Number.parseInt(capacity) : 0,
        established: established || null,
      }

      const response = await api.post("/api/hospitals", hospitalData)
      console.log("Hospital added successfully:", response.data)

      onAddSuccess(response.data)
      onClose()

      // Reset form
      setName("")
      setAddress("")
      setPhone("")
      setEmail("")
      setType("")
      setCapacity("")
      setEstablished("")
    } catch (error) {
      console.error("Error adding hospital:", error)
      alert("Failed to add hospital. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={opened} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Add New Hospital</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 p-2">
            <div className="space-y-2">
              <Label htmlFor="name">Hospital Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter hospital name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter hospital address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Hospital Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select hospital type" />
                </SelectTrigger>
                <SelectContent>
                  {hospitalTypes.map((hospitalType) => (
                    <SelectItem key={hospitalType} value={hospitalType}>
                      {hospitalType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity (beds)</Label>
              <Input
                id="capacity"
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="Enter bed capacity"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="established">Year Established</Label>
              <Input
                id="established"
                value={established}
                onChange={(e) => setEstablished(e.target.value)}
                placeholder="Enter year established"
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !name}>
            {isSubmitting ? "Adding..." : "Add Hospital"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
