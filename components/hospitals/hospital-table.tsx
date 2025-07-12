"use client"

import { useState, useCallback, useEffect } from "react"
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
  { accessor: "name", title: "Hospital Name", width: 250 },
  { accessor: "address", title: "Address", width: 200 },
  { accessor: "phone", title: "Phone", width: 150 },
  { accessor: "email", title: "Email", width: 200 },
  { accessor: "type", title: "Type", width: 150 },
  { accessor: "capacity", title: "Capacity", width: 100 },
  { accessor: "established", title: "Established", width: 120 },
]

const formatHospitalData = (hospital: any): Hospital => ({
  id: hospital.id,
  name: hospital.name || "N/A",
  address: hospital.address || "N/A",
  phone: hospital.phone || "N/A",
  email: hospital.email || "N/A",
  type: hospital.type || "N/A",
  capacity: hospital.capacity || 0,
  established: hospital.established || "N/A",
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
