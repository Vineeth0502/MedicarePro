"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, Calendar as CalendarIcon, Search, Filter, Edit, Trash2, X, MapPin, Video, Phone, Clock, CalendarDays, Repeat, FileText, AlertTriangle, Download, BarChart3, Grid3x3, List } from "lucide-react"
import { appointmentsAPI, usersAPI } from "@/lib/api"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export default function AppointmentsPage() {
  const router = useRouter()
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [user, setUser] = useState<any>(null)
  const [patients, setPatients] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [formData, setFormData] = useState({
    patientId: "",
    doctorId: "",
    title: "",
    description: "",
    appointmentType: "consultation",
    scheduledDate: "",
    duration: 30,
    location: {
      type: "in_person" as "in_person" | "virtual" | "phone",
      address: "",
      room: "",
      virtualLink: "",
    },
    notes: "",
    isRecurring: false,
    recurrencePattern: "none" as "none" | "daily" | "weekly" | "monthly",
    recurrenceEndDate: "",
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user')
      if (userData) {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
      } else {
        router.push('/login')
      }
    }
    loadAppointments()
  }, [router])

  // Load users after user state is set
  useEffect(() => {
    if (user) {
      loadUsers()
    }
  }, [user])

  const loadAppointments = async () => {
    try {
      setLoading(true)
      const params: any = { limit: 50 }
      if (statusFilter !== "all") {
        params.status = statusFilter
      }
      const res = await appointmentsAPI.getAppointments(params)
      const appointmentsData = res.data.data?.appointments || res.data.data || []
      setAppointments(Array.isArray(appointmentsData) ? appointmentsData : [])
    } catch (error) {
      console.error('Error loading appointments:', error)
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      if (user?.role === 'patient') {
        // For patients, load doctors/providers
        try {
          const res = await usersAPI.getDoctors()
          const doctorsData = res.data.data?.doctors || res.data.data?.patients || res.data.data || []
          setDoctors(Array.isArray(doctorsData) ? doctorsData : [])
        } catch (err) {
          // Fallback: try getPatients with provider role
          const res = await usersAPI.getPatients({ role: 'provider' })
          const doctorsData = res.data.data?.patients || res.data.data || []
          setDoctors(Array.isArray(doctorsData) ? doctorsData : [])
        }
      } else if (user?.role === 'provider' || user?.role === 'doctor' || user?.role === 'admin') {
        // For doctors/providers, load patients
        const res = await usersAPI.getPatients({ role: 'patient' })
        const patientsData = res.data.data?.patients || res.data.data || []
        setPatients(Array.isArray(patientsData) ? patientsData : [])
      }
    } catch (error) {
      console.error('Error loading users:', error)
      toast.error('Error', { description: 'Failed to load users. Please refresh the page.' })
    }
  }

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isSubmitting) return // Prevent double submission
    
    setIsSubmitting(true)
    
    try {
      // Validate required fields
      if (!formData.title || formData.title.trim() === '') {
        toast.error('Validation Error', {
          description: 'Please enter an appointment title'
        })
        setIsSubmitting(false)
        return
      }

      if (!formData.scheduledDate) {
        toast.error('Validation Error', {
          description: 'Please select a date and time for the appointment'
        })
        setIsSubmitting(false)
        return
      }

      // Validate patient/doctor selection based on role
      if (user?.role === 'patient' && !formData.doctorId) {
        toast.error('Validation Error', {
          description: 'Please select a doctor for the appointment'
        })
        setIsSubmitting(false)
        return
      }

      if ((user?.role === 'doctor' || user?.role === 'provider') && !formData.patientId) {
        toast.error('Validation Error', {
          description: 'Please select a patient for the appointment'
        })
        setIsSubmitting(false)
        return
      }
      // Convert datetime-local format to ISO 8601
      // datetime-local gives format: "YYYY-MM-DDTHH:mm"
      // We need to convert it to ISO 8601: "YYYY-MM-DDTHH:mm:ss.sssZ"
      let scheduledDateISO = formData.scheduledDate
      if (formData.scheduledDate) {
        // datetime-local gives us local time, so we create a Date object
        // and convert to ISO string
        const localDate = new Date(formData.scheduledDate)
        if (isNaN(localDate.getTime())) {
          toast.error('Validation Error', {
            description: 'Please enter a valid date and time'
          })
          setIsSubmitting(false)
          return
        }
        scheduledDateISO = localDate.toISOString()
      }

      // Check for conflicts before creating
      const conflicts = await checkForConflicts(scheduledDateISO, parseInt(formData.duration.toString()) || 30)
      if (conflicts.length > 0) {
        const conflictMessage = conflicts.map((c: any) => 
          `${format(new Date(c.scheduledDate), 'PPp')} with ${getPersonName(c)}`
        ).join('\n')
        if (!confirm(`Warning: This appointment may conflict with existing appointments:\n\n${conflictMessage}\n\nDo you want to proceed anyway?`)) {
          return
        }
      }

      // Prepare data for API
      const appointmentData: any = {
        title: formData.title.trim(),
        description: formData.description?.trim() || '',
        appointmentType: formData.appointmentType,
        scheduledDate: scheduledDateISO,
        duration: parseInt(formData.duration.toString()) || 30,
        location: formData.location,
        notes: formData.notes?.trim() || '',
      }

      // Add patient/doctor ID based on role
      if (user?.role === 'patient') {
        appointmentData.doctorId = formData.doctorId
      } else if (user?.role === 'doctor' || user?.role === 'provider') {
        appointmentData.patientId = formData.patientId
      }

      console.log('Creating appointment with data:', appointmentData)

      const response = await appointmentsAPI.createAppointment(appointmentData)
      
        // Show success message
        if (response.data.success) {
          // Play notification sound
          playNotificationSound()
          
          // Show success toast
          toast.success('Appointment Created', {
            description: 'Appointment created successfully! Notifications have been sent to both parties.'
          })
        }
      
      setIsCreateDialogOpen(false)
      setFormData({
        patientId: "",
        doctorId: "",
        title: "",
        description: "",
        appointmentType: "consultation",
        scheduledDate: "",
        duration: 30,
        location: {
          type: "in_person",
          address: "",
          room: "",
          virtualLink: "",
        },
        notes: "",
        isRecurring: false,
        recurrencePattern: "none",
        recurrenceEndDate: "",
      })
      loadAppointments()
    } catch (error: any) {
      console.error('Error creating appointment:', error)
      // Show detailed error message
      if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors.map((err: any) => err.msg || err.message).join(', ')
        toast.error('Validation Failed', {
          description: errorMessages
        })
      } else {
        const errorMessage = error.response?.data?.message || 'Failed to create appointment. Please try again.'
        toast.error('Error', {
          description: errorMessage
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditAppointment = (appointment: any) => {
    // Convert ISO date to datetime-local format
    const date = new Date(appointment.scheduledDate)
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    const datetimeLocal = localDate.toISOString().slice(0, 16)

    // Normalize location for form (convert address object to string if needed)
    let normalizedLocation = {
      type: appointment.location?.type || "in_person",
      address: "",
      room: appointment.location?.room || "",
      virtualLink: appointment.location?.virtualLink || "",
    }

    if (appointment.location?.address) {
      if (typeof appointment.location.address === 'object') {
        // Extract string from address object
        const addr = appointment.location.address
        normalizedLocation.address = addr.street || addr.city || addr.state || ""
      } else {
        normalizedLocation.address = appointment.location.address
      }
    }

    setEditingAppointment(appointment)
    setFormData({
      patientId: typeof appointment.patientId === 'object' ? appointment.patientId._id : appointment.patientId || "",
      doctorId: typeof appointment.doctorId === 'object' ? appointment.doctorId._id : appointment.doctorId || "",
      title: appointment.title || "",
      description: appointment.description || "",
      appointmentType: appointment.appointmentType || "consultation",
      scheduledDate: datetimeLocal,
      duration: appointment.duration || 30,
      location: normalizedLocation,
      notes: appointment.notes || "",
      isRecurring: false,
      recurrencePattern: "none",
      recurrenceEndDate: "",
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingAppointment) return
    
    if (isSubmitting) return // Prevent double submission
    
    setIsSubmitting(true)

    try {
      // Validate required fields
      if (!formData.title || formData.title.trim() === '') {
        toast.error('Validation Error', {
          description: 'Please enter an appointment title'
        })
        setIsSubmitting(false)
        return
      }

      if (!formData.scheduledDate) {
        toast.error('Validation Error', {
          description: 'Please select a date and time for the appointment'
        })
        setIsSubmitting(false)
        return
      }
      
      // Convert datetime-local format to ISO 8601
      let scheduledDateISO = formData.scheduledDate
      if (formData.scheduledDate) {
        const localDate = new Date(formData.scheduledDate)
        if (isNaN(localDate.getTime())) {
          toast.error('Validation Error', {
            description: 'Please enter a valid date and time'
          })
          setIsSubmitting(false)
          return
        }
        scheduledDateISO = localDate.toISOString()
      }

      // Check for conflicts before updating (excluding current appointment)
      const conflicts = await checkForConflicts(scheduledDateISO, parseInt(formData.duration.toString()) || 30)
      const relevantConflicts = conflicts.filter((c: any) => c._id !== editingAppointment._id)
      if (relevantConflicts.length > 0) {
        const conflictMessage = relevantConflicts.map((c: any) => 
          `${format(new Date(c.scheduledDate), 'PPp')} with ${getPersonName(c)}`
        ).join('\n')
        if (!confirm(`Warning: This appointment may conflict with existing appointments:\n\n${conflictMessage}\n\nDo you want to proceed anyway?`)) {
          setIsSubmitting(false)
          return
        }
      }

      // Prepare data for API
      const updateData: any = {
        title: formData.title.trim(),
        description: formData.description?.trim() || '',
        appointmentType: formData.appointmentType,
        scheduledDate: scheduledDateISO,
        duration: parseInt(formData.duration.toString()) || 30,
        location: formData.location,
        notes: formData.notes?.trim() || '',
      }

      await appointmentsAPI.updateAppointment(editingAppointment._id, updateData)
      
      toast.success('Appointment Updated', {
        description: 'Appointment updated successfully!'
      })
      
      setIsEditDialogOpen(false)
      setEditingAppointment(null)
      setFormData({
        patientId: "",
        doctorId: "",
        title: "",
        description: "",
        appointmentType: "consultation",
        scheduledDate: "",
        duration: 30,
        location: {
          type: "in_person",
          address: "",
          room: "",
          virtualLink: "",
        },
        notes: "",
        isRecurring: false,
        recurrencePattern: "none",
        recurrenceEndDate: "",
      })
      loadAppointments()
    } catch (error: any) {
        console.error('Error updating appointment:', error)
        if (error.response?.data?.errors) {
          const errorMessages = error.response.data.errors.map((err: any) => err.msg || err.message).join(', ')
          toast.error('Validation Failed', {
            description: errorMessages
          })
        } else {
          const errorMessage = error.response?.data?.message || 'Failed to update appointment. Please try again.'
          toast.error('Error', {
            description: errorMessage
          })
        }
      } finally {
        setIsSubmitting(false)
      }
  }

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!confirm('Are you sure you want to delete this appointment? This action cannot be undone.')) {
      return
    }

      try {
        await appointmentsAPI.deleteAppointment(appointmentId)
        toast.success('Appointment Deleted', {
          description: 'Appointment deleted successfully!'
        })
        loadAppointments()
      } catch (error: any) {
        console.error('Error deleting appointment:', error)
        const errorMessage = error.response?.data?.message || 'Failed to delete appointment. Please try again.'
        toast.error('Error', {
          description: errorMessage
        })
      }
  }

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      await appointmentsAPI.updateAppointment(appointmentId, { status: newStatus })
      loadAppointments()
      } catch (error: any) {
        console.error('Error updating appointment status:', error)
        toast.error('Error', {
          description: 'Failed to update appointment status. Please try again.'
        })
      }
  }

  const playNotificationSound = () => {
    try {
      // Create audio context for notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // Set a pleasant notification tone
      oscillator.frequency.value = 800 // Higher pitch
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    } catch (error) {
      // Fallback: Try using HTML5 audio if Web Audio API fails
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjGH0fPTgjMGHm7A7+OZSw=')
        audio.volume = 0.3
        audio.play().catch(() => {
          console.log('Notification sound could not be played')
        })
      } catch (fallbackError) {
        console.log('Notification sound not available')
      }
    }
  }

  const filteredAppointments = appointments.filter((apt) => {
    const matchesSearch = searchTerm === "" || 
      apt.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (typeof apt.patientId === 'object' && apt.patientId && 
        `${apt.patientId.firstName} ${apt.patientId.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (typeof apt.doctorId === 'object' && apt.doctorId && 
        `${apt.doctorId.firstName} ${apt.doctorId.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesSearch
  })

  const getStatusVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'secondary'
      case 'in_progress':
        return 'default'
      case 'cancelled':
        return 'destructive'
      case 'scheduled':
      case 'confirmed':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const formatStatus = (status: string) => {
    return status?.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()) || 'Scheduled'
  }

  const checkForConflicts = async (scheduledDate: string, duration: number) => {
    try {
      const startDate = new Date(scheduledDate)
      const endDate = new Date(startDate.getTime() + duration * 60000)
      
      const res = await appointmentsAPI.getAppointments({ 
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      })
      
      const existingAppointments = res.data.data?.appointments || res.data.data || []
      const conflicts = existingAppointments.filter((apt: any) => {
        if (apt.status === 'cancelled' || apt.status === 'completed') return false
        
        const aptStart = new Date(apt.scheduledDate)
        const aptEnd = new Date(aptStart.getTime() + (apt.duration || 30) * 60000)
        
        // Check if appointments overlap
        return (startDate < aptEnd && endDate > aptStart)
      })
      
      return conflicts
    } catch (error) {
      console.error('Error checking conflicts:', error)
      return []
    }
  }

  const getPersonName = (appointment: any) => {
    if (user?.role === 'patient') {
      const doctor = appointment.doctorId
      if (typeof doctor === 'object' && doctor) {
        const name = `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim()
        if (name) {
          // Check if name already starts with Dr. or Dr (case insensitive)
          if (!name.match(/^Dr\.?\s+/i)) {
            return `Dr. ${name}`
          }
          return name
        }
        return doctor.email || 'Doctor'
      }
      return 'Doctor'
    } else {
      const patient = appointment.patientId
      if (typeof patient === 'object' && patient) {
        return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.email || 'Patient'
      }
      return 'Patient'
    }
  }

  const getLocationAddress = (location: any) => {
    if (!location) return null
    
    // Handle address as object (from backend normalization)
    if (location.address && typeof location.address === 'object') {
      const addr = location.address
      // Build address string from object
      const parts = [
        addr.street,
        addr.city,
        addr.state,
        addr.zipCode,
        addr.country
      ].filter(Boolean)
      return parts.length > 0 ? parts.join(', ') : null
    }
    
    // Handle address as string (legacy or direct input)
    if (typeof location.address === 'string' && location.address.trim()) {
      return location.address
    }
    
    // Fallback to room
    if (location.room && typeof location.room === 'string') {
      return location.room
    }
    
    return null
  }

  const getAppointmentStats = () => {
    const stats = {
      total: appointments.length,
      scheduled: appointments.filter((a: any) => a.status === 'scheduled').length,
      confirmed: appointments.filter((a: any) => a.status === 'confirmed').length,
      inProgress: appointments.filter((a: any) => a.status === 'in_progress').length,
      completed: appointments.filter((a: any) => a.status === 'completed').length,
      cancelled: appointments.filter((a: any) => a.status === 'cancelled').length,
      today: appointments.filter((a: any) => {
        const aptDate = new Date(a.scheduledDate)
        const today = new Date()
        return aptDate.toDateString() === today.toDateString()
      }).length,
      upcoming: appointments.filter((a: any) => {
        const aptDate = new Date(a.scheduledDate)
        return aptDate > new Date() && (a.status === 'scheduled' || a.status === 'confirmed')
      }).length,
    }
    return stats
  }

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter((apt: any) => {
      const aptDate = new Date(apt.scheduledDate)
      return aptDate.toDateString() === date.toDateString()
    })
  }

  const getDatesWithAppointments = () => {
    const dates = new Set<string>()
    appointments.forEach((apt: any) => {
      const aptDate = new Date(apt.scheduledDate)
      dates.add(aptDate.toDateString())
    })
    return Array.from(dates).map(dateStr => new Date(dateStr))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <CalendarIcon className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading appointments...</p>
        </div>
      </div>
    )
  }

  const stats = getAppointmentStats()

  function renderAppointmentsView() {
    if (viewMode === "calendar") {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Calendar View</CardTitle>
            <CardDescription>Select a date to view appointments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="rounded-md border flex-shrink-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  modifiers={{
                    hasAppointment: getDatesWithAppointments()
                  }}
                />
              </div>
              <div className="flex-1">
                {selectedDate && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">
                      Appointments for {format(selectedDate, 'PP')}
                    </h3>
                    {getAppointmentsForDate(selectedDate).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No appointments scheduled for this date</p>
                    ) : (
                      <div className="space-y-2">
                        {getAppointmentsForDate(selectedDate).map((apt: any) => (
                          <Card key={apt._id} className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{apt.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(apt.scheduledDate), 'h:mm a')} • {getPersonName(apt)}
                                </p>
                              </div>
                              <Badge variant={getStatusVariant(apt.status)}>
                                {formatStatus(apt.status)}
                              </Badge>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )
    } else {
      return (
        <div className="grid gap-4">
          {filteredAppointments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No appointments found</p>
              </CardContent>
            </Card>
          ) : (
            filteredAppointments.map((appointment) => (
              <Card key={appointment._id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">{appointment.title}</CardTitle>
                      <Badge variant={getStatusVariant(appointment.status)} className="text-xs">
                        {formatStatus(appointment.status)}
                      </Badge>
                    </div>
                    <CardDescription>
                      {getPersonName(appointment)} • {format(new Date(appointment.scheduledDate), 'PPp')}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEditAppointment(appointment)}
                      title="Edit appointment"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteAppointment(appointment._id)}
                      title="Delete appointment"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                      <span>
                        Type: <span className="font-medium text-foreground">{appointment.appointmentType?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</span>
                      </span>
                      <span>
                        Duration: <span className="font-medium text-foreground">{appointment.duration || 30} min</span>
                      </span>
                    </div>
                    <Select
                      value={appointment.status}
                      onValueChange={(value) => handleStatusChange(appointment._id, value)}
                    >
                      <SelectTrigger className="w-full sm:w-[140px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="no_show">No Show</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {appointment.description && (
                    <p className="text-sm text-muted-foreground pt-1">{appointment.description}</p>
                  )}
                  {appointment.location && (
                    <div className="flex items-center gap-2 mt-2 text-sm">
                      {appointment.location.type === "virtual" && (
                        <>
                          <Video className="h-4 w-4 text-blue-500" />
                          {appointment.location.virtualLink ? (
                            <a 
                              href={appointment.location.virtualLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              Join Virtual Meeting
                            </a>
                          ) : (
                            <span className="text-muted-foreground">Virtual appointment</span>
                          )}
                        </>
                      )}
                      {appointment.location.type === "phone" && (
                        <>
                          <Phone className="h-4 w-4 text-green-500" />
                          <span className="text-muted-foreground">
                            Phone: {getLocationAddress(appointment.location) || "To be provided"}
                          </span>
                        </>
                      )}
                      {appointment.location.type === "in_person" && (
                        <>
                          <MapPin className="h-4 w-4 text-red-500" />
                          <span className="text-muted-foreground">
                            {getLocationAddress(appointment.location) || "In-person appointment"}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                  {appointment.notes && (
                    <div className="mt-2 p-2 bg-muted rounded-md">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">Notes</span>
                      </div>
                      <p className="text-sm text-foreground">{appointment.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
              </Card>
            ))
          )}
        </div>
      )
    }
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.today}</div>
            <p className="text-xs text-muted-foreground">Scheduled for today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcoming}</div>
            <p className="text-xs text-muted-foreground">Future appointments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Finished appointments</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground">Manage your appointments and schedule</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="mr-2 h-4 w-4" />
            List
          </Button>
          <Button
            variant={viewMode === "calendar" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("calendar")}
          >
            <Grid3x3 className="mr-2 h-4 w-4" />
            Calendar
          </Button>
        </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Appointment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[95vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Create New Appointment</DialogTitle>
              <DialogDescription>
                Schedule a new appointment
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateAppointment} className="space-y-3 sm:space-y-4">
              {user?.role === 'patient' ? (
                <div className="space-y-2">
                  <Label>Doctor</Label>
                  <Select
                    value={formData.doctorId}
                    onValueChange={(value) => setFormData({ ...formData, doctorId: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a doctor" />
                    </SelectTrigger>
                      <SelectContent>
                        {doctors.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            No doctors available
                          </div>
                        ) : (
                          doctors.map((doctor) => {
                            let doctorName = doctor.email || 'Doctor'
                            if (doctor.firstName && doctor.lastName) {
                              const name = `${doctor.firstName} ${doctor.lastName}`.trim()
                              // Check if name already starts with Dr. or Dr (case insensitive)
                              if (!name.match(/^Dr\.?\s+/i)) {
                                doctorName = `Dr. ${name}`
                              } else {
                                doctorName = name
                              }
                            }
                            return (
                              <SelectItem key={doctor._id} value={doctor._id}>
                                {doctorName} ({doctor.email})
                              </SelectItem>
                            )
                          })
                        )}
                      </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Patient</Label>
                  <Select
                    value={formData.patientId}
                    onValueChange={(value) => setFormData({ ...formData, patientId: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient._id} value={patient._id}>
                          {patient.firstName} {patient.lastName} ({patient.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Appointment title"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Appointment description"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.appointmentType}
                  onValueChange={(value) => setFormData({ ...formData, appointmentType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consultation">Consultation</SelectItem>
                    <SelectItem value="checkup">Check-up</SelectItem>
                    <SelectItem value="follow_up">Follow-up</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="surgery">Surgery</SelectItem>
                    <SelectItem value="therapy">Therapy</SelectItem>
                    <SelectItem value="diagnostic">Diagnostic</SelectItem>
                    <SelectItem value="vaccination">Vaccination</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                  required
                  min={new Date().toISOString().slice(0, 16)}
                />
                <p className="text-xs text-muted-foreground">
                  Select a future date and time for the appointment
                </p>
              </div>
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={formData.duration || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, duration: val === '' ? 30 : parseInt(val) || 30 });
                  }}
                  min={15}
                  max={480}
                />
              </div>
              
              {/* Location Type */}
              <div className="space-y-2">
                <Label>Location Type</Label>
                <Select
                  value={formData.location.type}
                  onValueChange={(value: "in_person" | "virtual" | "phone") => 
                    setFormData({ ...formData, location: { ...formData.location, type: value } })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_person">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        In Person
                      </div>
                    </SelectItem>
                    <SelectItem value="virtual">
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        Virtual
                      </div>
                    </SelectItem>
                    <SelectItem value="phone">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Location Details */}
              {formData.location.type === "in_person" && (
                <div className="space-y-2">
                  <Label>Address / Room</Label>
                  <Input
                    value={formData.location.address || formData.location.room || ""}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      location: { ...formData.location, address: e.target.value, room: e.target.value } 
                    })}
                    placeholder="Enter address or room number"
                  />
                </div>
              )}

              {formData.location.type === "virtual" && (
                <div className="space-y-2">
                  <Label>Virtual Meeting Link</Label>
                  <Input
                    value={formData.location.virtualLink || ""}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      location: { ...formData.location, virtualLink: e.target.value } 
                    })}
                    placeholder="https://meet.google.com/xxx-xxxx-xxx or Zoom link"
                  />
                </div>
              )}

              {formData.location.type === "phone" && (
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    value={formData.location.address || ""}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      location: { ...formData.location, address: e.target.value } 
                    })}
                    placeholder="Phone number for call"
                  />
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes or instructions..."
                  rows={3}
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsCreateDialogOpen(false)
                    setIsSubmitting(false)
                  }}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                  {isSubmitting ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Appointment Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[95vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Edit Appointment</DialogTitle>
              <DialogDescription>
                Update appointment details
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateAppointment} className="space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Appointment title"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Appointment description"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.appointmentType}
                  onValueChange={(value) => setFormData({ ...formData, appointmentType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consultation">Consultation</SelectItem>
                    <SelectItem value="checkup">Check-up</SelectItem>
                    <SelectItem value="follow_up">Follow-up</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="surgery">Surgery</SelectItem>
                    <SelectItem value="therapy">Therapy</SelectItem>
                    <SelectItem value="diagnostic">Diagnostic</SelectItem>
                    <SelectItem value="vaccination">Vaccination</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={formData.duration || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, duration: val === '' ? 30 : parseInt(val) || 30 });
                  }}
                  min={15}
                  max={480}
                />
              </div>
              
              {/* Location Type */}
              <div className="space-y-2">
                <Label>Location Type</Label>
                <Select
                  value={formData.location.type}
                  onValueChange={(value: "in_person" | "virtual" | "phone") => 
                    setFormData({ ...formData, location: { ...formData.location, type: value } })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_person">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        In Person
                      </div>
                    </SelectItem>
                    <SelectItem value="virtual">
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        Virtual
                      </div>
                    </SelectItem>
                    <SelectItem value="phone">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Location Details */}
              {formData.location.type === "in_person" && (
                <div className="space-y-2">
                  <Label>Address / Room</Label>
                  <Input
                    value={formData.location.address || formData.location.room || ""}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      location: { ...formData.location, address: e.target.value, room: e.target.value } 
                    })}
                    placeholder="Enter address or room number"
                  />
                </div>
              )}

              {formData.location.type === "virtual" && (
                <div className="space-y-2">
                  <Label>Virtual Meeting Link</Label>
                  <Input
                    value={formData.location.virtualLink || ""}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      location: { ...formData.location, virtualLink: e.target.value } 
                    })}
                    placeholder="https://meet.google.com/xxx-xxxx-xxx or Zoom link"
                  />
                </div>
              )}

              {formData.location.type === "phone" && (
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    value={formData.location.address || ""}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      location: { ...formData.location, address: e.target.value } 
                    })}
                    placeholder="Phone number for call"
                  />
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes or instructions..."
                  rows={3}
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsEditDialogOpen(false)
                    setEditingAppointment(null)
                    setIsSubmitting(false)
                    setFormData({
                      patientId: "",
                      doctorId: "",
                      title: "",
                      description: "",
                      appointmentType: "consultation",
                      scheduledDate: "",
                      duration: 30,
                      location: {
                        type: "in_person",
                        address: "",
                        room: "",
                        virtualLink: "",
                      },
                      notes: "",
                      isRecurring: false,
                      recurrencePattern: "none",
                      recurrenceEndDate: "",
                    })
                  }}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                  {isSubmitting ? 'Updating...' : 'Update'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search appointments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 w-full"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value) => {
          setStatusFilter(value)
          loadAppointments()
        }}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {renderAppointmentsView()}
    </div>
  )
}

