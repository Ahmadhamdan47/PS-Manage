import { NextResponse } from "next/server"

// Sample hospital data for fallback
const hospitals = [
  {
    id: 1,
    name: "American University of Beirut Medical Center",
    address: "Hamra, Beirut, Lebanon",
    phone: "+961-1-350000",
    email: "info@aubmc.org.lb",
    type: "University Hospital",
    capacity: 420,
    established: "1902",
  },
  {
    id: 2,
    name: "Hotel Dieu de France Hospital",
    address: "Achrafieh, Beirut, Lebanon",
    phone: "+961-1-615300",
    email: "info@hdf.usj.edu.lb",
    type: "General Hospital",
    capacity: 350,
    established: "1923",
  },
  {
    id: 3,
    name: "Clemenceau Medical Center",
    address: "Clemenceau, Beirut, Lebanon",
    phone: "+961-1-372888",
    email: "info@cmc.com.lb",
    type: "Private Hospital",
    capacity: 200,
    established: "2001",
  },
]

// Make hospitals available for import
export { hospitals }

// GET handler to return all hospitals
export async function GET() {
  try {
    // Try to fetch from external API first
    const response = await fetch("https://apiv2.medleb.org/hospitals", {
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
      return NextResponse.json(hospitals)
    }

    if (response.ok) {
      const data = await response.json()
      if (Array.isArray(data)) {
        return NextResponse.json(data)
      }
    }

    // Fallback to local data
    return NextResponse.json(hospitals)
  } catch (error) {
    console.error("Error fetching hospitals:", error)
    return NextResponse.json(hospitals)
  }
}

// POST handler to add a new hospital
export async function POST(request: Request) {
  try {
    const data = await request.json()

    // Try external API first
    try {
      const response = await fetch("https://apiv2.medleb.org/hospitals", {
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
    const newId = Math.max(...hospitals.map((h) => h.id)) + 1
    const newHospital = {
      id: newId,
      name: data.name,
      address: data.address,
      phone: data.phone,
      email: data.email,
      type: data.type,
      capacity: data.capacity,
      established: data.established,
    }

    hospitals.push(newHospital)
    return NextResponse.json(newHospital, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to add hospital" }, { status: 400 })
  }
}
