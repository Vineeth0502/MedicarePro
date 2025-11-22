"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Bell, Search, Menu, LogOut, User, Settings, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { authAPI, alertsAPI } from "@/lib/api"
import { NotificationCenter } from "./notification-center"

export function Header() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [lastNotificationCheck, setLastNotificationCheck] = useState<Date | null>(null)
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false)

  const playNotificationSound = () => {
    try {
      // Try Web Audio API first
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      if (AudioContext) {
        const audioContext = new AudioContext()
        
        // Resume audio context if suspended (required for autoplay policies)
        if (audioContext.state === 'suspended') {
          audioContext.resume().catch(() => {
            // If resume fails, try fallback
            playFallbackSound()
            return
          })
        }
        
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        // Set a pleasant notification tone (two-tone chime)
        oscillator.frequency.value = 800
        oscillator.type = 'sine'
        
        gainNode.gain.setValueAtTime(0.6, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
        
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.3)
        
        // Play second tone for chime effect
        setTimeout(() => {
          try {
            const oscillator2 = audioContext.createOscillator()
            const gainNode2 = audioContext.createGain()
            
            oscillator2.connect(gainNode2)
            gainNode2.connect(audioContext.destination)
            
            oscillator2.frequency.value = 1000
            oscillator2.type = 'sine'
            
            gainNode2.gain.setValueAtTime(0.6, audioContext.currentTime)
            gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
            
            oscillator2.start(audioContext.currentTime)
            oscillator2.stop(audioContext.currentTime + 0.3)
          } catch (e) {
            // Ignore second tone errors
          }
        }, 150)
      } else {
        playFallbackSound()
      }
    } catch (error) {
      playFallbackSound()
    }
  }

  const playFallbackSound = () => {
    try {
      // Create a simple beep sound using data URI
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjGH0fPTgjMGHm7A7+OZSw=')
      audio.volume = 0.5
      audio.play().catch(() => {
        // If audio play fails, try a simpler approach
        console.log('Notification sound could not be played - user interaction may be required')
      })
    } catch (fallbackError) {
      console.log('Notification sound not available')
    }
  }

  const fetchUnreadCount = useCallback(async () => {
    // Only fetch if we have a token
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      // Fetch with a timestamp to prevent caching
      const res = await alertsAPI.getAlerts({ 
        status: 'active', 
        limit: 100
      })
      const alerts = res.data.data?.alerts || res.data.data || []
      const unread = Array.isArray(alerts) ? alerts.filter((a: any) => !a.isRead).length : 0
      
      // Force update the count - always set it, even if 0
      setUnreadCount(unread)
      
      // Store the latest notification time
      if (alerts.length > 0) {
        const latestAlert = alerts.sort((a: any, b: any) => 
          new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()
        )[0]
        setLastNotificationCheck(new Date(latestAlert.triggeredAt))
      } else {
        // If no alerts, reset the count to 0
        setUnreadCount(0)
      }
      
      // Debug log in development
      if (process.env.NODE_ENV === 'development' && unread > 0) {
        console.log(`[Header] Unread count updated: ${unread}`)
      }
    } catch (error: any) {
      // Silently handle network errors - don't log or show them
      const isNetworkError = 
        error.code === 'ERR_NETWORK' || 
        error.code === 'ECONNREFUSED' ||
        error.message?.includes('Network Error') ||
        error.message?.includes('Failed to fetch')
      
      // Only log non-network errors
      if (!isNetworkError && process.env.NODE_ENV === 'development') {
        console.error('Error fetching unread count:', error)
      }
      // Silently fail for network errors
    }
  }, [])

  const checkForNewNotifications = useCallback(async () => {
    // Only check if we have a token
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const res = await alertsAPI.getAlerts({ status: 'active', limit: 100 })
      const alerts = res.data.data?.alerts || res.data.data || []
      const unread = Array.isArray(alerts) ? alerts.filter((a: any) => !a.isRead).length : 0
      
      // Always update the count
      setUnreadCount(unread)
      
      // Check if there are new notifications since last check
      if (lastNotificationCheck) {
        const newNotifications = alerts.filter((a: any) => {
          const alertTime = new Date(a.triggeredAt).getTime()
          const lastCheckTime = lastNotificationCheck.getTime()
          return !a.isRead && alertTime > lastCheckTime
        })
        
        if (newNotifications.length > 0) {
          // Play notification sound for each new notification
          playNotificationSound()
          
          // Update last check time to the most recent alert
          const latestAlert = alerts.sort((a: any, b: any) => 
            new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()
          )[0]
          setLastNotificationCheck(new Date(latestAlert.triggeredAt))
        }
      } else if (alerts.length > 0) {
        // First time - set the latest alert time
        const latestAlert = alerts.sort((a: any, b: any) => 
          new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()
        )[0]
        setLastNotificationCheck(new Date(latestAlert.triggeredAt))
      }
    } catch (error: any) {
      // Silently handle network errors - don't log or show them
      const isNetworkError = 
        error.code === 'ERR_NETWORK' || 
        error.code === 'ECONNREFUSED' ||
        error.message?.includes('Network Error') ||
        error.message?.includes('Failed to fetch')
      
      // Only log non-network errors
      if (!isNetworkError && process.env.NODE_ENV === 'development') {
        console.error('Error checking for new notifications:', error)
      }
      // Silently fail for network errors
    }
  }, [lastNotificationCheck])

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user')
      if (userData) {
        setUser(JSON.parse(userData))
      }
      
      // Fetch unread alerts count
      fetchUnreadCount()
      
      // Listen for notification updates from other components
      const handleNotificationsUpdated = async () => {
        // Add a delay to ensure backend has processed the update
        await new Promise(resolve => setTimeout(resolve, 800))
        // Force refresh the unread count immediately - call it multiple times to ensure it updates
        await fetchUnreadCount()
        // Small delay then call again to ensure it's updated
        setTimeout(async () => {
          await fetchUnreadCount()
        }, 300)
        setTimeout(async () => {
          await fetchUnreadCount()
        }, 600)
        // Also check for new notifications
        await checkForNewNotifications()
      }
      window.addEventListener('notificationsUpdated', handleNotificationsUpdated)
      
      // Set up polling for new notifications every 30 seconds (reduced frequency)
      // Only start polling if we have a token
      const token = localStorage.getItem('token')
      if (token) {
        // Poll immediately, then every 30 seconds
        checkForNewNotifications()
        const pollInterval = setInterval(() => {
          checkForNewNotifications()
        }, 30000) // Poll every 30 seconds to reduce server load

        return () => {
          clearInterval(pollInterval)
          window.removeEventListener('notificationsUpdated', handleNotificationsUpdated)
        }
      } else {
        return () => {
          window.removeEventListener('notificationsUpdated', handleNotificationsUpdated)
        }
      }
    }
  }, [checkForNewNotifications, fetchUnreadCount])

  const handleLogout = async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear local storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
      // Redirect to login
      router.push('/login')
    }
  }

  const getUserInitials = () => {
    if (!user) return 'U'
    const firstName = user.firstName || ''
    const lastName = user.lastName || ''
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase()
    }
    if (user.username) {
      return user.username.substring(0, 2).toUpperCase()
    }
    return 'U'
  }

  const getUserName = () => {
    if (!user) return 'User'
    if (user.firstName && user.lastName) {
      const name = `${user.firstName} ${user.lastName}`
      // Add Dr. prefix for doctors/providers
      if (user.role === 'doctor' || user.role === 'provider') {
        return `Dr. ${name}`
      }
      return name
    }
    return user.username || user.email || 'User'
  }

  if (!mounted) {
    return (
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6 shadow-sm">
        <Button variant="outline" size="icon" className="md:hidden bg-transparent" disabled>
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
        <div className="w-full flex-1">
          <form>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search patients, records, or appointments..."
                className="w-full bg-background pl-8 md:w-[300px] lg:w-[400px]"
                disabled
              />
            </div>
          </form>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative" disabled>
            <Bell className="h-5 w-5" />
            <span className="sr-only">Notifications</span>
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full" disabled>
            <Avatar className="h-8 w-8">
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          </Button>
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6 shadow-sm">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="md:hidden bg-transparent">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72">
          <div className="h-full py-4">
            <div className="px-6 py-4 font-bold text-lg">HealthMonitor</div>
          </div>
        </SheetContent>
      </Sheet>

      <div className="w-full flex-1">
        <form>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search patients, records, or appointments..."
              className="w-full bg-background pl-8 md:w-[300px] lg:w-[400px]"
            />
          </div>
        </form>
      </div>

      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          onClick={() => setNotificationCenterOpen(true)}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>

        <NotificationCenter 
          isOpen={notificationCenterOpen} 
          onClose={() => setNotificationCenterOpen(false)}
          user={user}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage 
                  src={user?.profilePicture 
                    ? (user.profilePicture.startsWith('http') 
                        ? user.profilePicture 
                        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}${user.profilePicture}`)
                    : undefined
                  } 
                  alt={getUserName()} 
                />
                <AvatarFallback>{getUserInitials()}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{getUserName()}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email || user?.username || ''}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/dashboard/support')}>
              <HelpCircle className="mr-2 h-4 w-4" />
              Support
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
