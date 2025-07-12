"use client"

import type React from "react"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useHotkeys } from "@mantine/hooks"
import api from "@/lib/api"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Loader2,
  Search,
  Filter,
  ChevronDown,
  X,
  Check,
  Settings,
  Download,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  FilterX,
  Maximize,
  Minimize,
  Undo,
  Redo,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ColumnFilter } from "../drug-table/column-filter"
import { exportToExcel } from "../drug-table/export-utils"
import { useLocalStorage } from "../drug-table/use-local-storage"

const tableStyles = `
  .generic-table-container ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
    display: block !important;
  }
  
  .generic-table-container ::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }
  
  .generic-table-container ::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
  }
  
  .generic-table-container ::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
  
  .generic-table-container {
    overflow: auto;
  }

  .table-scroll-container {
    overflow-x: scroll !important;
    overflow-y: auto;
    width: 100%;
    height: 100%;
    scrollbar-width: auto;
    scrollbar-color: #888 #f1f1f1;
  }

  .table-scroll-container::-webkit-scrollbar {
    display: block !important;
    height: 10px !important;
    width: 10px;
  }

  .table-scroll-container::-webkit-scrollbar-thumb {
    background-color: #888;
    border-radius: 4px;
  }
`

// Types
interface TableSettings {
  rowColorScheme: "white-green" | "light-green" | "light-blue"
  cellSize: number
  enableVirtualization: boolean
  confirmBeforeRefresh: boolean
  autoSaveState: boolean
  visibleColumns: Record<string, boolean>
}

interface GenericTableProps<T> {
  title: string
  apiEndpoint: string
  columns: Array<{ accessor: string; title: string; width: number }>
  data: T[]
  setData: (data: T[]) => void
  allData: T[]
  setAllData: (data: T[]) => void
  idField: string
  AddModal: React.ComponentType<{
    opened: boolean
    onClose: () => void
    onAddSuccess: (newItem: T) => void
  }>
  formatData: (item: any) => T
  fetchDataFromAPI: () => Promise<T[]>
}

interface CellProps {
  value: any
  rowId: string
  column: string
  isDragging: boolean
  dragValue: any
  dragColumnId: string | null
  cellStatus: "pending" | "confirmed" | "rejected" | "modified" | null
  isSelected: boolean
  onMouseDown: (value: any, columnId: string, rowId: string) => void
  onMouseEnter: (rowId: string) => void
  onClick: (rowId: string, columnId: string, ctrlKey: boolean) => void
}

// Debounce utility function
function debounce(func: (...args: any[]) => void, wait: number) {
  let timeout: NodeJS.Timeout | null
  return function (this: any, ...args: any[]) {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(this, args), wait)
  }
}

// Get unique values from data
const getUniqueValues = (data: any[], column: string) => {
  return Array.from(new Set(data.map((row) => row[column])))
    .filter((value) => value !== null && value !== undefined && value !== "" && value !== "N/A")
    .sort()
}

// Export data to CSV
const exportToCSV = (data: any[], columns: any[], filename: string) => {
  const header = columns.map((col) => `"${col.title}"`).join(",")
  const rows = data.map((row) => {
    return columns
      .map((col) => {
        const value = row[col.accessor]
        return `"${value?.toString().replace(/"/g, '""') || ""}"`
      })
      .join(",")
  })
  const csv = [header, ...rows].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Cell component
const Cell = ({
  value,
  rowId,
  column,
  isDragging,
  dragValue,
  dragColumnId,
  cellStatus,
  isSelected,
  onMouseDown,
  onMouseEnter,
  onClick,
}: CellProps) => {
  const isBeingDraggedOver = isDragging && dragColumnId === column
  const displayValue = isBeingDraggedOver ? dragValue : value

  return (
    <div
      className={cn(
        "relative p-2 whitespace-nowrap overflow-hidden text-ellipsis transition-all duration-200",
        isBeingDraggedOver && "bg-[#e6f7ef] border-2 border-[#00A651]",
        cellStatus === "modified" && "bg-[#d1f0e0]",
        isSelected && "bg-[#e6f7ef]",
      )}
      onMouseDown={() => onMouseDown(value, column, rowId)}
      onMouseEnter={() => onMouseEnter(rowId)}
      onClick={(e) => onClick(rowId, column, e.ctrlKey)}
    >
      {displayValue === "N/A" || displayValue === null ? (
        <span className="text-gray-400">N/A</span>
      ) : (
        <span>{displayValue}</span>
      )}
    </div>
  )
}

// Enhanced Header component
interface EnhancedHeaderProps {
  column: any
  onResize: (columnId: string, width: number) => void
  onSort: (columnId: string) => void
  sortDirection: "asc" | "desc" | null
  sortColumn: string | null
  onFilter: (columnId: string, values: string[]) => void
  activeFilters: Record<string, string[]>
  filterOptions: string[]
}

const EnhancedHeader = ({
  column,
  onResize,
  onSort,
  sortDirection,
  sortColumn,
  onFilter,
  activeFilters,
  filterOptions,
}: EnhancedHeaderProps) => {
  const isFiltered = activeFilters[column.accessor]?.length > 0
  const isSorted = sortColumn === column.accessor

  return (
    <th
      style={{
        width: column.width,
        position: "relative",
        padding: "8px",
      }}
      className="text-black"
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center font-bold cursor-pointer text-black" onClick={() => onSort(column.accessor)}>
          {column.title}
          {isSorted && (
            <span className="ml-1">
              {sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            </span>
          )}
        </div>

        <div className="flex items-center">
          {isFiltered && (
            <Badge variant="outline" className="mr-1">
              {activeFilters[column.accessor].length}
            </Badge>
          )}

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className={isFiltered ? "text-[#00A651]" : ""}>
                <Filter className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <ColumnFilter
                columnId={column.accessor}
                columnTitle={column.title}
                options={filterOptions}
                selectedValues={activeFilters[column.accessor] || []}
                onChange={(values) => onFilter(column.accessor, values)}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize opacity-0 hover:opacity-100 bg-[#00A651]"
        onMouseDown={(e) => {
          e.preventDefault()
          const startX = e.clientX
          const startWidth = column.width

          const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX
            const newWidth = Math.max(50, startWidth + deltaX)
            onResize(column.accessor, newWidth)
          }

          const handleMouseUp = () => {
            document.removeEventListener("mousemove", handleMouseMove)
            document.removeEventListener("mouseup", handleMouseUp)
          }

          document.addEventListener("mousemove", handleMouseMove)
          document.addEventListener("mouseup", handleMouseUp)
        }}
      />
    </th>
  )
}

export function GenericTable<T extends Record<string, any>>({
  title,
  apiEndpoint,
  columns: initialColumns,
  data: tableData,
  setData: setTableData,
  allData,
  setAllData,
  idField,
  AddModal,
  formatData,
  fetchDataFromAPI,
}: GenericTableProps<T>) {
  // State management
  const [isLoading, setIsLoading] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [globalFilter, setGlobalFilter] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)

  // Column state
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})

  // Settings state
  const [settings, setSettings] = useLocalStorage<TableSettings>({
    key: `${title.toLowerCase().replace(/\s+/g, "-")}-table-settings`,
    defaultValue: {
      rowColorScheme: "white-green",
      cellSize: 25,
      enableVirtualization: false,
      confirmBeforeRefresh: true,
      autoSaveState: false,
      visibleColumns: {},
    },
  })

  // Selection state
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set())
  const [lastSelectedRow, setLastSelectedRow] = useState<string | null>(null)

  // History for undo/redo functionality
  const [history, setHistory] = useState<T[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Drag and drop functionality
  const [isDragging, setIsDragging] = useState(false)
  const [dragValue, setDragValue] = useState<any>(null)
  const [dragColumnId, setDragColumnId] = useState<string | null>(null)

  // Confirmation indicators
  const [changedCells, setChangedCells] = useState<Record<string, "pending" | "confirmed" | "rejected" | "modified">>(
    {},
  )

  // Pending changes
  const [pendingChanges, setPendingChanges] = useState<
    Array<{
      rowId: string
      columnId: string
      oldValue: any
      newValue: any
    }>
  >([])

  // Save results
  const [saveResults, setSaveResults] = useState<
    Array<{
      rowId: string
      columnId: string
      success: boolean
      message: string
    }>
  >([])

  const [showSaveResultsModal, setShowSaveResultsModal] = useState(false)
  const tableContainerRef = useRef<HTMLDivElement>(null)

  // Sorting and filtering state
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null)
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})
  const [activeFilters, setActiveFilters] = useState<string[]>([])

  // Editing state
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<any>({})

  // Event handlers
  const handleMouseUp = useCallback(() => {
    handleCellMouseUp()
  }, [])

  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp)
    return () => {
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [handleMouseUp])

  // Hotkeys
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      const previousState = JSON.parse(JSON.stringify(history[newIndex]))
      setTableData(previousState)
      setChangedCells({})
      setPendingChanges([])
      setHasUnsavedChanges(true)
      showNotification("Undo successful", "info")
    } else {
      showNotification("Nothing to undo", "info")
    }
  }, [historyIndex, history])

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setTableData(JSON.parse(JSON.stringify(history[newIndex])))
      setChangedCells({})
      setHasUnsavedChanges(true)
      showNotification("Redo successful", "info")
    } else {
      showNotification("Nothing to redo", "info")
    }
  }, [historyIndex, history])

  const saveTableState = useCallback(() => {
    saveAllChanges()
  }, [])

  useHotkeys([
    ["mod+Z", handleUndo],
    ["mod+Y", handleRedo],
    ["mod+S", saveTableState],
  ])

  // Load data on mount
  useEffect(() => {
    fetchData()
  }, [fetchDataFromAPI])

  // Add to history when tableData changes
  useEffect(() => {
    if (
      tableData.length > 0 &&
      (history.length === 0 || JSON.stringify(tableData) !== JSON.stringify(history[historyIndex]))
    ) {
      const newHistoryEntry = JSON.parse(JSON.stringify(tableData))
      const newHistory =
        historyIndex < history.length - 1
          ? [...history.slice(0, historyIndex + 1), newHistoryEntry]
          : [...history, newHistoryEntry]

      setHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
      setHasUnsavedChanges(true)
    }
  }, [tableData])

  // Functions
  const fetchData = async () => {
    setIsLoading(true)
    try {
      const data = await fetchDataFromAPI()
      setTableData(data)
      setAllData(data)

      // Initialize history
      setHistory([JSON.parse(JSON.stringify(data))])
      setHistoryIndex(0)

      // Initialize column visibility
      if (Object.keys(settings.visibleColumns).length === 0 && data.length > 0) {
        const initialVisibility: Record<string, boolean> = {}
        Object.keys(data[0] || {}).forEach((key) => {
          initialVisibility[key] = true
        })
        setSettings((prev) => ({ ...prev, visibleColumns: initialVisibility }))
      }

      showNotification(`Loaded ${data.length} items successfully`, "success")
    } catch (error) {
      console.error("Error fetching data:", error)
      setTableData([])
      setAllData([])
      setHistory([[]])
      setHistoryIndex(0)
      showNotification("Failed to load data: Server error", "error")
    } finally {
      setIsLoading(false)
    }
  }

  const showNotification = (message: string, type: "success" | "error" | "info") => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const handleCellMouseDown = (value: any, columnId: string, rowId: string) => {
    if (value && value !== "N/A") {
      setDragValue(value)
      setDragColumnId(columnId)
      setIsDragging(true)
      document.body.style.userSelect = "none"
    }
  }

  const handleCellMouseUp = () => {
    setIsDragging(false)
    setDragValue(null)
    setDragColumnId(null)
    document.body.style.userSelect = ""
  }

  const handleCellMouseEnter = (rowId: string) => {
    if (isDragging && dragValue && dragColumnId) {
      const row = tableData.find((row) => row[idField].toString() === rowId)
      if (!row) return

      const currentValue = String(row[dragColumnId] || "")
      const newValue = String(dragValue)

      if (currentValue !== newValue) {
        const existingChangeIndex = pendingChanges.findIndex(
          (change) => change.rowId === rowId && change.columnId === dragColumnId,
        )

        if (existingChangeIndex === -1) {
          setPendingChanges((prev) => [
            ...prev,
            {
              rowId,
              columnId: dragColumnId,
              oldValue: row[dragColumnId],
              newValue: dragValue,
            },
          ])
        } else {
          setPendingChanges((prev) => {
            const newChanges = [...prev]
            newChanges[existingChangeIndex].newValue = dragValue
            return newChanges
          })
        }

        setChangedCells((prev) => ({
          ...prev,
          [`${rowId}-${dragColumnId}`]: "modified",
        }))

        setTableData((prevData) =>
          prevData.map((item) => {
            if (item[idField].toString() === rowId) {
              return { ...item, [dragColumnId]: dragValue }
            }
            return item
          }),
        )

        setHasUnsavedChanges(true)
      }
    }
  }

  const saveAllChanges = async () => {
    if (pendingChanges.length === 0) {
      showNotification("No changes to save", "info")
      return
    }

    setIsLoading(true)
    const results = []

    for (const change of pendingChanges) {
      const { rowId, columnId, newValue } = change

      try {
        const payload = {
          [idField]: Number.parseInt(rowId),
          [columnId]: newValue === "N/A" ? null : newValue,
        }

        await api.put(`${apiEndpoint}/${rowId}`, payload)

        results.push({
          rowId,
          columnId,
          success: true,
          message: `Successfully updated ${columnId} for item ${rowId}`,
        })
      } catch (error) {
        results.push({
          rowId,
          columnId,
          success: false,
          message: `Failed to update ${columnId}: ${(error as any).message || "Unknown error"}`,
        })
      }
    }

    setIsLoading(false)
    setSaveResults(results)
    setShowSaveResultsModal(true)

    const successfulRowColumns = results.filter((r) => r.success).map((r) => `${r.rowId}-${r.columnId}`)

    setPendingChanges((prev) =>
      prev.filter((change) => !successfulRowColumns.includes(`${change.rowId}-${change.columnId}`)),
    )

    setChangedCells((prev) => {
      const newState = { ...prev }
      successfulRowColumns.forEach((key) => {
        delete newState[key]
      })
      return newState
    })

    const successCount = results.filter((r) => r.success).length
    const failCount = results.length - successCount

    if (failCount === 0) {
      showNotification(`Successfully saved all ${successCount} changes`, "success")
      setHasUnsavedChanges(false)
    } else {
      showNotification(`Saved ${successCount} changes, but ${failCount} failed. See details.`, "info")
    }
  }

  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      if (sortDirection === "asc") {
        setSortDirection("desc")
      } else if (sortDirection === "desc") {
        setSortColumn(null)
        setSortDirection(null)
      }
    } else {
      setSortColumn(columnId)
      setSortDirection("asc")
    }
  }

  const updateColumnFilters = (columnId: string, values: string[]) => {
    setColumnFilters((prev) => ({
      ...prev,
      [columnId]: values,
    }))
    setActiveFilters(Object.keys(columnFilters).filter((key) => columnFilters[key] && columnFilters[key].length > 0))
  }

  const handleColumnResize = (columnId: string, width: number) => {
    setColumnWidths((prev) => ({
      ...prev,
      [columnId]: width,
    }))
  }

  const toggleColumnVisibility = (columnId: string) => {
    setSettings({
      ...settings,
      visibleColumns: {
        ...settings.visibleColumns,
        [columnId]: !settings.visibleColumns[columnId],
      },
    })
  }

  const handleExportCSV = () => {
    const visibleColumns = columns.filter((col) => settings.visibleColumns[col.accessor] !== false)
    const dataToExport = filteredData.map((row: any) => {
      const exportRow: Record<string, any> = {}
      visibleColumns.forEach((col) => {
        exportRow[col.accessor] = row[col.accessor]
      })
      return exportRow
    })
    exportToCSV(
      dataToExport,
      visibleColumns,
      `${title.toLowerCase().replace(/\s+/g, "-")}-export-${new Date().toISOString().slice(0, 10)}.csv`,
    )
    showNotification("Data exported to CSV successfully", "success")
  }

  const handleCellClick = (rowId: string, columnId: string, ctrlKey: boolean) => {
    const cellKey = `${rowId}-${columnId}`
    if (ctrlKey) {
      setSelectedCells((prev) => {
        const newSelection = new Set(prev)
        if (newSelection.has(cellKey)) {
          newSelection.delete(cellKey)
        } else {
          newSelection.add(cellKey)
        }
        return newSelection
      })
    } else {
      setSelectedCells(new Set([cellKey]))
    }
  }

  const handleRowSelect = (rowId: string, ctrlKey: boolean, shiftKey: boolean) => {
    if (ctrlKey) {
      setSelectedRows((prev) => {
        const newSelection = new Set(prev)
        if (newSelection.has(rowId)) {
          newSelection.delete(rowId)
        } else {
          newSelection.add(rowId)
        }
        return newSelection
      })
      setLastSelectedRow(rowId)
    } else if (shiftKey && lastSelectedRow) {
      const allRowIds = paginatedData.map((row) => row[idField].toString())
      const startIdx = allRowIds.indexOf(lastSelectedRow)
      const endIdx = allRowIds.indexOf(rowId)

      if (startIdx !== -1 && endIdx !== -1) {
        const start = Math.min(startIdx, endIdx)
        const end = Math.max(startIdx, endIdx)
        const rangeIds = allRowIds.slice(start, end + 1)
        setSelectedRows(new Set(rangeIds))
      }
    } else {
      setSelectedRows(new Set([rowId]))
      setLastSelectedRow(rowId)
    }
  }

  const clearSelections = () => {
    setSelectedRows(new Set())
    setSelectedCells(new Set())
    setLastSelectedRow(null)
  }

  const deleteSelectedRows = async () => {
    if (selectedRows.size === 0) return

    if (window.confirm(`Are you sure you want to delete ${selectedRows.size} selected item(s)?`)) {
      setIsLoading(true)

      try {
        const promises = Array.from(selectedRows).map((rowId) =>
          api.delete(`${apiEndpoint}/${rowId}`).catch((error) => {
            console.error(`Error deleting item ${rowId}:`, error)
            return { error, rowId }
          }),
        )

        const results = await Promise.all(promises)
        const failedDeletes = results.filter((result) => "error" in result)

        setTableData((prevData) => prevData.filter((item) => !selectedRows.has(item[idField].toString())))
        setAllData((prevData) => prevData.filter((item) => !selectedRows.has(item[idField].toString())))

        clearSelections()

        if (failedDeletes.length > 0) {
          showNotification(
            `Deleted ${selectedRows.size - failedDeletes.length} items, but ${failedDeletes.length} failed`,
            "info",
          )
        } else {
          showNotification(`Successfully deleted ${selectedRows.size} items`, "success")
        }
      } catch (error) {
        console.error("Error during batch delete:", error)
        showNotification("Error during batch delete operation", "error")
      } finally {
        setIsLoading(false)
      }
    }
  }

  const getFilterOptions = (columnId: string) => {
    const uniqueValues = new Set<string>()
    allData.forEach((row) => {
      const value = row[columnId]
      if (value !== null && value !== undefined && value !== "" && value !== "N/A") {
        uniqueValues.add(value.toString())
      }
    })
    return Array.from(uniqueValues).sort()
  }

  const clearAllFilters = () => {
    setColumnFilters({})
    setActiveFilters([])
  }

  const startEditingRow = (rowId: string) => {
    const row = tableData.find((row) => row[idField].toString() === rowId)
    if (row) {
      setEditingRowId(rowId)
      setEditFormData({ ...row })
    }
  }

  const handleEditFormChange = (field: string, value: any) => {
    setEditFormData((prev: any) => ({
      ...prev,
      [field]: value,
    }))
  }

  const saveEditedRow = async () => {
    if (!editingRowId) return

    try {
      await api.put(`${apiEndpoint}/${editingRowId}`, editFormData)
      setTableData((prevData) =>
        prevData.map((item) => (item[idField].toString() === editingRowId ? editFormData : item)),
      )
      setAllData((prevData) =>
        prevData.map((item) => (item[idField].toString() === editingRowId ? editFormData : item)),
      )
      setEditingRowId(null)
      setEditFormData({})
      showNotification("Row updated successfully", "success")
    } catch (error) {
      console.error("Error saving edited row:", error)
      showNotification("Failed to update row", "error")
    }
  }

  const cancelEditing = () => {
    setEditingRowId(null)
    setEditFormData({})
  }

  const handleDeleteRow = async (rowId: string) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      setIsLoading(true)
      try {
        await api.delete(`${apiEndpoint}/${rowId}`)
        setTableData((prevData) => prevData.filter((item) => item[idField].toString() !== rowId))
        setAllData((prevData) => prevData.filter((item) => item[idField].toString() !== rowId))
        showNotification("Item deleted successfully", "success")
      } catch (error) {
        console.error("Error deleting item:", error)
        showNotification("Failed to delete item", "error")
      } finally {
        setIsLoading(false)
      }
    }
  }

  // Computed values
  const columns = useMemo(() => {
    return initialColumns
      .map((col) => ({
        ...col,
        width: columnWidths[col.accessor] || col.width,
      }))
      .filter((col) => settings.visibleColumns[col.accessor] !== false)
  }, [initialColumns, columnWidths, settings.visibleColumns])

  const filteredData = useMemo(() => {
    let filtered = allData

    if (globalFilter) {
      filtered = filtered.filter((row) => {
        return Object.values(row).some(
          (value) => value && value.toString().toLowerCase().includes(globalFilter.toLowerCase()),
        )
      })
    }

    Object.entries(columnFilters).forEach(([columnId, filterValues]) => {
      if (filterValues && filterValues.length > 0) {
        filtered = filtered.filter((row) => {
          const cellValue = row[columnId]
          return filterValues.includes(cellValue?.toString() || "")
        })
      }
    })

    if (sortColumn && sortDirection) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortColumn]
        const bValue = b[sortColumn]

        if (aValue === null || aValue === undefined || aValue === "N/A") return sortDirection === "asc" ? 1 : -1
        if (bValue === null || bValue === undefined || bValue === "N/A") return sortDirection === "asc" ? -1 : 1

        if (!isNaN(Number(aValue)) && !isNaN(Number(bValue))) {
          return sortDirection === "asc" ? Number(aValue) - Number(bValue) : Number(bValue) - Number(aValue)
        }

        const aString = String(aValue).toLowerCase()
        const bString = String(bValue).toLowerCase()
        return sortDirection === "asc" ? aString.localeCompare(bString) : bString.localeCompare(aString)
      })
    }

    return filtered
  }, [allData, globalFilter, columnFilters, sortColumn, sortDirection])

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize
    const end = start + pageSize
    return filteredData.slice(start, end)
  }, [filteredData, page, pageSize])

  const rowVirtualizer = useVirtualizer({
    count: paginatedData.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => settings.cellSize,
    overscan: 50,
  })

  const virtualRows = settings.enableVirtualization
    ? rowVirtualizer.getVirtualItems()
    : paginatedData.map((_, index) => ({
        index,
        start: index * settings.cellSize,
        end: (index + 1) * settings.cellSize,
      }))

  const totalSize = settings.enableVirtualization
    ? rowVirtualizer.getTotalSize()
    : paginatedData.length * settings.cellSize

  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start || 0 : 0
  const paddingBottom = virtualRows.length > 0 ? totalSize - (virtualRows[virtualRows.length - 1].end || 0) : 0

  return (
    <div
      className={cn(
        "flex flex-col w-full h-[90vh] relative bg-white generic-table-container",
        isFullscreen && "fixed inset-0 z-50 bg-white p-4",
      )}
      style={{
        scrollbarGutter: "stable",
        overflow: "hidden",
      }}
    >
      <style>{tableStyles}</style>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">{title}</h1>

          <Button
            variant="outline"
            onClick={() => setIsSettingsModalOpen(true)}
            className="bg-white hover:bg-gray-50 text-[#00A651] border-[#00A651]"
          >
            <Settings className="h-4 w-4 mr-2" />
            Manage Columns
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="bg-white hover:bg-gray-50 text-[#00A651] border-[#00A651]"
          >
            <Undo className="h-4 w-4 mr-2" />
            Undo
          </Button>

          <Button
            variant="outline"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="bg-white hover:bg-gray-50 text-[#00A651] border-[#00A651]"
          >
            <Redo className="h-4 w-4 mr-2" />
            Redo
          </Button>

          <Button
            variant="outline"
            onClick={saveTableState}
            disabled={!hasUnsavedChanges}
            className="bg-white hover:bg-gray-50 text-[#00A651] border-[#00A651]"
          >
            Save
          </Button>

          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="bg-white hover:bg-gray-50 text-[#00A651] border-[#00A651]"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="bg-white hover:bg-gray-50 text-[#00A651] border-[#00A651]"
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>

          <Button onClick={() => setIsAddModalOpen(true)} className="bg-[#00A651] hover:bg-[#008f45] text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add {title.slice(0, -1)}
          </Button>

          <Button onClick={() => exportToExcel(tableData)} className="bg-[#00A651] hover:bg-[#008f45] text-white">
            <Download className="h-4 w-4 mr-2" />
            Export to Excel
          </Button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <div className="relative w-[300px]">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search all columns..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-8"
            />
          </div>

          {Object.keys(columnFilters).length > 0 && (
            <Button
              variant="outline"
              className="bg-white hover:bg-gray-50 text-[#00A651] border-[#00A651]"
              onClick={clearAllFilters}
            >
              <FilterX className="h-4 w-4 mr-2" />
              Clear All Filters
            </Button>
          )}
        </div>

        {selectedRows.size > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-2 py-1">
              {selectedRows.size} row(s) selected
            </Badge>
            <Button
              variant="outline"
              className="bg-white hover:bg-gray-50 text-red-500 border-red-500"
              onClick={deleteSelectedRows}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected
            </Button>
            <Button
              variant="outline"
              className="bg-white hover:bg-gray-50 text-[#00A651] border-[#00A651]"
              onClick={clearSelections}
            >
              Clear Selection
            </Button>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 italic mb-2">
        Tip: Click and drag a cell value to fill other cells with the same value. Use Ctrl+Click for multiple selection.
      </p>

      <div className="flex-1 border rounded-lg relative bg-white overflow-hidden" ref={tableContainerRef}>
        <div className="table-scroll-container">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <span>Loading data...</span>
            </div>
          ) : (
            <div style={{ minWidth: "100%", width: "max-content" }}>
              <Table>
                <TableHeader
                  className="bg-white z-10 text-black"
                  style={{
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                    zIndex: 20,
                  }}
                >
                  <TableRow>
                    <TableHead className="w-[60px] text-black font-bold">#</TableHead>
                    <TableHead className="w-[80px] text-black font-bold">Actions</TableHead>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={paginatedData.length > 0 && selectedRows.size === paginatedData.length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedRows(new Set(paginatedData.map((row) => row[idField].toString())))
                          } else {
                            setSelectedRows(new Set())
                          }
                        }}
                      />
                    </TableHead>
                    {columns.map((column) => (
                      <EnhancedHeader
                        key={column.accessor}
                        column={column}
                        onResize={handleColumnResize}
                        onSort={handleSort}
                        sortDirection={sortColumn === column.accessor ? sortDirection : null}
                        sortColumn={sortColumn}
                        onFilter={(columnId, values) => updateColumnFilters(columnId, values)}
                        activeFilters={columnFilters}
                        filterOptions={getFilterOptions(column.accessor)}
                      />
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columns.length + 3} className="text-center py-8">
                        No results found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {paddingTop > 0 && (
                        <tr>
                          <td style={{ height: `${paddingTop}px` }} colSpan={columns.length + 3} />
                        </tr>
                      )}
                      {virtualRows.map((virtualRow) => {
                        const row = paginatedData[virtualRow.index]
                        const isSelected = selectedRows.has(row[idField].toString())
                        const rowNumber = (page - 1) * pageSize + virtualRow.index + 1
                        const isEditing = editingRowId === row[idField].toString()

                        return (
                          <TableRow
                            key={row[idField]}
                            className={cn(
                              isSelected && "bg-[#e6f7ef]",
                              virtualRow.index % 2 === 0 ? "bg-white" : "bg-[#f0faf5]",
                              isEditing && "bg-blue-50",
                              "text-gray-900",
                            )}
                          >
                            <TableCell className="text-center">{rowNumber}</TableCell>
                            <TableCell>
                              {isEditing ? (
                                <div className="flex space-x-1">
                                  <Button variant="ghost" size="icon" onClick={saveEditedRow}>
                                    <Check className="h-4 w-4 text-green-600" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={cancelEditing}>
                                    <X className="h-4 w-4 text-red-600" />
                                  </Button>
                                </div>
                              ) : (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <ChevronDown className="h-4 w-4" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-40">
                                    <div className="flex flex-col space-y-1">
                                      <Button
                                        variant="ghost"
                                        className="justify-start"
                                        onClick={() => startEditingRow(row[idField].toString())}
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        className="justify-start text-red-500"
                                        onClick={() => handleDeleteRow(row[idField].toString())}
                                      >
                                        Delete
                                      </Button>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              )}
                            </TableCell>
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleRowSelect(row[idField].toString(), false, false)}
                              />
                            </TableCell>
                            {columns.map((column) => (
                              <TableCell key={`${row[idField]}-${column.accessor}`}>
                                {isEditing ? (
                                  <Input
                                    value={editFormData[column.accessor] || ""}
                                    onChange={(e) => handleEditFormChange(column.accessor, e.target.value)}
                                    className="h-8 w-full"
                                  />
                                ) : (
                                  <Cell
                                    value={row[column.accessor]}
                                    rowId={row[idField].toString()}
                                    column={column.accessor}
                                    isDragging={isDragging}
                                    dragValue={dragValue}
                                    dragColumnId={dragColumnId}
                                    cellStatus={changedCells[`${row[idField]}-${column.accessor}`] || null}
                                    isSelected={selectedCells.has(`${row[idField]}-${column.accessor}`)}
                                    onMouseDown={handleCellMouseDown}
                                    onMouseEnter={() => handleCellMouseEnter(row[idField].toString())}
                                    onClick={handleCellClick}
                                  />
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        )
                      })}
                      {paddingBottom > 0 && (
                        <tr>
                          <td style={{ height: `${paddingBottom}px` }} colSpan={columns.length + 3} />
                        </tr>
                      )}
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center p-2 border-t mt-2">
        <span className="text-sm text-gray-500">{filteredData.length} row(s) total</span>
        <div className="flex items-center gap-2">
          <span className="text-sm">Rows per page:</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => {
              setPageSize(Number(value))
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[80px]">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(1)}
              className="text-[#00A651]"
            >
              First
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="text-[#00A651]"
            >
              Prev
            </Button>
            <span className="text-sm">
              Page {page} of {Math.max(1, Math.ceil(filteredData.length / pageSize))}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= Math.ceil(filteredData.length / pageSize)}
              onClick={() => setPage(page + 1)}
              className="text-[#00A651]"
            >
              Next
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= Math.ceil(filteredData.length / pageSize)}
              onClick={() => setPage(Math.ceil(filteredData.length / pageSize))}
              className="text-[#00A651]"
            >
              Last
            </Button>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <Dialog open={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Table Settings</DialogTitle>
          </DialogHeader>
          <Card>
            <CardHeader>
              <CardTitle>Column Visibility</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-4">
                  <div className="flex justify-between mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const allColumns = {}
                        columns.forEach((col) => {
                          allColumns[col.accessor] = true
                        })
                        setSettings((prev) => ({ ...prev, visibleColumns: allColumns }))
                      }}
                      className="bg-white hover:bg-gray-50 text-[#00A651] border-[#00A651]"
                    >
                      Show All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const allColumns = {}
                        columns.forEach((col) => {
                          allColumns[col.accessor] = false
                        })
                        if (columns.length > 0) {
                          allColumns[columns[0].accessor] = true
                        }
                        setSettings((prev) => ({ ...prev, visibleColumns: allColumns }))
                      }}
                      className="bg-white hover:bg-gray-50 text-[#00A651] border-[#00A651]"
                    >
                      Hide All
                    </Button>
                  </div>

                  {columns.map((column) => (
                    <div key={column.accessor} className="flex items-center justify-between py-2 border-b">
                      <div className="font-medium">{column.title}</div>
                      <Switch
                        checked={settings.visibleColumns[column.accessor] !== false}
                        onCheckedChange={(checked) => toggleColumnVisibility(column.accessor)}
                      />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>

      {/* Add Modal */}
      {isAddModalOpen && (
        <AddModal
          opened={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAddSuccess={(newItem) => {
            setTableData((prev) => [...prev, newItem])
            setAllData((prev) => [...prev, newItem])
            showNotification(`${title.slice(0, -1)} added successfully`, "success")
          }}
        />
      )}

      {/* Notification */}
      {notification && (
        <div
          className={cn(
            "fixed bottom-4 right-4 z-50 p-4 rounded-md shadow-lg flex items-center gap-2",
            notification.type === "success" && "bg-[#e6f7ef] text-[#00A651] border border-[#00A651]/20",
            notification.type === "error" && "bg-red-100 text-red-800 border border-red-200",
            notification.type === "info" && "bg-blue-100 text-blue-800 border border-blue-200",
          )}
        >
          {notification.type === "success" && <Check className="h-5 w-5" />}
          {notification.type === "error" && <X className="h-5 w-5" />}
          {notification.type === "info" && <AlertCircle className="h-5 w-5" />}
          <span>{notification.message}</span>
          <Button variant="ghost" size="icon" className="ml-2" onClick={() => setNotification(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Save Results Modal */}
      <Dialog open={showSaveResultsModal} onOpenChange={setShowSaveResultsModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Save Results</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Row ID</TableHead>
                  <TableHead>Field</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {saveResults.map((result, index) => (
                  <TableRow key={index}>
                    <TableCell>{result.rowId}</TableCell>
                    <TableCell>{result.columnId}</TableCell>
                    <TableCell>
                      {result.success ? (
                        <Badge className="bg-[#e6f7ef] text-[#00A651]">Success</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800">Failed</Badge>
                      )}
                    </TableCell>
                    <TableCell>{result.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          <DialogFooter>
            <Button
              onClick={() => setShowSaveResultsModal(false)}
              className="bg-[#00A651] hover:bg-[#008f45] text-white"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
