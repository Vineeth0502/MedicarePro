"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { appointmentsAPI } from "@/lib/api"
import { format } from "date-fns"

export function RecentAppointments() {
  const router = useRouter()
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAppointments()
  }, [])

  const loadAppointments = async () => {
    try {
      setLoading(true)
      const res = await appointmentsAPI.getAppointments({ limit: 5 })
      const appointmentsData = res.data.data?.appointments || res.data.data || []
      setAppointments(Array.isArray(appointmentsData) ? appointmentsData : [])
    } catch (error) {
      console.error('Error loading appointments:', error)
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }

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

  const getPersonName = (appointment: any, userRole: string) => {
    if (userRole === 'patient') {
      // Patient sees doctor name with Dr. prefix
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
      // Provider sees patient name
      const patient = appointment.patientId
      if (typeof patient === 'object' && patient) {
        return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.email || 'Patient'
      }
      return 'Patient'
    }
  }

  const getInitials = (name: string) => {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return format(date, 'h:mm a')
    } catch {
      return dateString
    }
  }

  if (loading) {
    return (
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Recent Appointments</CardTitle>
          <CardDescription>Today's schedule and patient status.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  if (appointments.length === 0) {
    return (
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Recent Appointments</CardTitle>
          <CardDescription>Today's schedule and patient status.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">No appointments scheduled</div>
        </CardContent>
      </Card>
    )
  }

  const userRole = typeof window !== 'undefined' 
    ? JSON.parse(localStorage.getItem('user') || '{}')?.role || 'patient'
    : 'patient'

  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Recent Appointments</CardTitle>
        <CardDescription>Today's schedule and patient status.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {appointments.map((appointment, index) => {
            const personName = getPersonName(appointment, userRole)
            const initials = getInitials(personName)
            
            return (
              <div 
                key={appointment._id || index} 
                className="flex items-center cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors"
                onClick={() => router.push('/dashboard/appointments')}
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src="/placeholder-user.jpg" alt={personName} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="ml-4 space-y-1 flex-1">
                  <p className="text-sm font-medium leading-none">{personName}</p>
                  <p className="text-xs text-muted-foreground">
                    {appointment.appointmentType?.replace('_', ' ') || 'Consultation'} • {formatTime(appointment.scheduledDate)}
                  </p>
                </div>
                <div className="ml-auto font-medium">
                  <Badge
                    variant={getStatusVariant(appointment.status)}
                    className="text-xs"
                  >
                    {formatStatus(appointment.status)}
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
