"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Users, CheckCircle, XCircle, ChevronLeft, ChevronRight, Download, ArrowLeft, Eye, EyeOff } from "lucide-react"
import { supabase } from "@/lib/supabase"
import jsPDF from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Brush, Legend } from 'recharts'
import * as XLSX from 'xlsx'

interface Worker {
  id: number
  factory: string | number
  nik: string
  ktp: string
  name: string
  department: string
  status: boolean
  verified_date?: string
}

interface Stats {
  total: { factory2: number, factory3: number, overall: number }
  verified: { factory2: number, factory3: number, overall: number }
  unverified: { factory2: number, factory3: number, overall: number }
}

interface ChartData {
  date: string
  factory2: number
  factory3: number
}

type Filter = 'all' | 'verified' | 'unverified'

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ total: { factory2: 0, factory3: 0, overall: 0 }, verified: { factory2: 0, factory3: 0, overall: 0 }, unverified: { factory2: 0, factory3: 0, overall: 0 } })
  const [workers, setWorkers] = useState<Worker[]>([])
  const [factories, setFactories] = useState<string[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [filterFactory, setFilterFactory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDepartment, setFilterDepartment] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [isMobile, setIsMobile] = useState(false)
  const [showChart, setShowChart] = useState(true)
  const chartMargin = isMobile
    ? { top: 5, right: 5, bottom: 80, left: 0 }
    : { top: 10, right: 10, bottom: 100, left: 10 }
  const itemsPerPage = 10

  useEffect(() => {
    // Check authentication
    const passkey = sessionStorage.getItem('dashboard_passkey')
    const expiry = sessionStorage.getItem('dashboard_expiry')
    const now = Date.now()

    if (!passkey || !expiry || now > parseInt(expiry)) {
      sessionStorage.removeItem('dashboard_passkey')
      sessionStorage.removeItem('dashboard_expiry')
      window.location.href = '/'
      return
    }

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch stats
        const { count: total, error: totalError } = await supabase
          .from('yongjin_ftc_workers')
          .select('*', { count: 'exact', head: true })

        if (totalError) throw totalError

        const { count: total2, error: total2Error } = await supabase
          .from('yongjin_ftc_workers')
          .select('*', { count: 'exact', head: true })
          .eq('factory', 2)

        if (total2Error) throw total2Error

        const { count: total3, error: total3Error } = await supabase
          .from('yongjin_ftc_workers')
          .select('*', { count: 'exact', head: true })
          .eq('factory', 3)

        if (total3Error) throw total3Error

        const { count: verified, error: verifiedError } = await supabase
          .from('yongjin_ftc_workers')
          .select('*', { count: 'exact', head: true })
          .eq('status', true)

        if (verifiedError) throw verifiedError

        const { count: verified2, error: verified2Error } = await supabase
          .from('yongjin_ftc_workers')
          .select('*', { count: 'exact', head: true })
          .eq('status', true)
          .eq('factory', 2)

        if (verified2Error) throw verified2Error

        const { count: verified3, error: verified3Error } = await supabase
          .from('yongjin_ftc_workers')
          .select('*', { count: 'exact', head: true })
          .eq('status', true)
          .eq('factory', 3)

        if (verified3Error) throw verified3Error

        const { count: unverified, error: unverifiedError } = await supabase
          .from('yongjin_ftc_workers')
          .select('*', { count: 'exact', head: true })
          .eq('status', false)

        if (unverifiedError) throw unverifiedError

        const { count: unverified2, error: unverified2Error } = await supabase
          .from('yongjin_ftc_workers')
          .select('*', { count: 'exact', head: true })
          .eq('status', false)
          .eq('factory', 2)

        if (unverified2Error) throw unverified2Error

        const { count: unverified3, error: unverified3Error } = await supabase
          .from('yongjin_ftc_workers')
          .select('*', { count: 'exact', head: true })
          .eq('status', false)
          .eq('factory', 3)

        if (unverified3Error) throw unverified3Error

        setStats({
          total: { factory2: total2 || 0, factory3: total3 || 0, overall: total || 0 },
          verified: { factory2: verified2 || 0, factory3: verified3 || 0, overall: verified || 0 },
          unverified: { factory2: unverified2 || 0, factory3: unverified3 || 0, overall: unverified || 0 },
        })

        // Fetch all workers
        let allData: Worker[] = []
        let from = 0
        const batchSize = 1000

        while (true) {
          const { data, error } = await supabase
            .from('yongjin_ftc_workers')
            .select('*')
            .range(from, from + batchSize - 1)

          if (error) {
            console.error('Error fetching workers at range', from, '-', from + batchSize - 1, ':', error)
            break
          }

          if (!data || data.length === 0) {
            break
          }

          allData = allData.concat(data)
          from += batchSize

          if (data.length < batchSize) {
            break
          }
        }

        setWorkers(allData)
        const uniqueFactories = [...new Set(allData.map(w => String(w.factory)))].sort()
        const uniqueDepartments = [...new Set(allData.map(w => w.department))].sort()
        setFactories(uniqueFactories)
        setDepartments(uniqueDepartments)

        // Process chart data
        const dateCounts2: { [key: string]: number } = {}
        const dateCounts3: { [key: string]: number } = {}
        allData.filter(w => w.status && w.verified_date).forEach(w => {
          const date = new Date(w.verified_date!).toISOString().split('T')[0]
          if (String(w.factory) === '2') {
            dateCounts2[date] = (dateCounts2[date] || 0) + 1
          } else if (String(w.factory) === '3') {
            dateCounts3[date] = (dateCounts3[date] || 0) + 1
          }
        })
        const allDates = new Set([...Object.keys(dateCounts2), ...Object.keys(dateCounts3)])
        const processedChartData = Array.from(allDates).map(date => ({
          date,
          factory2: dateCounts2[date] || 0,
          factory3: dateCounts3[date] || 0
        })).sort((a, b) => a.date.localeCompare(b.date))
        setChartData(processedChartData)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const filteredWorkers = workers.filter(worker => {
    const statusMatch = filter === 'all' || (filter === 'verified' && worker.status) || (filter === 'unverified' && !worker.status)
    const factoryMatch = filterFactory === 'all' || String(worker.factory) === filterFactory
    const departmentMatch = filterDepartment === 'all' || worker.department === filterDepartment
    const searchMatch = searchTerm === '' ||
      worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.nik.toLowerCase().includes(searchTerm.toLowerCase())
    return statusMatch && factoryMatch && departmentMatch && searchMatch
  })

  // Filter departments based on selected factory
  const filteredDepartments = filterFactory === 'all'
    ? departments
    : [...new Set(workers.filter(w => String(w.factory) === filterFactory).map(w => w.department))].sort()

  // Reset department filter when factory changes if current department is not available
  useEffect(() => {
    if (filterDepartment !== 'all' && !filteredDepartments.includes(filterDepartment)) {
      setFilterDepartment('all')
    }
  }, [filterFactory, filteredDepartments, filterDepartment])

  const totalPages = Math.ceil(filteredWorkers.length / itemsPerPage)
  const paginatedWorkers = filteredWorkers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const exportChartToPDF = () => {
    const doc = new jsPDF({ compress: true })

    // Add logo
    const logoUrl = '/icons/icon-128x128.png'
    doc.addImage(logoUrl, 'PNG', 14, 10, 20, 20)

    // Add company name
    doc.setFontSize(16)
    doc.text('PT.YONGJIN JAVASUKA GARMENT', 40, 20)
    doc.setFontSize(12)
    doc.text('Verification Progress Over Time Report', 40, 30)

    // Calculate total
    const totalVerified = chartData.reduce((sum, item) => sum + item.factory2 + item.factory3, 0)

    const tableColumn = ['No', 'Date', 'Factory 2', 'Factory 3', 'Total']
    const tableRows = chartData.map((item, index) => [
      index + 1,
      item.date,
      item.factory2,
      item.factory3,
      item.factory2 + item.factory3
    ])

    // Add total row
    tableRows.push(['', 'Total', chartData.reduce((sum, item) => sum + item.factory2, 0), chartData.reduce((sum, item) => sum + item.factory3, 0), totalVerified])

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      didParseCell: (data) => {
        if (data.row.index === tableRows.length - 1) {
          data.cell.styles.fillColor = [200, 200, 200] // Gray for total row
          data.cell.styles.fontStyle = 'bold'
        }
      }
    })

    doc.save('verification-progress.pdf')
  }

  const exportToPDF = () => {
    const doc = new jsPDF({ compress: true })

    // Add logo
    const logoUrl = '/icons/icon-128x128.png'
    doc.addImage(logoUrl, 'PNG', 14, 10, 20, 20)

    // Add company name
    doc.setFontSize(16)
    doc.text('PT.YONGJIN JAVASUKA GARMENT', 40, 20)
    doc.setFontSize(12)
    doc.text('Yongjin FTC Workers Data Report', 40, 30)

    const tableColumn = ['No', 'Name', 'NIK', 'Department', 'Factory', 'Status', 'Verified Date']
    const tableRows = filteredWorkers.map((worker, index) => [
      index + 1,
      worker.name,
      worker.nik,
      worker.department,
      `Factory ${worker.factory}`,
      worker.status ? 'Verified' : 'Unverified',
      worker.verified_date ? new Date(worker.verified_date).toLocaleDateString() : 'N/A'
    ])

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    })

    doc.save('workers-data.pdf')
  }

  const exportToExcel = () => {
    // Create data with header
    const headerData = [
      { No: 'PT.YONGJIN JAVASUKA GARMENT', Name: '', NIK: '', Department: '', Factory: '', Status: '', 'Verified Date': '' },
      { No: 'Yongjin FTC Workers Data Report', Name: '', NIK: '', Department: '', Factory: '', Status: '', 'Verified Date': '' },
      { No: '', Name: '', NIK: '', Department: '', Factory: '', Status: '', 'Verified Date': '' }, // Empty row
    ]

    const workerData = filteredWorkers.map((worker, index) => ({
      No: index + 1,
      Name: worker.name,
      NIK: worker.nik,
      Department: worker.department,
      Factory: `Factory ${worker.factory}`,
      Status: worker.status ? 'Verified' : 'Unverified',
      'Verified Date': worker.verified_date ? new Date(worker.verified_date).toLocaleDateString() : 'N/A'
    }))

    const allData = [...headerData, ...workerData]

    const worksheet = XLSX.utils.json_to_sheet(allData, { skipHeader: true })

    // Define styles
    const headerStyle = { font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '2D5F8F' } }, alignment: { horizontal: 'center', vertical: 'center' }, border: { top: { style: 'thin', color: { rgb: '000000' } }, bottom: { style: 'thin', color: { rgb: '000000' } }, left: { style: 'thin', color: { rgb: '000000' } }, right: { style: 'thin', color: { rgb: '000000' } } } }
    const subHeaderStyle = { font: { sz: 12, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '4A90E2' } }, alignment: { horizontal: 'center', vertical: 'center' }, border: { top: { style: 'thin', color: { rgb: '000000' } }, bottom: { style: 'thin', color: { rgb: '000000' } }, left: { style: 'thin', color: { rgb: '000000' } }, right: { style: 'thin', color: { rgb: '000000' } } } }
    const tableHeaderStyle = { font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '5BA0F2' } }, alignment: { horizontal: 'center', vertical: 'center' }, border: { top: { style: 'thin', color: { rgb: '000000' } }, bottom: { style: 'thin', color: { rgb: '000000' } }, left: { style: 'thin', color: { rgb: '000000' } }, right: { style: 'thin', color: { rgb: '000000' } } } }
    const dataStyle = { font: { sz: 10 }, alignment: { horizontal: 'left', vertical: 'center' }, border: { top: { style: 'thin', color: { rgb: '000000' } }, bottom: { style: 'thin', color: { rgb: '000000' } }, left: { style: 'thin', color: { rgb: '000000' } }, right: { style: 'thin', color: { rgb: '000000' } } } }
    const verifiedStyle = { ...dataStyle, fill: { fgColor: { rgb: 'D4EDDA' } } }
    const unverifiedStyle = { ...dataStyle, fill: { fgColor: { rgb: 'F8D7DA' } } }

    // Apply styles to header
    worksheet['A1'].s = headerStyle
    worksheet['A2'].s = subHeaderStyle

    // Add table headers (assuming data starts at row 4)
    const tableHeaders = ['No', 'Name', 'NIK', 'Department', 'Factory', 'Status', 'Verified Date']
    tableHeaders.forEach((header, index) => {
      const cellRef = XLSX.utils.encode_cell({ r: 3, c: index })
      worksheet[cellRef] = { v: header, t: 's', s: tableHeaderStyle }
    })

    // Apply styles to data rows
    workerData.forEach((row, rowIndex) => {
      const actualRow = rowIndex + 4 // Data starts at row 4 (0-indexed)
      worksheet[XLSX.utils.encode_cell({ r: actualRow, c: 0 })] = { v: row.No, t: 'n', s: dataStyle }
      worksheet[XLSX.utils.encode_cell({ r: actualRow, c: 1 })] = { v: row.Name, t: 's', s: dataStyle }
      worksheet[XLSX.utils.encode_cell({ r: actualRow, c: 2 })] = { v: row.NIK, t: 's', s: dataStyle }
      worksheet[XLSX.utils.encode_cell({ r: actualRow, c: 3 })] = { v: row.Department, t: 's', s: dataStyle }
      worksheet[XLSX.utils.encode_cell({ r: actualRow, c: 4 })] = { v: row.Factory, t: 's', s: dataStyle }
      worksheet[XLSX.utils.encode_cell({ r: actualRow, c: 5 })] = { v: row.Status, t: 's', s: row.Status === 'Verified' ? verifiedStyle : unverifiedStyle }
      worksheet[XLSX.utils.encode_cell({ r: actualRow, c: 6 })] = { v: row['Verified Date'], t: 's', s: dataStyle }
    })

    // Merge cells for header
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, // Merge A1 to G1 for company name
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }, // Merge A2 to G2 for report title
    ]

    // Set column widths
    worksheet['!cols'] = [
      { wch: 5 }, // No
      { wch: 25 }, // Name
      { wch: 15 }, // NIK
      { wch: 20 }, // Department
      { wch: 10 }, // Factory
      { wch: 12 }, // Status
      { wch: 15 }, // Verified Date
    ]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Workers Data')

    XLSX.writeFile(workbook, 'workers-data.xlsx')
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center z-50">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <Spinner />
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 p-4">
      <Button variant="outline" className="fixed bottom-4 right-4 z-10" title="Back to Home" onClick={() => { sessionStorage.removeItem('dashboard_passkey'); sessionStorage.removeItem('dashboard_expiry'); window.location.href = '/'; }}>
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col items-center gap-4">
          <img src="/icons/icon-128x128.png" alt="PT.YONGJIN JAVASUKA GARMENT Logo" className="w-16 h-16 object-contain" />
          <div className="text-center">
            <h1 className="text-2xl md:text-4xl font-bold">PT.YONGJIN JAVASUKA GARMENT</h1>
            <p className="text-muted-foreground mt-2">Overview of worker verification handbook data</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Workers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-blue-700">Factory 2</span>
                  </div>
                  <span className="text-lg font-bold text-blue-600">{stats.total.factory2}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-700">Factory 3</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">{stats.total.factory3}</span>
                </div>
                <div className="border-t pt-1 mt-2">
                  <div className="text-2xl font-bold text-center">{stats.total.overall}</div>
                  <p className="text-xs text-muted-foreground text-center">
                    Total data in the database
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Verified Workers</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-blue-700">Factory 2</span>
                  </div>
                  <span className="text-lg font-bold text-blue-600">{stats.verified.factory2}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-700">Factory 3</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">{stats.verified.factory3}</span>
                </div>
                <div className="border-t pt-1 mt-2">
                  <div className="text-2xl font-bold text-center">{stats.verified.overall}</div>
                  <p className="text-xs text-muted-foreground text-center">
                    Workers who have been verified
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unverified Workers</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-blue-700">Factory 2</span>
                  </div>
                  <span className="text-lg font-bold text-blue-600">{stats.unverified.factory2}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-700">Factory 3</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">{stats.unverified.factory3}</span>
                </div>
                <div className="border-t pt-1 mt-2">
                  <div className="text-2xl font-bold text-center">{stats.unverified.overall}</div>
                  <p className="text-xs text-muted-foreground text-center">
                    Workers who have not been verified
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Verification Progress by Factory Over Time</CardTitle>
                <CardDescription>Number of verified workers per day by factory</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowChart(!showChart)}>
                  {showChart ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button onClick={exportChartToPDF} variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export PDF
                </Button>
              </div>
            </div>
          </CardHeader>
          {showChart && (
            <CardContent>
              <ChartContainer config={{ factory2: { label: "Factory 2", color: "hsl(var(--chart-1))" }, factory3: { label: "Factory 3", color: "hsl(var(--chart-2))" } }} className="h-[350px] md:h-[400px] w-full">
                <LineChart data={chartData} margin={chartMargin}>
                  <defs>
                    <linearGradient id="colorFactory2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0.8}/>
                    </linearGradient>
                    <linearGradient id="colorFactory3" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#047857" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" angle={0} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line type="monotone" dataKey="factory2" stroke="url(#colorFactory2)" strokeWidth={3} />
                  <Line type="monotone" dataKey="factory3" stroke="url(#colorFactory3)" strokeWidth={3} />
                  <Brush dataKey="date" height={20} stroke="#3b82f6" />
                </LineChart>
              </ChartContainer>
            </CardContent>
          )}
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Workers Data</CardTitle>
                <CardDescription>List of all workers with verification status</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button onClick={exportToPDF} variant="outline" className="gap-2 w-full sm:w-auto">
                  <Download className="h-4 w-4" />
                  Export PDF
                </Button>
                <Button onClick={exportToExcel} variant="outline" className="gap-2 w-full sm:w-auto">
                  <Download className="h-4 w-4" />
                  Export Excel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <Input
                placeholder="Search by name or NIK..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-[200px]"
              />
              <Select value={filter} onValueChange={(value: Filter) => setFilter(value)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Workers</SelectItem>
                  <SelectItem value="verified">Verified Only</SelectItem>
                  <SelectItem value="unverified">Unverified Only</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterFactory} onValueChange={setFilterFactory}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by factory" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Factories</SelectItem>
                  {factories.map(factory => (
                    <SelectItem key={factory} value={factory}>Factory {factory}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {filteredDepartments.map(department => (
                    <SelectItem key={department} value={department}>{department}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>NIK</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Factory</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Verified Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedWorkers.map((worker, index) => (
                  <TableRow key={worker.id}>
                    <TableCell>{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                    <TableCell>{worker.name}</TableCell>
                    <TableCell>{worker.nik}</TableCell>
                    <TableCell>{worker.department}</TableCell>
                    <TableCell>Factory {worker.factory}</TableCell>
                    <TableCell>
                      <Badge variant={worker.status ? "default" : "destructive"}>
                        {worker.status ? "Verified" : "Unverified"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {worker.verified_date ? new Date(worker.verified_date).toLocaleDateString() : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-2">
              <p className="text-sm text-muted-foreground">
                Showing {paginatedWorkers.length} of {filteredWorkers.length} workers
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}