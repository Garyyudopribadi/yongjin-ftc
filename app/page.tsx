"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, Download, User, Briefcase, IdCard, CreditCard, Building, Calendar, CheckCircle, XCircle, Users, LayoutDashboard } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import PDFViewer from "@/components/pdf-viewer"
import { supabase } from "@/lib/supabase"

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

interface VerificationState {
  status: "idle" | "loading" | "success" | "error"
  worker: Worker | null
  error: string
}

export default function WorkerVerificationPage() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [factories, setFactories] = useState<string[]>([])
  const [workersLoading, setWorkersLoading] = useState(true)
  const [selectedFactory, setSelectedFactory] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState("")
  const [verification, setVerification] = useState<VerificationState>({
    status: "idle",
    worker: null,
    error: "",
  })
  const [showPasskeyModal, setShowPasskeyModal] = useState(false)
  const [passkeyInput, setPasskeyInput] = useState("")
  const [passkeyError, setPasskeyError] = useState("")

  useEffect(() => {
    const fetchWorkers = async () => {
      // Check a specific row by ID to verify data exists
      const { data: testData, error: testError } = await supabase
        .from('yongjin_ftc_workers')
        .select('*')
        .eq('id', 8118)
        .single()

      if (testError) {
        console.error('Error fetching test row with ID 8118:', testError)
      } else {
        console.log('Test row with ID 8118:', testData)
      }

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
          console.log('No more data at range', from, '-', from + batchSize - 1)
          break
        }

        console.log(`Fetched batch starting at ${from}: ${data.length} rows`)
        allData = allData.concat(data)
        from += batchSize

        if (data.length < batchSize) {
          console.log('Last batch with', data.length, 'rows')
          break
        }
      }

      console.log('Fetched', allData.length, 'workers')
      console.log('Sample workers:', allData.slice(0, 3))
      console.log('All factory values:', allData.map(w => w.factory))
      setWorkers(allData)
      const uniqueFactories = [...new Set(allData.map(w => String(w.factory)))].sort()
      setFactories(uniqueFactories)
      console.log('Using factories:', uniqueFactories)
      setWorkersLoading(false)
    }

    fetchWorkers()
  }, [])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedFactory || !inputValue.trim()) {
      setVerification({
        status: "error",
        worker: null,
        error: "Please select a factory and enter NIK/KTP",
      })
      return
    }

    setVerification({ status: "loading", worker: null, error: "" })

    setTimeout(async () => {
      const filteredWorkers = workers.filter((w) => w.factory == selectedFactory)
      console.log('Selected factory:', selectedFactory)
      console.log('Filtered workers count:', filteredWorkers.length)
      console.log('Filtered workers sample:', filteredWorkers.slice(0, 3).map(w => ({ nik: w.nik, ktp: w.ktp, factory: w.factory })))

      const trimmedInput = inputValue.trim().toLowerCase()
      let matchedWorker = filteredWorkers.find((w) => w.nik.toLowerCase() === trimmedInput || w.ktp.toLowerCase() === trimmedInput)

      if (!matchedWorker) {
        if (trimmedInput.length >= 5 && trimmedInput.length <= 6) {
          matchedWorker = filteredWorkers.find((w) => w.nik.toLowerCase().endsWith(trimmedInput))
        } else if (trimmedInput.length === 7) {
          matchedWorker = filteredWorkers.find((w) => w.ktp.toLowerCase().endsWith(trimmedInput))
        }
      }

      if (!matchedWorker) {
        setVerification({
          status: "error",
          worker: null,
          error: "Verification failed. Please check your input.",
        })
        return
      }

      // Update the database: set status to true and verified_date to now
      const now = new Date().toISOString()
      const { error: updateError } = await supabase
        .from('yongjin_ftc_workers')
        .update({ status: true, verified_date: now })
        .eq('id', matchedWorker.id)

      if (updateError) {
        console.error('Error updating worker status:', updateError)
        setVerification({
          status: "error",
          worker: null,
          error: "Verification succeeded but failed to update status. Please try again.",
        })
        return
      }

      // Update the matchedWorker with new status and verified_date
      const updatedWorker = { ...matchedWorker, status: true, verified_date: now }

      setVerification({
        status: "success",
        worker: updatedWorker,
        error: "",
      })
    }, 800)
  }

  const handleDownloadPDF = async () => {
    // Fetch the PDF as a blob and create an object URL so the browser will download
    // it without navigating away (works even for cross-origin URLs that ignore
    // the download attribute).
    const pdfUrl = "https://phzyooddlafqozryxcqa.supabase.co/storage/v1/object/public/pdf/handbook.pdf"
    try {
      const res = await fetch(pdfUrl)
      if (!res.ok) throw new Error(`Failed to fetch PDF: ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "handbook.pdf"
      // Append to document to make the click work in some browsers
      document.body.appendChild(link)
      link.click()
      link.remove()
      // Revoke object URL after a short delay to ensure the download has started
      setTimeout(() => URL.revokeObjectURL(url), 20000)
    } catch (err) {
      // Fallback: open in new tab (doesn't replace current page)
      console.error(err)
      const fallback = document.createElement("a")
      fallback.href = pdfUrl
      fallback.target = "_blank"
      fallback.rel = "noopener noreferrer"
      document.body.appendChild(fallback)
      fallback.click()
      fallback.remove()
    }
  }

  const handlePasskeySubmit = () => {
    if (passkeyInput === "0000") {
      const expiry = Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      sessionStorage.setItem('dashboard_passkey', '0000')
      sessionStorage.setItem('dashboard_expiry', expiry.toString())
      setShowPasskeyModal(false)
      setPasskeyInput("")
      setPasskeyError("")
      window.location.href = "/dashboard"
    } else {
      setPasskeyError("Invalid passkey. Please try again.")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 p-4">
      <Button variant="outline" className="fixed bottom-4 right-4 z-10" title="Go to Dashboard" onClick={() => setShowPasskeyModal(true)}>
        <LayoutDashboard className="h-4 w-4" />
      </Button>
      <div className="mx-auto max-w-6xl">
        {verification.status === "idle" || verification.status === "error" ? (
          <div className="flex min-h-[80vh] items-center justify-center">
            <Card className="w-full max-w-md shadow-lg animate-in fade-in-0 duration-500">
              <CardHeader className="text-center">
                <div className="flex justify-center items-center space-x-4 mb-4">
                  <Image src="/yjlogo.png" alt="Y Logo" width={100} height={100} className="object-contain" />
                  <Image src="/fairtradelogo.png" alt="Fair Trade Logo" width={70} height={70} className="object-contain" />
                </div>
                <CardTitle className="text-2xl">Fair Trade Verification</CardTitle>
                <CardDescription>Enter your NIK/KTP to verify and access documents</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleVerify} className="space-y-6">
                  <div className="space-y-3">
                    <p className="block text-sm font-medium">Select Factory</p>
                    <div className="flex gap-3">
                      {factories.map((factory) => (
                        <Button
                          key={factory}
                          type="button"
                          variant={selectedFactory === factory ? "default" : "outline"}
                          className="flex-1"
                          onClick={() => setSelectedFactory(factory)}
                          aria-label={`Select Factory ${factory}`}
                        >
                          Factory {factory}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <label htmlFor="input" className="block text-sm font-medium">
                      NIK/KTP
                    </label>
                    <Input
                      id="input"
                      type="text"
                      placeholder="Enter full NIK or KTP"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      className="placeholder:text-muted-foreground"
                    />
                    <p className="text-xs text-muted-foreground">Tip: Hanya Karyawan Yongjin yang bisa mengakses dokumen ini</p>
                  </div>

                  {verification.status === "error" && verification.error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{verification.error}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" className="w-full" disabled={!selectedFactory || !inputValue}>
                    Verify and Access Document
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        ) : verification.status === "loading" ? (
          <div className="flex min-h-[80vh] items-center justify-center animate-in fade-in-0 duration-500">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <Spinner />
                <p className="text-muted-foreground">Verifying your credentials...</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in-0 duration-500">
            <Card className="shadow-lg animate-in fade-in-0 duration-500">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <div>
                    <CardTitle className="text-3xl">Worker Information</CardTitle>
                    <CardDescription>Details of the verified worker</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="text-lg font-semibold">{verification.worker?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Briefcase className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Department</p>
                        <p className="text-lg font-semibold">{verification.worker?.department}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <IdCard className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">NIK</p>
                        <p className="text-lg font-mono">{verification.worker?.nik}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">KTP</p>
                        <p className="text-lg font-mono">{verification.worker?.ktp}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Building className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Factory</p>
                        <p className="text-lg font-semibold">Factory {verification.worker?.factory}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Verified Date</p>
                        <p className="text-lg font-semibold">{verification.worker?.verified_date ? new Date(verification.worker.verified_date).toLocaleString() : 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {verification.worker?.status ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge variant={verification.worker?.status ? "default" : "destructive"}>
                          {verification.worker?.status ? "Verified" : "Not Verified"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Separator />

            <Card className="shadow-lg animate-in fade-in-0 duration-500">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Document</CardTitle>
                  <CardDescription>Fair Trade - Handbook</CardDescription>
                </div>
                <Button onClick={handleDownloadPDF} variant="outline" size="sm" className="gap-2 bg-transparent">
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
              </CardHeader>
              <CardContent className="p-2 sm:p-4 md:p-6">
                <div className="overflow-hidden rounded-md sm:rounded-lg border border-border bg-card">
                  {/* Use Supabase public storage URL so the viewer can fetch the PDF */}
                  <PDFViewer fileUrl="https://phzyooddlafqozryxcqa.supabase.co/storage/v1/object/public/pdf/handbook.pdf" />
                </div>
              </CardContent>
            </Card>

            <Separator />

            <div className="flex justify-center">
              <Button
                onClick={() => {
                  setVerification({ status: "idle", worker: null, error: "" })
                  setInputValue("")
                  setSelectedFactory(null)
                }}
                variant="outline"
              >
                E X I T
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={showPasskeyModal} onOpenChange={setShowPasskeyModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Passkey</DialogTitle>
            <DialogDescription>
              Please enter the passkey to access the dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="Enter passkey"
              value={passkeyInput}
              onChange={(e) => setPasskeyInput(e.target.value)}
            />
            {passkeyError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{passkeyError}</AlertDescription>
              </Alert>
            )}
            <Button onClick={handlePasskeySubmit} className="w-full">
              Submit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
