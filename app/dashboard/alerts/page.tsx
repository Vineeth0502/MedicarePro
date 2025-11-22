"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, AlertTriangle, Info, CheckCircle2, Search, Filter, MoreHorizontal, Calendar, Activity, Bell, X, MessageCircle, Clock, Check, ChevronLeft, ChevronRight } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { alertsAPI, messagesAPI, appointmentsAPI } from "@/lib/api"
import { formatDistanceToNow, format } from "date-fns"
import { toast } from "sonner"

type NotificationType = 'all' | 'alerts' | 'messages' | 'appointments'
type AlertSeverity = "critical" | "high" | "medium" | "low" | "warning" | "info" | "success"
type AlertStatus = "active" | "acknowledged" | "resolved" | "dismissed"

interface Alert {
  _id: string
  title: string
  message: string
  severity: AlertSeverity
  alertType: string
  triggeredAt: string | Date
  status: AlertStatus
  isRead: boolean
  relatedAppointmentId?: string
}

interface Notification {
  id: string
  type: 'alert' | 'message' | 'appointment'
  title: string
  message: string
  severity?: AlertSeverity
  status?: AlertStatus
  timestamp: Date | string
  isRead: boolean
  data?: any
  count?: number
}

export default function AlertsPage() {
  const router = useRouter()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<NotificationType>("all")
  const [filterSeverity, setFilterSeverity] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'severity'>('newest')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [mounted, setMounted] = useState(false)
  const itemsPerPage = 10

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      loadAllData(true)
    }
  }, [activeTab, mounted])

  useEffect(() => {
    const interval = setInterval(() => {
      loadAllData(false) // Silent polling
    }, 60000) // Poll every 60 seconds (1 minute) to reduce server load
    return () => clearInterval(interval)
  }, [activeTab])

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery, selectedFilters])

  const loadAllData = async (showLoading: boolean = false) => {
    try {
      if (showLoading) {
        setLoading(true)
      }
      
      const allNotifications: Notification[] = []

      // Load health alerts
      if (activeTab === 'all' || activeTab === 'alerts') {
        try {
          const alertsRes = await alertsAPI.getAlerts({ status: 'active' }) // No limit - get all alerts
          const alertsData = alertsRes.data.data?.alerts || alertsRes.data.data || []
          if (Array.isArray(alertsData)) {
            alertsData
              .filter((alert: any) => alert.alertType !== 'appointment_reminder')
              .forEach((alert: any) => {
                allNotifications.push({
                  id: `alert-${alert._id}`,
                  type: 'alert',
                  title: alert.title || 'Health Alert',
                  message: alert.message || '',
                  severity: alert.severity || 'medium',
                  status: alert.status || 'active',
                  timestamp: alert.triggeredAt || alert.createdAt,
                  isRead: alert.isRead || false,
                  data: alert
                })
              })
          }
          setAlerts(Array.isArray(alertsData) ? alertsData : [])
        } catch (error) {
          console.error('Error loading alerts:', error)
        }
      }

      // Load unread messages
      if (activeTab === 'all' || activeTab === 'messages') {
        try {
          const messagesRes = await messagesAPI.getUnreadCount()
          if (messagesRes.data?.success && messagesRes.data.data?.unreadCount > 0) {
            allNotifications.push({
              id: 'unread-messages',
              type: 'message',
              title: 'New Messages',
              message: `You have ${messagesRes.data.data.unreadCount} unread message${messagesRes.data.data.unreadCount > 1 ? 's' : ''}`,
              severity: 'medium',
              timestamp: new Date(),
              isRead: false,
              count: messagesRes.data.data.unreadCount
            })
          }
        } catch (error) {
          console.error('Error loading messages:', error)
        }
      }

      // Load appointment-related notifications
      if (activeTab === 'all' || activeTab === 'appointments') {
        try {
          const alertsRes = await alertsAPI.getAlerts({ status: 'active' }) // No limit - get all alerts
          const alerts = alertsRes.data.data?.alerts || alertsRes.data.data || []
          const appointmentAlerts = Array.isArray(alerts) 
            ? alerts.filter((alert: any) => alert.alertType === 'appointment_reminder')
            : []
          
          appointmentAlerts.forEach((alert: any) => {
            allNotifications.push({
              id: `appointment-alert-${alert._id}`,
              type: 'appointment',
              title: alert.title || 'Appointment Reminder',
              message: alert.message || '',
              severity: alert.severity || 'medium',
              timestamp: alert.triggeredAt || alert.createdAt,
              isRead: alert.isRead || false,
              data: alert
            })
          })

          const now = new Date()
          const appointmentsRes = await appointmentsAPI.getAppointments({ limit: 50 })
          const appointments = appointmentsRes.data.data?.appointments || appointmentsRes.data.data || []
          if (Array.isArray(appointments)) {
            appointments
              .filter((apt: any) => {
                const aptDate = new Date(apt.scheduledDate)
                const isUpcoming = aptDate >= now
                const isRelevantStatus = apt.status === 'scheduled' || apt.status === 'confirmed'
                return isUpcoming && isRelevantStatus
              })
              .slice(0, 10)
              .forEach((apt: any) => {
                const aptDate = new Date(apt.scheduledDate)
                const hoursUntil = Math.floor((aptDate.getTime() - now.getTime()) / (1000 * 60 * 60))
                
                if (hoursUntil <= 24) {
                  const alreadyExists = allNotifications.some(n => 
                    n.type === 'appointment' && 
                    (n.data?.relatedAppointmentId === apt._id || n.data?._id === apt._id)
                  )
                  
                  if (!alreadyExists) {
                    allNotifications.push({
                      id: `appointment-${apt._id}`,
                      type: 'appointment',
                      title: apt.title || 'Upcoming Appointment',
                      message: `Scheduled for ${format(aptDate, 'PPp')}`,
                      severity: hoursUntil <= 2 ? 'high' : hoursUntil <= 6 ? 'medium' : 'low',
                      timestamp: apt.scheduledDate,
                      isRead: false,
                      data: apt
                    })
                  }
                }
              })
          }
        } catch (error) {
          console.error('Error loading appointments:', error)
        }
      }

      // Sort by timestamp (newest first)
      allNotifications.sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime()
        const dateB = new Date(b.timestamp).getTime()
        return dateB - dateA
      })

      setNotifications(allNotifications)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error loading data:', error)
      if (showLoading) {
        toast.error('Error', { description: 'Failed to load notifications.' })
      }
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }

  const handleMarkAsRead = async (notification: Notification | string) => {
    try {
      const alertId = typeof notification === 'string' ? notification : (notification.type === 'alert' && notification.data?._id ? notification.data._id : null)
      if (alertId) {
        await alertsAPI.markAsRead(alertId)
        await loadAllData()
        window.dispatchEvent(new CustomEvent('notificationsUpdated'))
        if (typeof notification !== 'string') {
          toast.success('Notification Marked Read', { description: 'Notification has been marked as read.' })
        }
      } else if (typeof notification !== 'string' && notification.type === 'message') {
        router.push('/dashboard/messages')
        return
      } else if (typeof notification !== 'string' && notification.type === 'appointment') {
        router.push('/dashboard/appointments')
        return
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
      toast.error('Error', { description: 'Failed to mark notification as read.' })
      await loadAllData()
      window.dispatchEvent(new CustomEvent('notificationsUpdated'))
    }
  }

  const handleMarkAllRead = async () => {
    try {
      const unreadAlerts = notifications.filter(n => !n.isRead && n.type === 'alert')
      if (unreadAlerts.length === 0) {
        toast.info('No unread notifications', { description: 'All notifications are already read.' })
        return
      }
      
      await Promise.all(unreadAlerts.map(n => alertsAPI.markAsRead(n.data?._id)))
      await loadAllData()
      window.dispatchEvent(new CustomEvent('notificationsUpdated'))
      toast.success('All Notifications Marked Read', { description: 'All notifications have been marked as read.' })
    } catch (error) {
      console.error('Error marking all as read:', error)
      toast.error('Error', { description: 'Failed to mark all notifications as read.' })
      await loadAllData()
      window.dispatchEvent(new CustomEvent('notificationsUpdated'))
    }
  }

  const handleAcknowledge = async (notification: Notification) => {
    try {
      if (notification.type === 'alert' && notification.data?._id) {
        await alertsAPI.acknowledgeAlert(notification.data._id)
        toast.success('Alert Acknowledged', { description: 'Alert has been acknowledged.' })
        loadAllData()
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error)
      toast.error('Error', { description: 'Failed to acknowledge alert.' })
    }
  }

  const handleDismiss = async (notification: Notification) => {
    try {
      if (notification.type === 'alert' && notification.data?._id) {
        await alertsAPI.dismissAlert(notification.data._id)
        toast.success('Alert Dismissed', { description: 'Alert has been dismissed.' })
        loadAllData()
      }
    } catch (error) {
      console.error('Error dismissing alert:', error)
      toast.error('Error', { description: 'Failed to dismiss alert.' })
    }
  }

  const getSeverityIcon = (severity?: AlertSeverity, type?: string) => {
    if (type === 'appointment') {
      return <Calendar className="h-5 w-5 text-blue-600" />
    }
    if (type === 'message') {
      return <MessageCircle className="h-5 w-5 text-blue-600" />
    }
    switch (severity) {
      case "critical":
      case "high":
        return <AlertCircle className="h-5 w-5 text-red-600" />
      case "warning":
      case "medium":
        return <AlertTriangle className="h-5 w-5 text-orange-500" />
      case "info":
      case "low":
        return <Info className="h-5 w-5 text-blue-600" />
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      default:
        return <Info className="h-5 w-5 text-blue-600" />
    }
  }

  const getSeverityColor = (severity?: AlertSeverity, type?: string) => {
    if (type === 'appointment') {
      return "border-blue-600/50 bg-blue-600/5"
    }
    if (type === 'message') {
      return "border-blue-600/50 bg-blue-600/5"
    }
    switch (severity) {
      case "critical":
      case "high":
        return "border-red-600/50 bg-red-600/5"
      case "warning":
      case "medium":
        return "border-orange-500/50 bg-orange-500/5"
      case "info":
      case "low":
        return "border-blue-600/50 bg-blue-600/5"
      case "success":
        return "border-green-600/50 bg-green-600/5"
      default:
        return "border-blue-600/50 bg-blue-600/5"
    }
  }

  const getTypeLabel = (type: string, alertType?: string) => {
    if (type === 'appointment') return 'Appointment'
    if (type === 'message') return 'Message'
    if (alertType === 'appointment_reminder') return 'Appointment Reminder'
    if (alertType === 'medication_reminder') return 'Medication Reminder'
    if (alertType) {
      return alertType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    }
    return 'Alert'
  }

  const filterOptions = [
    { id: 'critical_updates', label: 'Critical Updates', severity: ['critical', 'high'] },
    { id: 'medication_reminders', label: 'Medication Reminders', alertType: 'medication_reminder' },
    { id: 'appointment_reminders', label: 'Appointment Reminders', alertType: 'appointment_reminder' },
    { id: 'health_flags', label: 'Health Flags', alertType: ['elevated_heart_rate', 'high_blood_pressure', 'low_blood_pressure'] },
    { id: 'messages', label: 'Messages', type: 'message' },
    { id: 'appointments', label: 'Appointments', type: 'appointment' },
  ]

  const handleFilterChange = (filterId: string) => {
    setSelectedFilters(prev =>
      prev.includes(filterId)
        ? prev.filter(id => id !== filterId)
        : [...prev, filterId]
    )
  }

  const filteredNotifications = notifications.filter((notification) => {
    const matchesSearch =
      searchQuery === "" ||
      notification.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.message?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesTab = activeTab === 'all' || notification.type === activeTab.slice(0, -1) as 'alert' | 'message' | 'appointment'

    const matchesSeverity = filterSeverity ? notification.severity === filterSeverity : true
    const matchesStatus = filterStatus ? notification.status === filterStatus : true

    const matchesCustomFilters =
      selectedFilters.length === 0 ||
      selectedFilters.some((filterId) => {
        const filter = filterOptions.find(f => f.id === filterId)
        if (!filter) return true

        if (filter.type && notification.type === filter.type) return true
        if (filter.severity && notification.severity && filter.severity.includes(notification.severity)) return true
        if (filter.alertType && notification.data?.alertType) {
          const alertTypes = Array.isArray(filter.alertType) ? filter.alertType : [filter.alertType]
          return alertTypes.includes(notification.data.alertType)
        }
        return false
      })

    return matchesSearch && matchesTab && matchesSeverity && matchesStatus && matchesCustomFilters
  })

  const sortedNotifications = filteredNotifications.sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    } else if (sortBy === 'oldest') {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    } else if (sortBy === 'severity') {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1, warning: 2, info: 1, success: 0 }
      return (severityOrder[b.severity as keyof typeof severityOrder] || 0) - 
             (severityOrder[a.severity as keyof typeof severityOrder] || 0)
    }
    return 0
  })

  const totalPages = Math.ceil(sortedNotifications.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedNotifications = sortedNotifications.slice(startIndex, endIndex)

  const getNotificationStats = () => {
    const total = notifications.length
    const unread = notifications.filter(n => !n.isRead).length
    const alertsCount = notifications.filter(n => n.type === 'alert').length
    const messages = notifications.filter(n => n.type === 'message').length
    const appointments = notifications.filter(n => n.type === 'appointment').length
    const critical = notifications.filter(n => n.severity === 'critical' || n.severity === 'high').length
    const active = notifications.filter(n => n.status === 'active').length

    return { total, unread, alerts: alertsCount, messages, appointments, critical, active }
  }

  const stats = getNotificationStats()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alerts & Notifications</h1>
          <p className="text-muted-foreground">
            Manage system alerts, patient warnings, and operational notifications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
          <Button variant="outline" onClick={handleMarkAllRead}>
            <Check className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
          {(filterSeverity || filterStatus) && (
            <Button 
              variant="outline" 
              onClick={() => {
                setFilterSeverity(null)
                setFilterStatus(null)
              }}
            >
              <X className="mr-2 h-4 w-4" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All alerts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.unread}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
            <p className="text-xs text-muted-foreground">High priority</p>
          </CardContent>
        </Card>
      </div>

      {/* Content Area */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Main Content */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Notifications</CardTitle>
                  <CardDescription>View and manage your notifications</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-full md:w-[300px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search notifications..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <Filter className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Filter by Severity</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setFilterSeverity(null)}>All Severities</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterSeverity("critical")}>Critical</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterSeverity("high")}>High</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterSeverity("warning")}>Warning</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterSeverity("medium")}>Medium</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterSeverity("info")}>Info</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterSeverity("low")}>Low</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setFilterStatus(null)}>All Statuses</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterStatus("active")}>Active</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterStatus("acknowledged")}>Acknowledged</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterStatus("resolved")}>Resolved</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterStatus("dismissed")}>Dismissed</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setSortBy("newest")}>Newest First</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy("oldest")}>Oldest First</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy("severity")}>By Severity</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!mounted ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground text-sm">Loading...</p>
                </div>
              ) : (
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as NotificationType)}>
                  <TabsList className="grid w-full grid-cols-4 mb-4">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="alerts">Alerts</TabsTrigger>
                    <TabsTrigger value="messages">Messages</TabsTrigger>
                    <TabsTrigger value="appointments">Appointments</TabsTrigger>
                  </TabsList>

                  <TabsContent value={activeTab}>
                    {loading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                          <p className="text-muted-foreground">Loading notifications...</p>
                        </div>
                      </div>
                    ) : paginatedNotifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                        <Bell className="h-12 w-12 mb-4 opacity-20" />
                        <p>No notifications found matching your criteria.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {paginatedNotifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={cn(
                              "flex items-start gap-4 rounded-lg border p-4 transition-colors",
                              getSeverityColor(notification.severity, notification.type),
                              !notification.isRead && "border-blue-600 border-2"
                            )}
                          >
                            <div className="mt-0.5">
                              {getSeverityIcon(notification.severity, notification.type)}
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium leading-none">{notification.title}</p>
                                  {notification.count && (
                                    <Badge variant="default">{notification.count}</Badge>
                                  )}
                                  {!notification.isRead && (
                                    <Badge variant="default" className="bg-blue-600">New</Badge>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">{notification.message}</p>
                              <div className="flex items-center gap-2 mt-2">
                                {notification.data?.alertType && (
                                  <Badge variant="outline" className="text-xs font-normal">
                                    {getTypeLabel(notification.type, notification.data.alertType)}
                                  </Badge>
                                )}
                                {notification.severity && (
                                  <Badge
                                    variant={notification.severity === 'critical' || notification.severity === 'high' ? "destructive" : "secondary"}
                                    className="text-xs font-normal capitalize"
                                  >
                                    {notification.severity}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Filter className="h-4 w-4" />
                                  <span className="sr-only">More options</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {!notification.isRead && (
                                  <DropdownMenuItem onClick={() => handleMarkAsRead(notification)}>
                                    Mark as Read
                                  </DropdownMenuItem>
                                )}
                                {notification.type === 'alert' && notification.status === 'active' && (
                                  <DropdownMenuItem onClick={() => handleAcknowledge(notification)}>
                                    Acknowledge
                                  </DropdownMenuItem>
                                )}
                                {notification.type === 'message' && (
                                  <DropdownMenuItem onClick={() => router.push('/dashboard/messages')}>
                                    View Messages
                                  </DropdownMenuItem>
                                )}
                                {notification.type === 'appointment' && (
                                  <DropdownMenuItem onClick={() => router.push('/dashboard/appointments')}>
                                    View Appointment
                                  </DropdownMenuItem>
                                )}
                                {notification.type === 'alert' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => handleDismiss(notification)}
                                    >
                                      Dismiss
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ))}
                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                          <div className="flex items-center justify-between pt-4 mt-4 border-t">
                            <div className="text-sm text-muted-foreground">
                              Showing {startIndex + 1} to {Math.min(endIndex, sortedNotifications.length)} of {sortedNotifications.length} notifications
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                              >
                                <ChevronLeft className="h-4 w-4" />
                                Previous
                              </Button>
                              <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                  let pageNum;
                                  if (totalPages <= 5) {
                                    pageNum = i + 1;
                                  } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                  } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                  } else {
                                    pageNum = currentPage - 2 + i;
                                  }
                                  return (
                                    <Button
                                      key={pageNum}
                                      variant={currentPage === pageNum ? "default" : "outline"}
                                      size="sm"
                                      className="w-8 h-8 p-0"
                                      onClick={() => setCurrentPage(pageNum)}
                                    >
                                      {pageNum}
                                    </Button>
                                  );
                                })}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                              >
                                Next
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filter Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-6">
                {filterOptions.map((option) => (
                  <label key={option.id} className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFilters.includes(option.id)}
                      onChange={() => handleFilterChange(option.id)}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded cursor-pointer"
                    />
                    <span className="ml-2 text-sm text-foreground">{option.label}</span>
                  </label>
                ))}
              </div>

              <div className="pt-4 border-t space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setSelectedFilters(filterOptions.map(o => o.id))}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setSelectedFilters([])}
                >
                  Clear Filters
                </Button>
              </div>

              {/* Summary */}
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-medium">{stats.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Unread:</span>
                    <span className="font-medium">{stats.unread}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Alerts:</span>
                    <span className="font-medium">{stats.alerts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Messages:</span>
                    <span className="font-medium">{stats.messages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Appointments:</span>
                    <span className="font-medium">{stats.appointments}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
