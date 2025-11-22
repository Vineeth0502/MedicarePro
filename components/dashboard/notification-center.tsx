"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Bell, AlertCircle, AlertTriangle, Info, CheckCircle2, Calendar, MessageCircle, Activity, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { alertsAPI, messagesAPI, appointmentsAPI } from "@/lib/api"
import { formatDistanceToNow } from "date-fns"

interface Notification {
  id: string
  type: 'health_alert' | 'message' | 'appointment' | 'system'
  title: string
  message: string
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'warning' | 'info' | 'success'
  timestamp: Date | string
  isRead: boolean
  data?: any
  count?: number
}

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
  user: any
}

export function NotificationCenter({ isOpen, onClose, user }: NotificationCenterProps) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'alerts' | 'messages' | 'appointments'>('all')

  useEffect(() => {
    if (isOpen) {
      loadNotifications()
      const interval = setInterval(() => {
        loadNotifications()
      }, 10000) // Poll every 10 seconds
      return () => clearInterval(interval)
    } else {
      // Reset loading state when closed
      setIsLoading(false)
    }
  }, [isOpen, activeTab])

  const loadNotifications = async () => {
    if (!isOpen) return // Don't load if panel is closed
    
    try {
      setIsLoading(true)
      const allNotifications: Notification[] = []

      // Load health alerts (exclude appointment reminders and message alerts - those go in their respective tabs)
      if (activeTab === 'all' || activeTab === 'alerts') {
        try {
          const alertsRes = await alertsAPI.getAlerts({ limit: 20, status: 'active' })
          const alerts = alertsRes.data.data?.alerts || alertsRes.data.data || []
          if (Array.isArray(alerts)) {
            alerts
              .filter((alert: any) => 
                alert.alertType !== 'appointment_reminder' && // Exclude appointment reminders
                !(alert.metadata?.isMessage === true) && // Exclude message alerts
                !(alert.alertType === 'medication_reminder' && alert.metadata?.messageId) // Exclude message alerts
              )
              .forEach((alert: any) => {
                allNotifications.push({
                  id: `alert-${alert._id}`,
                  type: 'health_alert',
                  title: alert.title,
                  message: alert.message,
                  severity: alert.severity || 'medium',
                  timestamp: alert.triggeredAt || alert.createdAt,
                  isRead: alert.isRead || false,
                  data: alert
                })
              })
          }
        } catch (error: any) {
          // Silently handle network errors
          const isNetworkError = 
            error.code === 'ERR_NETWORK' || 
            error.code === 'ECONNREFUSED' ||
            error.message?.includes('Network Error')
          if (!isNetworkError) {
            console.error('Error loading alerts:', error)
          }
        }
      }

      // Load message alerts (created when messages are sent)
      if (activeTab === 'all' || activeTab === 'messages') {
        try {
          // Load message alerts from alerts API
          const alertsRes = await alertsAPI.getAlerts({ limit: 20, status: 'active' })
          const alerts = alertsRes.data.data?.alerts || alertsRes.data.data || []
          if (Array.isArray(alerts)) {
            // Filter for message alerts (those with metadata.isMessage or alertType related to messages)
            alerts
              .filter((alert: any) => 
                alert.metadata?.isMessage === true || 
                alert.alertType === 'medication_reminder' && alert.metadata?.messageId
              )
              .forEach((alert: any) => {
                allNotifications.push({
                  id: `message-alert-${alert._id}`,
                  type: 'message',
                  title: alert.title || 'New Message',
                  message: alert.message || '',
                  severity: 'info', // Messages should be 'info', not 'medium' or 'warning'
                  timestamp: alert.triggeredAt || alert.createdAt,
                  isRead: alert.isRead || false,
                  data: alert
                })
              })
          }
          
          // Also check for unread message count as a fallback
          // Only show this if we don't have specific message alerts
          const hasMessageAlerts = allNotifications.some(n => n.type === 'message' && !n.isRead)
          if (!hasMessageAlerts) {
            try {
              const messagesRes = await messagesAPI.getUnreadCount()
              if (messagesRes.data?.success && messagesRes.data.data?.unreadCount > 0) {
                allNotifications.push({
                  id: 'unread-messages',
                  type: 'message',
                  title: 'New Messages',
                  message: `You have ${messagesRes.data.data.unreadCount} unread message${messagesRes.data.data.unreadCount > 1 ? 's' : ''}`,
                  severity: 'info',
                  timestamp: new Date(),
                  isRead: false,
                  count: messagesRes.data.data.unreadCount
                })
              }
            } catch (error: any) {
              // Silently handle - already handled above
            }
          }
        } catch (error: any) {
          // Silently handle network errors
          const isNetworkError = 
            error.code === 'ERR_NETWORK' || 
            error.code === 'ECONNREFUSED' ||
            error.message?.includes('Network Error')
          if (!isNetworkError) {
            console.error('Error loading messages:', error)
          }
        }
      }

      // Load appointment-related notifications (both from appointments and appointment_reminder alerts)
      if (activeTab === 'all' || activeTab === 'appointments') {
        try {
          // First, load appointment reminder alerts (these are created when appointments are made)
          const alertsRes = await alertsAPI.getAlerts({ limit: 20, status: 'active' })
          const alerts = alertsRes.data.data?.alerts || alertsRes.data.data || []
          const appointmentAlerts = Array.isArray(alerts) 
            ? alerts.filter((alert: any) => alert.alertType === 'appointment_reminder')
            : []
          
          // Convert appointment alerts to appointment notifications
          appointmentAlerts.forEach((alert: any) => {
            allNotifications.push({
              id: `appointment-alert-${alert._id}`,
              type: 'appointment',
              title: alert.title,
              message: alert.message,
              severity: alert.severity || 'medium',
              timestamp: alert.triggeredAt || alert.createdAt,
              isRead: alert.isRead || false,
              data: alert
            })
          })

          // Also load upcoming appointments (within 24 hours)
          const now = new Date()
          const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
          // Fetch appointments without status filter, then filter on frontend
          const appointmentsRes = await appointmentsAPI.getAppointments({
            startDate: now.toISOString(),
            endDate: tomorrow.toISOString(),
          })
          const allAppointments = appointmentsRes.data.data?.appointments || appointmentsRes.data.data || []
          // Filter for scheduled and confirmed appointments only
          const appointments = Array.isArray(allAppointments) 
            ? allAppointments.filter((apt: any) => apt.status === 'scheduled' || apt.status === 'confirmed')
            : []
          if (Array.isArray(appointments)) {
            appointments.slice(0, 5).forEach((apt: any) => {
              // Check if we already have this appointment from alerts
              const alreadyExists = allNotifications.some(n => 
                n.type === 'appointment' && n.data?._id === apt._id
              )
              if (!alreadyExists) {
                const aptDate = new Date(apt.scheduledDate)
                const hoursUntil = Math.round((aptDate.getTime() - now.getTime()) / (1000 * 60 * 60))
                allNotifications.push({
                  id: `appointment-${apt._id}`,
                  type: 'appointment',
                  title: apt.title || 'Upcoming Appointment',
                  message: `Appointment in ${hoursUntil} hour${hoursUntil !== 1 ? 's' : ''}`,
                  severity: hoursUntil <= 2 ? 'high' : 'medium',
                  timestamp: apt.scheduledDate,
                  isRead: false,
                  data: apt
                })
              }
            })
          }
        } catch (error: any) {
          // Silently handle network errors
          const isNetworkError = 
            error.code === 'ERR_NETWORK' || 
            error.code === 'ECONNREFUSED' ||
            error.message?.includes('Network Error')
          if (!isNetworkError) {
            console.error('Error loading appointments:', error)
          }
        }
      }

      // Sort by timestamp (newest first)
      allNotifications.sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime()
        const dateB = new Date(b.timestamp).getTime()
        return dateB - dateA
      })

      setNotifications(allNotifications)
    } catch (error: any) {
      // Silently handle network errors
      const isNetworkError = 
        error.code === 'ERR_NETWORK' || 
        error.code === 'ECONNREFUSED' ||
        error.message?.includes('Network Error')
      if (!isNetworkError) {
        console.error('Error loading notifications:', error)
      }
      // Set empty array on error to show "no notifications" instead of loading forever
      setNotifications([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkAsRead = async (notification: Notification) => {
    try {
      // Mark as read based on notification type
      if (notification.type === 'health_alert' && notification.data?._id) {
        await alertsAPI.markAsRead(notification.data._id)
      } else if (notification.type === 'message' && notification.data?._id) {
        // For message alerts, mark the underlying alert as read
        await alertsAPI.markAsRead(notification.data._id)
      } else if (notification.type === 'appointment' && notification.data?._id) {
        // For appointment alerts, mark the underlying alert as read
        if (notification.id.startsWith('appointment-alert-')) {
          const alertId = notification.id.replace('appointment-alert-', '')
          await alertsAPI.markAsRead(alertId)
        }
      }
      
      // Reload notifications (same pattern as alerts page)
      await loadNotifications()
      
      // Notify header to refresh notification count
      window.dispatchEvent(new CustomEvent('notificationsUpdated'))
    } catch (error: any) {
      // Silently handle network errors
      const isNetworkError = 
        error.code === 'ERR_NETWORK' || 
        error.code === 'ECONNREFUSED' ||
        error.message?.includes('Network Error')
      if (!isNetworkError) {
        console.error('Error marking notification as read:', error)
      }
      // Still reload and dispatch event even if API call fails
      await loadNotifications()
      window.dispatchEvent(new CustomEvent('notificationsUpdated'))
    }
  }

  const handleMarkAllRead = async () => {
    try {
      // Get all unread notifications that can be marked as read
      const unreadNotifications = notifications.filter(n => !n.isRead)
      
      if (unreadNotifications.length === 0) {
        return // Nothing to mark as read
      }
      
      // Mark health alerts, message alerts, and appointment alerts as read
      const alertsToMark = unreadNotifications.filter(n => 
        (n.type === 'health_alert' || n.type === 'message' || n.type === 'appointment') && n.data?._id
      )
      
      await Promise.all(alertsToMark.map(n => {
        if (n.type === 'health_alert' || n.type === 'message') {
          return alertsAPI.markAsRead(n.data._id)
        } else if (n.type === 'appointment' && n.id.startsWith('appointment-alert-')) {
          const alertId = n.id.replace('appointment-alert-', '')
          return alertsAPI.markAsRead(alertId)
        }
        return Promise.resolve()
      }))
      
      // For message notifications without data._id (like the fallback "unread-messages" notification),
      // mark them as read locally by updating the state
      const messagesWithoutData = unreadNotifications.filter(n => 
        n.type === 'message' && !n.data?._id
      )
      
      if (messagesWithoutData.length > 0) {
        // Update local state to mark these as read
        setNotifications(prev => prev.map(n => {
          if (messagesWithoutData.some(m => m.id === n.id)) {
            return { ...n, isRead: true }
          }
          return n
        }))
      }
      
      // Reload notifications (same pattern as alerts page)
      await loadNotifications()
      
      // Notify header to refresh notification count
      window.dispatchEvent(new CustomEvent('notificationsUpdated'))
    } catch (error: any) {
      // Silently handle network errors
      const isNetworkError = 
        error.code === 'ERR_NETWORK' || 
        error.code === 'ECONNREFUSED' ||
        error.message?.includes('Network Error')
      if (!isNetworkError) {
        console.error('Error marking all as read:', error)
      }
      // Still reload and dispatch event even if API call fails
      await loadNotifications()
      window.dispatchEvent(new CustomEvent('notificationsUpdated'))
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification)
    }

    if (notification.type === 'health_alert' && notification.data?._id) {
      router.push('/dashboard/alerts')
      onClose()
    } else if (notification.type === 'message') {
      router.push('/dashboard/messages')
      onClose()
    } else if (notification.type === 'appointment' && notification.data?._id) {
      router.push('/dashboard/appointments')
      onClose()
    }
  }

  const getNotificationIcon = (notification: Notification) => {
    switch (notification.type) {
      case 'health_alert':
        switch (notification.severity) {
          case 'critical':
          case 'high':
            return <AlertCircle className="h-5 w-5 text-red-600" />
          case 'warning':
          case 'medium':
            return <AlertTriangle className="h-5 w-5 text-orange-500" />
          case 'info':
          case 'low':
            return <Info className="h-5 w-5 text-blue-600" />
          case 'success':
            return <CheckCircle2 className="h-5 w-5 text-green-600" />
          default:
            return <AlertCircle className="h-5 w-5 text-blue-600" />
        }
      case 'message':
        return <MessageCircle className="h-5 w-5 text-blue-600" />
      case 'appointment':
        return <Calendar className="h-5 w-5 text-purple-600" />
      default:
        return <Bell className="h-5 w-5 text-gray-600" />
    }
  }

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'border-red-600/50 bg-red-600/5'
      case 'warning':
      case 'medium':
        return 'border-orange-500/50 bg-orange-500/5'
      case 'info':
      case 'low':
        return 'border-blue-600/50 bg-blue-600/5'
      case 'success':
        return 'border-green-600/50 bg-green-600/5'
      default:
        return 'border-gray-600/50 bg-gray-600/5'
    }
  }

  const formatTimestamp = (date: Date | string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true })
    } catch {
      return 'Recently'
    }
  }

  const filteredNotifications = notifications.filter(n => {
    // Only show unread notifications
    if (n.isRead) return false
    
    // Filter by tab
    if (activeTab === 'all') {
      return true
    }
    if (activeTab === 'alerts') return n.type === 'health_alert'
    if (activeTab === 'messages') return n.type === 'message'
    if (activeTab === 'appointments') return n.type === 'appointment'
    return true
  })

  const unreadCount = filteredNotifications.filter(n => !n.isRead).length

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-[400px] p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <SheetTitle>Notifications</SheetTitle>
              <SheetDescription>
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
              </SheetDescription>
            </div>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
                Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full flex flex-col flex-1 min-h-0">
          <TabsList className="w-full rounded-none border-b px-6 flex-shrink-0">
            <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
            <TabsTrigger value="alerts" className="flex-1">Alerts</TabsTrigger>
            <TabsTrigger value="messages" className="flex-1">Messages</TabsTrigger>
            <TabsTrigger value="appointments" className="flex-1">Appointments</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="flex-1 min-h-0 m-0 mt-0">
            <ScrollArea className="h-full">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-sm text-muted-foreground">Loading notifications...</p>
                  </div>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Bell className="h-12 w-12 mb-4 opacity-20" />
                  <p>No notifications found</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-4 cursor-pointer transition-colors hover:bg-muted/50",
                        !notification.isRead && "bg-blue-50/50 border-l-4 border-l-blue-600"
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">{getNotificationIcon(notification)}</div>
                        <div className="flex-1 space-y-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={cn(
                              "text-sm font-medium leading-none",
                              !notification.isRead && "font-semibold"
                            )}>
                              {notification.title}
                            </p>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatTimestamp(notification.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                          {notification.count && (
                            <Badge variant="secondary" className="text-xs">
                              {notification.count} unread
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="border-t px-6 py-4 flex-shrink-0">
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => {
              router.push('/dashboard/alerts')
              onClose()
            }}
          >
            View All Alerts
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

