"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn, getBackendBaseUrl } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  Activity,
  Calendar,
  MessageSquare,
  Settings,
  FileText,
  Bell,
  LogOut,
  Stethoscope,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { authAPI } from "@/lib/api"

function UserProfileSection() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user')
      if (userData) {
        setUser(JSON.parse(userData))
      }
    }
  }, [])

  const handleLogout = async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
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

  const getUserRole = () => {
    if (!user) return ''
    const role = user.role || ''
    return role.charAt(0).toUpperCase() + role.slice(1)
  }

  return (
    <div className="border-t p-4">
      <div className="flex items-center gap-3 rounded-md bg-muted/50 p-3">
        <Avatar className="h-8 w-8">
          <AvatarImage 
            src={user?.profilePicture 
              ? (user.profilePicture.startsWith('http') 
                  ? user.profilePicture 
                  : `${getBackendBaseUrl()}${user.profilePicture}`)
              : undefined
            } 
            alt={getUserName()} 
          />
          <AvatarFallback className="text-xs font-bold">{getUserInitials()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 overflow-hidden">
          <p className="truncate text-sm font-medium">{getUserName()}</p>
          <p className="truncate text-xs text-muted-foreground">{getUserRole()}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          <span className="sr-only">Log out</span>
        </Button>
      </div>
    </div>
  )
}

const getSidebarItems = (userRole?: string) => {
  const baseItems = [
    {
      title: "Overview",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Appointments",
      href: "/dashboard/appointments",
      icon: Calendar,
    },
    {
      title: "Vitals & Metrics",
      href: "/dashboard/metrics",
      icon: Activity,
    },
    {
      title: "Messages",
      href: "/dashboard/messages",
      icon: MessageSquare,
    },
  ]

  // Add role-specific items
  if (userRole === 'provider' || userRole === 'doctor' || userRole === 'admin') {
    baseItems.splice(1, 0, {
      title: "Patients",
      href: "/dashboard/patients",
      icon: Users,
    })
  } else {
    baseItems.splice(1, 0, {
      title: "Doctors",
      href: "/dashboard/doctors",
      icon: Users,
    })
  }

  return baseItems
}

const bottomItems = [
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user')
      if (userData) {
        setUser(JSON.parse(userData))
      }
    }
  }, [])

  const sidebarItems = getSidebarItems(user?.role)

  return (
    <div className="hidden border-r bg-card md:flex md:w-64 md:flex-col">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Stethoscope className="h-6 w-6 text-primary" />
          <span className="text-lg">HealthMonitor</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="grid gap-1 px-2">
          <div className="px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">Platform</div>
          {sidebarItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                pathname === item.href ? "bg-accent text-accent-foreground" : "text-muted-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          ))}
        </nav>

        <nav className="mt-8 grid gap-1 px-2">
          <div className="px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">System</div>
          {bottomItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                pathname === item.href ? "bg-accent text-accent-foreground" : "text-muted-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          ))}
        </nav>
      </div>

      <UserProfileSection />
    </div>
  )
}
