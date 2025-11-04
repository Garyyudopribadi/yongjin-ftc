"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Users, CheckCircle, XCircle, ChevronLeft, ChevronRight, Download, ArrowLeft } from "lucide-react"
import { supabase } from "@/lib/supabase"
import jsPDF from 'jspdf'
import { autoTable } from 'jspdf-autotable'

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
  total: number
  verified: number
  unverified: number
}

type Filter = 'all' | 'verified' | 'unverified'

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ total: 0, verified: 0, unverified: 0 })
  const [workers, setWorkers] = useState<Worker[]>([])
  const [factories, setFactories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [filterFactory, setFilterFactory] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 21

  useEffect(() => {
    const access = localStorage.getItem('dashboard_access')
    if (access !== 'true') {
      window.location.href = '/'
    }
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch stats
        const { count: total, error: totalError } = await supabase
          .from('yongjin_ftc_workers')
          .select('*', { count: 'exact', head: true })

        if (totalError) throw totalError

        const { count: verified, error: verifiedError } = await supabase
          .from('yongjin_ftc_workers')
          .select('*', { count: 'exact', head: true })
          .eq('status', true)

        if (verifiedError) throw verifiedError

        const { count: unverified, error: unverifiedError } = await supabase
          .from('yongjin_ftc_workers')
          .select('*', { count: 'exact', head: true })
          .eq('status', false)

        if (unverifiedError) throw unverifiedError

        setStats({
          total: total || 0,
          verified: verified || 0,
          unverified: unverified || 0,
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
        setFactories(uniqueFactories)
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
    return statusMatch && factoryMatch
  })

  const totalPages = Math.ceil(filteredWorkers.length / itemsPerPage)
  const paginatedWorkers = filteredWorkers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const exportToPDF = () => {
    const doc = new jsPDF()
    doc.text('Yongjin FTC Workers Data', 14, 16)
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
      startY: 20,
    })

    doc.save('workers-data.pdf')
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
      <Button variant="outline" className="fixed bottom-4 right-4 z-10" title="Back to Home" onClick={() => { localStorage.removeItem('dashboard_access'); window.location.href = '/'; }}>
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-center">PT.YONGJIN JAVASUKA GARMENT</h1>
          <p className="text-center text-muted-foreground mt-2">Overview of worker verification handbook data</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Workers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                Total data in the database
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Verified Workers</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.verified}</div>
              <p className="text-xs text-muted-foreground">
                Workers who have been verified
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unverified Workers</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unverified}</div>
              <p className="text-xs text-muted-foreground">
                Workers who have not been verified
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Workers Data</CardTitle>
                <CardDescription>List of all workers with verification status</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
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
                <Button onClick={exportToPDF} variant="outline" className="gap-2 w-full sm:w-auto">
                  <Download className="h-4 w-4" />
                  Export PDF
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
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