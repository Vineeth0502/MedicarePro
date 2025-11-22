"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  MessageSquare, 
  Search, 
  Phone, 
  Mail, 
  Calendar, 
  Activity, 
  Stethoscope,
  UserCheck,
  Clock,
  Star,
  TrendingUp,
  Filter,
  Grid3x3,
  List,
  Award
} from "lucide-react"
import { usersAPI, appointmentsAPI } from "@/lib/api"
import { format, formatDistanceToNow } from "date-fns"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

export default function DoctorsPage() {
  const router = useRouter()
  const [doctors, setDoctors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [sortBy, setSortBy] = useState<string>("name")
  const [user, setUser] = useState<any>(null)
  const [doctorStats, setDoctorStats] = useState<any>({})

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user')
      if (userData) {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
        
        // Only patients can see doctors
        if (parsedUser.role === 'provider' || parsedUser.role === 'doctor' || parsedUser.role === 'admin') {
          router.push('/dashboard/patients')
          return
        }
      } else {
        router.push('/login')
        return
      }
    }
    loadDoctors()
  }, [router])

  useEffect(() => {
    if (doctors.length > 0) {
      loadDoctorStats()
    }
  }, [doctors])

  const loadDoctors = async () => {
    try {
      setLoading(true)
      const res = await usersAPI.getPatients({ role: 'provider' })
      const doctorsData = res.data.data?.patients || res.data.data || []
      setDoctors(Array.isArray(doctorsData) ? doctorsData : [])
    } catch (error) {
      console.error('Error loading doctors:', error)
      toast.error('Error', { description: 'Failed to load doctors.' })
      setDoctors([])
    } finally {
      setLoading(false)
    }
  }

  const loadDoctorStats = async () => {
    const stats: any = {}
    for (const doctor of doctors.slice(0, 10)) { // Limit to first 10 to avoid too many API calls
      try {
        // Get appointment count
        const appointmentsRes = await appointmentsAPI.getAppointments({ limit: 100 })
        const appointments = appointmentsRes.data.data?.appointments || appointmentsRes.data.data || []
        const doctorAppointments = appointments.filter((apt: any) => 
          (typeof apt.doctorId === 'object' ? apt.doctorId._id : apt.doctorId) === doctor._id
        )
        
        stats[doctor._id] = {
          appointmentCount: doctorAppointments.length,
          upcomingAppointments: doctorAppointments.filter((apt: any) => {
            const aptDate = new Date(apt.scheduledDate)
            return aptDate >= new Date() && (apt.status === 'scheduled' || apt.status === 'confirmed')
          }).length,
          completedAppointments: doctorAppointments.filter((apt: any) => apt.status === 'completed').length
        }
      } catch (error) {
        // Silently fail for individual doctor stats
      }
    }
    setDoctorStats(stats)
  }

  const handleStartChat = (doctorId: string) => {
    router.push(`/dashboard/messages?userId=${doctorId}`)
  }

  const getInitials = (doctor: any) => {
    const firstName = doctor.firstName || ''
    const lastName = doctor.lastName || ''
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase()
    }
    if (doctor.username) {
      return doctor.username.substring(0, 2).toUpperCase()
    }
    return 'D'
  }

  const getName = (doctor: any) => {
    if (doctor.firstName && doctor.lastName) {
      const name = `${doctor.firstName} ${doctor.lastName}`.trim()
      // Check if name already starts with Dr. or Dr (case insensitive)
      if (!name.match(/^Dr\.?\s+/i)) {
        return `Dr. ${name}`
      }
      return name
    }
    return doctor.username || doctor.email || 'Doctor'
  }

  const getDoctorStatus = (doctor: any) => {
    if (!doctor.lastLogin) return 'inactive'
    const daysSinceLogin = Math.floor((new Date().getTime() - new Date(doctor.lastLogin).getTime()) / (1000 * 60 * 60 * 24))
    if (daysSinceLogin <= 1) return 'active'
    if (daysSinceLogin <= 7) return 'recent'
    return 'inactive'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500'
      case 'recent':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-400'
    }
  }

  const filteredAndSortedDoctors = doctors
    .filter((doctor) => {
      if (searchTerm === "") return true
      const name = getName(doctor).toLowerCase()
      const email = (doctor.email || '').toLowerCase()
      const specialization = (doctor.profile?.specialization || '').toLowerCase()
      return name.includes(searchTerm.toLowerCase()) || 
             email.includes(searchTerm.toLowerCase()) ||
             specialization.includes(searchTerm.toLowerCase())
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return getName(a).localeCompare(getName(b))
        case 'recent':
          return new Date(b.lastLogin || 0).getTime() - new Date(a.lastLogin || 0).getTime()
        case 'appointments':
          return (doctorStats[b._id]?.appointmentCount || 0) - (doctorStats[a._id]?.appointmentCount || 0)
        default:
          return 0
      }
    })

  const stats = {
    total: doctors.length,
    active: doctors.filter(d => getDoctorStatus(d) === 'active').length,
    withAppointments: Object.values(doctorStats).filter((s: any) => s.appointmentCount > 0).length,
    recentActivity: doctors.filter(d => {
      const daysSinceLogin = d.lastLogin ? Math.floor((new Date().getTime() - new Date(d.lastLogin).getTime()) / (1000 * 60 * 60 * 24)) : 999
      return daysSinceLogin <= 7
    }).length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Stethoscope className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading doctors...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Doctors & Providers</h1>
          <p className="text-muted-foreground">Find and connect with healthcare professionals</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <Grid3x3 className="mr-2 h-4 w-4" />
            Grid
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="mr-2 h-4 w-4" />
            List
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Providers</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All healthcare providers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Now</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Active in last 24 hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withAppointments}</div>
            <p className="text-xs text-muted-foreground">Have appointments scheduled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentActivity}</div>
            <p className="text-xs text-muted-foreground">Active in last 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or specialization..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full md:w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name (A-Z)</SelectItem>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="appointments">Most Appointments</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Doctors List/Grid */}
      {filteredAndSortedDoctors.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Stethoscope className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No doctors or providers found</p>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedDoctors.map((doctor) => {
            const name = getName(doctor)
            const initials = getInitials(doctor)
            const status = getDoctorStatus(doctor)
            const stats = doctorStats[doctor._id] || {}

            return (
              <Card key={doctor._id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-4">
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-16 w-16">
                        <AvatarImage 
                          src={doctor.profilePicture 
                            ? (doctor.profilePicture.startsWith('http') 
                                ? doctor.profilePicture 
                                : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}${doctor.profilePicture}`)
                            : undefined
                          } 
                          alt={name} 
                        />
                        <AvatarFallback className="text-lg bg-primary/10 text-primary">{initials}</AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${getStatusColor(status)}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{name}</CardTitle>
                      <CardDescription className="truncate">{doctor.email}</CardDescription>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {doctor.role === 'provider' ? 'Provider' : 'Doctor'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {status === 'active' ? 'Active' : status === 'recent' ? 'Recent' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-muted rounded-md">
                      <div className="text-lg font-bold">{stats.appointmentCount || 0}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                    <div className="p-2 bg-muted rounded-md">
                      <div className="text-lg font-bold">{stats.upcomingAppointments || 0}</div>
                      <div className="text-xs text-muted-foreground">Upcoming</div>
                    </div>
                    <div className="p-2 bg-muted rounded-md">
                      <div className="text-lg font-bold">{stats.completedAppointments || 0}</div>
                      <div className="text-xs text-muted-foreground">Completed</div>
                    </div>
                  </div>

                  {/* Profile Info */}
                  {doctor.profile && (
                    <div className="space-y-2 text-sm border-t pt-3">
                      {doctor.profile.specialization && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Specialization:</span>
                          <Badge variant="secondary" className="font-medium">
                            {doctor.profile.specialization}
                          </Badge>
                        </div>
                      )}
                      {doctor.profile.experience && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Experience:</span>
                          <span className="font-medium flex items-center gap-1">
                            <Award className="h-3 w-3" />
                            {doctor.profile.experience} years
                          </span>
                        </div>
                      )}
                      {doctor.profile.phone && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Phone:</span>
                          <span className="font-medium">{doctor.profile.phone}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {doctor.lastLogin && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Last active: {formatDistanceToNow(new Date(doctor.lastLogin), { addSuffix: true })}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="default"
                      className="flex-1"
                      onClick={() => handleStartChat(doctor._id)}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Chat
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => router.push(`/dashboard/appointments?doctorId=${doctor._id}`)}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Book
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredAndSortedDoctors.map((doctor) => {
                const name = getName(doctor)
                const initials = getInitials(doctor)
                const status = getDoctorStatus(doctor)
                const stats = doctorStats[doctor._id] || {}

                return (
                  <div key={doctor._id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarImage 
                            src={doctor.profilePicture 
                              ? (doctor.profilePicture.startsWith('http') 
                                  ? doctor.profilePicture 
                                  : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}${doctor.profilePicture}`)
                              : undefined
                            } 
                            alt={name} 
                          />
                          <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(status)}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">{name}</h3>
                          <Badge variant="outline" className="text-xs">
                            {doctor.role === 'provider' ? 'Provider' : 'Doctor'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {status === 'active' ? 'Active' : status === 'recent' ? 'Recent' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{doctor.email}</p>
                        {doctor.profile && (
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            {doctor.profile.specialization && <span>{doctor.profile.specialization}</span>}
                            {doctor.profile.experience && <span>{doctor.profile.experience} years exp.</span>}
                            {stats.appointmentCount > 0 && <span>{stats.appointmentCount} appointments</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStartChat(doctor._id)}
                        >
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Chat
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => router.push(`/dashboard/appointments?doctorId=${doctor._id}`)}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          Book Appointment
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
