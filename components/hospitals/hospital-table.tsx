"use client"

import { useState, useCallback, useEffect  } from "react"
import { GenericTable } from "../shared/generic-table"
import { AddHospitalModal } from "./add-hospital-modal"
import api from "@/lib/api"

interface Hospital {
  id: number
  name: string
  address: string
  phone: string
  email: string
  type: string
  capacity: number
  established: string
}

const columns = [
  { accessor: "id", title: "ID", width: 80 },
  { accessor: "name", title: "Hospital Name", width: 200 },
  { accessor: "type", title: "Type", width: 120 },
  { accessor: "sector", title: "Sector", width: 100 },
  { accessor: "region", title: "Region", width: 120 },
  { accessor: "municipality", title: "Municipality", width: 120 },
  { accessor: "town", title: "Town", width: 120 },
  { accessor: "phone", title: "Phone Number", width: 140 },
  { accessor: "cellular", title: "Cellular", width: 120 },
  { accessor: "whatsapp", title: "WhatsApp", width: 120 },
  { accessor: "email", title: "Email", width: 180 },
  { accessor: "website", title: "Website", width: 180 },
  { accessor: "contactPerson", title: "Contact Person", width: 150 },
  { accessor: "contactNumber", title: "Contact Number", width: 140 },
  { accessor: "contactEmail", title: "Contact Email", width: 180 },
]

const formatHospitalData = (h: any) => ({
  id: h.ID,
  name: h.hospitalName ?? "N/A",
  type: h.categoryType ?? "N/A",
  sector: h.isPrivate === true ? "Private" : h.isPrivate === false ? "Public" : "N/A",
  region: h.region ?? "N/A",
  municipality: h.municipality ?? "N/A",
  town: h.town ?? "N/A",
  phone: h.phoneNumber ?? "N/A",
  cellular: h.cellular ?? "N/A",
  whatsapp: h.whatsapp ?? "N/A",
  email: h.email ?? "N/A",
  website: h.website ?? "N/A",
  contactPerson: h.contactPerson ?? "N/A",
  contactNumber: h.contactNumber ?? "N/A",
  contactEmail: h.contactEmail ?? "N/A",
})

export function HospitalTable() {
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [allHospitals, setAllHospitals] = useState<Hospital[]>([])

  const fetchHospitalsFromAPI = useCallback(async (): Promise<Hospital[]> => {
    try {
      const response = await api.get("/api/hospitals")
      if (response.data && Array.isArray(response.data)) {
        return response.data.map(formatHospitalData)
      }
      return []
    } catch (error) {
      console.error("Error fetching hospitals:", error)
      return []
    }
  }, [])

  // Fetch hospitals on mount
  useEffect(() => {
    fetchHospitalsFromAPI().then((data: Hospital[]) => {
      setHospitals(data)
      setAllHospitals(data)
    })
  }, [fetchHospitalsFromAPI])

  return (
    <GenericTable
      title="Hospitals"
      apiEndpoint="/api/hospitals"
      columns={columns}
      data={hospitals}
      setData={setHospitals}
      allData={allHospitals}
      setAllData={setAllHospitals}
      idField="id"
      AddModal={AddHospitalModal}
      formatData={formatHospitalData}
      fetchDataFromAPI={fetchHospitalsFromAPI}
    />
  )
}
