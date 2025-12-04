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
  Users, 
  UserCheck, 
  Clock,
  Heart,
  TrendingUp,
  Filter,
  Grid3x3,
  List
} from "lucide-react"
import { usersAPI, appointmentsAPI, healthMetricsAPI } from "@/lib/api"
import { format, formatDistanceToNow } from "date-fns"
import { getBackendBaseUrl } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

export default function PatientsPage() {
  const router = useRouter()
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [sortBy, setSortBy] = useState<string>("name")
  const [user, setUser] = useState<any>(null)
  const [patientStats, setPatientStats] = useState<any>({})

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user')
      if (userData) {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
        
        // Only providers/doctors can see patients
        if (parsedUser.role !== 'provider' && parsedUser.role !== 'doctor' && parsedUser.role !== 'admin') {
          router.push('/dashboard/doctors')
          return
        }
      } else {
        router.push('/login')
        return
      }
    }
    loadPatients()
  }, [router])

  useEffect(() => {
    if (patients.length > 0) {
      // Load stats separately with its own loading state (non-blocking)
      setStatsLoading(true)
      loadPatientStats().finally(() => setStatsLoading(false))
    }
  }, [patients.length]) // Only depend on length to avoid re-running

  const loadPatients = async () => {
    try {
      setLoading(true)
      const res = await usersAPI.getPatients({ role: 'patient' }) // No limit - get all patients
      const patientsData = res.data.data?.patients || res.data.data || []
      setPatients(Array.isArray(patientsData) ? patientsData : [])
    } catch (error) {
      console.error('Error loading patients:', error)
      toast.error('Error', { description: 'Failed to load patients.' })
      setPatients([])
    } finally {
      setLoading(false)
    }
  }

  const loadPatientStats = async () => {
    try {
      // Use the new optimized endpoint that gets all stats in one call
      const res = await usersAPI.getPatientsStats()
      const statsData = res.data.data?.stats || {}
      setPatientStats(statsData)
    } catch (error) {
      console.error('Error loading patient stats:', error)
      // Set empty stats on error to prevent infinite loading
      const emptyStats: any = {}
      patients.forEach(patient => {
        emptyStats[patient._id] = {
          appointmentCount: 0,
          upcomingAppointments: 0,
          recentMetrics: 0,
          lastMetricDate: null
        }
      })
      setPatientStats(emptyStats)
    }
  }

  const handleStartChat = (patientId: string) => {
    router.push(`/dashboard/messages?userId=${patientId}`)
  }

  const getInitials = (patient: any) => {
    const firstName = patient.firstName || ''
    const lastName = patient.lastName || ''
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase()
    }
    if (patient.username) {
      return patient.username.substring(0, 2).toUpperCase()
    }
    return 'P'
  }

  const getName = (patient: any) => {
    if (patient.firstName && patient.lastName) {
      return `${patient.firstName} ${patient.lastName}`
    }
    return patient.username || patient.email || 'Patient'
  }

  const getPatientStatus = (patient: any) => {
    if (!patient.lastLogin) return 'inactive'
    const daysSinceLogin = Math.floor((new Date().getTime() - new Date(patient.lastLogin).getTime()) / (1000 * 60 * 60 * 24))
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

  const filteredAndSortedPatients = patients
    .filter((patient) => {
      if (searchTerm === "") return true
      const name = getName(patient).toLowerCase()
      const email = (patient.email || '').toLowerCase()
      return name.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase())
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return getName(a).localeCompare(getName(b))
        case 'recent':
          return new Date(b.lastLogin || 0).getTime() - new Date(a.lastLogin || 0).getTime()
        case 'appointments':
          return (patientStats[b._id]?.appointmentCount || 0) - (patientStats[a._id]?.appointmentCount || 0)
        default:
          return 0
      }
    })

  const stats = {
    total: patients.length,
    active: patients.filter(p => getPatientStatus(p) === 'active').length,
    withAppointments: Object.values(patientStats).filter((s: any) => s.appointmentCount > 0).length,
    recentActivity: patients.filter(p => {
      const daysSinceLogin = p.lastLogin ? Math.floor((new Date().getTime() - new Date(p.lastLogin).getTime()) / (1000 * 60 * 60 * 24)) : 999
      return daysSinceLogin <= 7
    }).length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading patients...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Patients</h1>
          <p className="text-muted-foreground">Manage and monitor all your patients</p>
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
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All registered patients</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Patients</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Active in last 24 hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withAppointments}</div>
            <p className="text-xs text-muted-foreground">Have scheduled appointments</p>
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
            placeholder="Search patients by name or email..."
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

      {/* Patients List/Grid */}
      {filteredAndSortedPatients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No patients found</p>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedPatients.map((patient) => {
            const name = getName(patient)
            const initials = getInitials(patient)
            const status = getPatientStatus(patient)
            const stats = patientStats[patient._id] || {}

            return (
              <Card key={patient._id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-4">
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-16 w-16">
                        <AvatarImage 
                          src={patient.profilePicture 
                            ? (patient.profilePicture.startsWith('http') 
                                ? patient.profilePicture 
                                : `${getBackendBaseUrl()}${patient.profilePicture}`)
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
                      <CardDescription className="truncate">{patient.email}</CardDescription>
                      <div className="flex items-center gap-2 mt-1">
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
                      {statsLoading ? (
                        <div className="h-6 w-8 bg-muted-foreground/20 animate-pulse mx-auto rounded mb-1" />
                      ) : (
                        <div className="text-lg font-bold">{stats.appointmentCount || 0}</div>
                      )}
                      <div className="text-xs text-muted-foreground">Appointments</div>
                    </div>
                    <div className="p-2 bg-muted rounded-md">
                      {statsLoading ? (
                        <div className="h-6 w-8 bg-muted-foreground/20 animate-pulse mx-auto rounded mb-1" />
                      ) : (
                        <div className="text-lg font-bold">{stats.upcomingAppointments || 0}</div>
                      )}
                      <div className="text-xs text-muted-foreground">Upcoming</div>
                    </div>
                    <div className="p-2 bg-muted rounded-md">
                      {statsLoading ? (
                        <div className="h-6 w-8 bg-muted-foreground/20 animate-pulse mx-auto rounded mb-1" />
                      ) : (
                        <div className="text-lg font-bold">{stats.recentMetrics || 0}</div>
                      )}
                      <div className="text-xs text-muted-foreground">Metrics</div>
                    </div>
                  </div>

                  {/* Profile Info */}
                  {patient.profile && (
                    <div className="space-y-2 text-sm border-t pt-3">
                      {patient.profile.age && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Age:</span>
                          <span className="font-medium">{patient.profile.age} years</span>
                        </div>
                      )}
                      {patient.profile.gender && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Gender:</span>
                          <span className="font-medium capitalize">{patient.profile.gender}</span>
                        </div>
                      )}
                      {patient.profile.bloodType && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Blood Type:</span>
                          <Badge variant="outline">{patient.profile.bloodType}</Badge>
                        </div>
                      )}
                      {patient.profile.height && patient.profile.weight && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">BMI:</span>
                          <span className="font-medium">
                            {((patient.profile.weight / Math.pow(patient.profile.height / 100, 2)).toFixed(1))}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {patient.lastLogin && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Last active: {formatDistanceToNow(new Date(patient.lastLogin), { addSuffix: true })}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="default"
                      className="flex-1"
                      onClick={() => handleStartChat(patient._id)}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Chat
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => router.push(`/dashboard/appointments?patientId=${patient._id}`)}
                      title="View Appointments"
                    >
                      <Calendar className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => router.push(`/dashboard/patients/${patient._id}/metrics`)}
                      title="View Health Metrics"
                    >
                      <Activity className="h-4 w-4" />
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
              {filteredAndSortedPatients.map((patient) => {
                const name = getName(patient)
                const initials = getInitials(patient)
                const status = getPatientStatus(patient)
                const stats = patientStats[patient._id] || {}

                return (
                  <div key={patient._id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarImage 
                            src={patient.profilePicture 
                              ? (patient.profilePicture.startsWith('http') 
                                  ? patient.profilePicture 
                                  : `${getBackendBaseUrl()}${patient.profilePicture}`)
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
                            {status === 'active' ? 'Active' : status === 'recent' ? 'Recent' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{patient.email}</p>
                        {patient.profile && (
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            {patient.profile.age && <span>Age: {patient.profile.age}</span>}
                            {patient.profile.bloodType && <span>Blood: {patient.profile.bloodType}</span>}
                            {stats.appointmentCount > 0 && <span>{stats.appointmentCount} appointments</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStartChat(patient._id)}
                        >
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Chat
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/dashboard/appointments?patientId=${patient._id}`)}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          Appointments
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/dashboard/patients/${patient._id}/metrics`)}
                        >
                          <Activity className="mr-2 h-4 w-4" />
                          Metrics
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
