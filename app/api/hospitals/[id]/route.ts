import { NextResponse } from "next/server"
import { hospitals } from "@/app/api/hospitals/route"

// PUT handler for updating a hospital
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const hospitalId = params.id
    const hospitalData = await request.json()

    console.log(`Backend: Updating hospital ${hospitalId}:`, hospitalData)

    // Try external API first
    try {
      const response = await fetch(`https://apiv2.medleb.org/hospitals/${hospitalId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(hospitalData),
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
    const hospitalIndex = hospitals.findIndex((h) => h.id.toString() === hospitalId)

    if (hospitalIndex === -1) {
      return NextResponse.json({ error: "Hospital not found" }, { status: 404 })
    }

    const updatedHospital = {
      ...hospitals[hospitalIndex],
      ...hospitalData,
    }

    hospitals[hospitalIndex] = updatedHospital
    console.log("Local update success:", updatedHospital)

    return NextResponse.json({ ...updatedHospital, _note: "Updated locally due to external API error" })
  } catch (error) {
    console.error("Error updating hospital:", error)
    return NextResponse.json({ error: "Failed to update hospital", details: String(error) }, { status: 500 })
  }
}

// DELETE handler for deleting a hospital
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const hospitalId = params.id

    // Try external API first
    try {
      const response = await fetch(`https://apiv2.medleb.org/hospitals/${hospitalId}`, {
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
    const hospitalIndex = hospitals.findIndex((h) => h.id.toString() === hospitalId)

    if (hospitalIndex === -1) {
      return NextResponse.json({ error: "Hospital not found" }, { status: 404 })
    }

    hospitals.splice(hospitalIndex, 1)
    return NextResponse.json({ success: true, _note: "Deleted locally due to external API error" })
  } catch (error) {
    console.error("Error deleting hospital:", error)
    return NextResponse.json({ error: "Failed to delete hospital" }, { status: 500 })
  }
}
