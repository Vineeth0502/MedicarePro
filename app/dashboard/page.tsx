"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Users, Calendar, TrendingUp, AlertCircle } from "lucide-react"
import { PatientActivityChart } from "@/components/dashboard/patient-activity-chart"
import { RecentAppointments } from "@/components/dashboard/recent-appointments"
import { DepartmentStats } from "@/components/dashboard/department-stats"
import { appointmentsAPI, alertsAPI, healthMetricsAPI, usersAPI } from "@/lib/api"

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState({
    totalPatients: 0,
    appointmentsToday: 0,
    criticalAlerts: 0,
    avgWaitTime: "0m"
  })
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    // Check authentication
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('user')
      
      if (!token) {
        router.push('/login')
        return
      }

      if (userData) {
        setUser(JSON.parse(userData))
      }

      loadDashboardData()
      
      // Refresh dashboard data every 2 minutes to get latest alerts
      const refreshInterval = setInterval(() => {
        loadDashboardData()
      }, 120000) // 2 minutes
      
      return () => clearInterval(refreshInterval)
    }
  }, [router])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Get user from localStorage if not set
      const currentUser = user || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : null)
      
      // Load data based on user role
      if (currentUser?.role === 'provider' || currentUser?.role === 'doctor') {
        // Provider dashboard data
        const [patientsRes, appointmentsRes, alertsRes] = await Promise.all([
          usersAPI.getPatients({ role: 'patient' }), // Get all patients - no limit
          appointmentsAPI.getAppointments({ limit: 10 }),
          alertsAPI.getSummary()
        ])

        const appointments = appointmentsRes.data.data?.appointments || appointmentsRes.data.data || []
        const alertsData = alertsRes.data.data || {}
        
        setStats({
          totalPatients: patientsRes.data.data?.patients?.length || patientsRes.data.data?.length || 0,
          appointmentsToday: Array.isArray(appointments) ? appointments.filter((apt: any) => {
            const today = new Date()
            const aptDate = new Date(apt.scheduledDate)
            return aptDate.toDateString() === today.toDateString()
          }).length : 0,
          criticalAlerts: alertsData.severityCounts?.critical || alertsData.critical || 0,
          avgWaitTime: "14m" // This would come from a separate endpoint
        })
      } else {
        // Patient dashboard data - fetch patient's own alerts and metrics
        const [appointmentsRes, alertsRes, metricsRes] = await Promise.all([
          appointmentsAPI.getAppointments({ limit: 10 }),
          alertsAPI.getSummary(), // Get summary which includes severityCounts
          healthMetricsAPI.getMetrics({ limit: 50 }) // Get recent metrics to check for critical values
        ])

        const appointments = appointmentsRes.data.data?.appointments || appointmentsRes.data.data || []
        const alertsData = alertsRes.data.data || {}
        const metricsData = metricsRes.data.data?.metrics || metricsRes.data.data || []
        
        // Get critical alerts count from summary
        let criticalAlerts = alertsData.severityCounts?.critical || 0
        
        // Also check for critical metrics that might not have alerts yet
        // Critical ranges based on NORMAL_RANGES
        const criticalMetricsCount = Array.isArray(metricsData) ? metricsData.filter((metric: any) => {
          if (!metric.value || !metric.metricType) return false
          const value = metric.value
          const ranges: Record<string, { criticalMin?: number; criticalMax?: number }> = {
            blood_pressure_systolic: { criticalMin: 70, criticalMax: 180 },
            blood_pressure_diastolic: { criticalMin: 40, criticalMax: 120 },
            heart_rate: { criticalMin: 40, criticalMax: 150 },
            temperature: { criticalMin: 35, criticalMax: 38.5 },
            oxygen_saturation: { criticalMin: 90, criticalMax: 100 },
            glucose: { criticalMin: 50, criticalMax: 200 },
          }
          const range = ranges[metric.metricType]
          if (!range) return false
          return (range.criticalMin !== undefined && value < range.criticalMin) || 
                 (range.criticalMax !== undefined && value > range.criticalMax)
        }).length : 0
        
        // Use the higher of alert count or critical metrics count
        criticalAlerts = Math.max(criticalAlerts, criticalMetricsCount)
        
        // Debug logging
        if (process.env.NODE_ENV === 'development') {
          console.log('[Dashboard] Patient alerts summary:', alertsData)
          console.log('[Dashboard] Critical alerts from summary:', alertsData.severityCounts?.critical || 0)
          console.log('[Dashboard] Critical metrics count:', criticalMetricsCount)
          console.log('[Dashboard] Final critical alerts count:', criticalAlerts)
        }
        
        setStats({
          totalPatients: 1,
          appointmentsToday: Array.isArray(appointments) ? appointments.filter((apt: any) => {
            const today = new Date()
            const aptDate = new Date(apt.scheduledDate)
            return aptDate.toDateString() === today.toDateString()
          }).length : 0,
          criticalAlerts: criticalAlerts,
          avgWaitTime: "14m"
        })
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      // Set default values on error
      setStats({
        totalPatients: 0,
        appointmentsToday: 0,
        criticalAlerts: 0,
        avgWaitTime: "0m"
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleString()}
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {user?.role === 'provider' || user?.role === 'doctor' ? 'Total Patients' : 'My Profile'}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPatients}</div>
            <p className="text-xs text-muted-foreground">
              {user?.role === 'provider' || user?.role === 'doctor' 
                ? '+12% from last month' 
                : 'Complete your profile'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appointments Today</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.appointmentsToday}</div>
            <p className="text-xs text-muted-foreground">Scheduled appointments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <Activity className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.criticalAlerts}</div>
            <p className="text-xs text-muted-foreground">Requires immediate attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Wait Time</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgWaitTime}</div>
            <p className="text-xs text-muted-foreground">-2m from last week</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <PatientActivityChart />
        <RecentAppointments />
      </div>

      {/* Secondary Content Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <DepartmentStats />
        <Card className="col-span-4 lg:col-span-4">
          <CardHeader>
            <CardTitle>Critical Alerts</CardTitle>
            <CardDescription>Recent system and patient alerts requiring attention.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-4 rounded-lg border p-3 bg-destructive/5">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">ICU Capacity Warning</p>
                  <p className="text-xs text-muted-foreground">
                    ICU Bed occupancy has reached 95%. Immediate review required.
                  </p>
                </div>
                <span className="ml-auto text-xs text-muted-foreground">2m ago</span>
              </div>
              <div className="flex items-start gap-4 rounded-lg border p-3">
                <Activity className="h-5 w-5 text-orange-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Patient Vitals Alert - Room 302</p>
                  <p className="text-xs text-muted-foreground">Abnormal heart rate detected for Patient #12345.</p>
                </div>
                <span className="ml-auto text-xs text-muted-foreground">15m ago</span>
              </div>
              <div className="flex items-start gap-4 rounded-lg border p-3">
                <Users className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Staff Shortage - Emergency</p>
                  <p className="text-xs text-muted-foreground">2 nurses called in sick for the night shift.</p>
                </div>
                <span className="ml-auto text-xs text-muted-foreground">1h ago</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
