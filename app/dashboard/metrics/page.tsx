"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts"
import { 
  Activity, 
  Heart,
  Droplet,
  Thermometer,
  Gauge,
  AlertTriangle,
  RefreshCw,
  AlertCircle,
  Footprints,
  Moon,
  Flame,
  Smile,
  Scale,
  Users,
  TrendingUp,
  TrendingDown,
  Building2,
  UserCheck,
  UserX,
  Clock,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
} from "lucide-react"
import { healthMetricsAPI, alertsAPI, usersAPI } from "@/lib/api"
import { format, subDays, subHours } from "date-fns"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Normal ranges for health metrics
const NORMAL_RANGES: Record<string, { min: number; max: number; criticalMin?: number; criticalMax?: number }> = {
  blood_pressure_systolic: { min: 90, max: 120, criticalMin: 70, criticalMax: 180 },
  blood_pressure_diastolic: { min: 60, max: 80, criticalMin: 40, criticalMax: 120 },
  heart_rate: { min: 60, max: 100, criticalMin: 40, criticalMax: 150 },
  temperature: { min: 36.1, max: 37.2, criticalMin: 35, criticalMax: 38.5 },
  oxygen_saturation: { min: 95, max: 100, criticalMin: 90, criticalMax: 100 },
  glucose: { min: 70, max: 100, criticalMin: 50, criticalMax: 200 },
  weight: { min: 0, max: 300 },
  height: { min: 0, max: 250 },
  steps: { min: 0, max: 50000 },
  sleep_duration: { min: 7, max: 9, criticalMin: 4, criticalMax: 12 },
  sleep_quality: { min: 6, max: 10, criticalMin: 1, criticalMax: 10 },
  calories_burned: { min: 0, max: 10000 },
  hydration: { min: 1.5, max: 4, criticalMin: 0.5, criticalMax: 6 },
  stress_level: { min: 1, max: 5, criticalMin: 1, criticalMax: 10 },
  mood: { min: 3, max: 5, criticalMin: 1, criticalMax: 5 },
}

// Metric display configuration
const METRIC_CONFIG: Record<string, { 
  label: string
  icon: any
  unit: string
  category: 'vital' | 'activity' | 'wellness'
  chartType: 'line' | 'bar'
  color: string
}> = {
  blood_pressure_systolic: { label: 'Systolic BP', icon: Gauge, unit: 'mmHg', category: 'vital', chartType: 'line', color: '#ef4444' },
  blood_pressure_diastolic: { label: 'Diastolic BP', icon: Gauge, unit: 'mmHg', category: 'vital', chartType: 'line', color: '#3b82f6' },
  heart_rate: { label: 'Heart Rate', icon: Heart, unit: 'bpm', category: 'vital', chartType: 'line', color: '#f59e0b' },
  temperature: { label: 'Temperature', icon: Thermometer, unit: '°C', category: 'vital', chartType: 'line', color: '#ec4899' },
  oxygen_saturation: { label: 'O2 Saturation', icon: Droplet, unit: '%', category: 'vital', chartType: 'line', color: '#06b6d4' },
  glucose: { label: 'Blood Glucose', icon: Activity, unit: 'mg/dL', category: 'vital', chartType: 'line', color: '#8b5cf6' },
  weight: { label: 'Weight', icon: Scale, unit: 'kg', category: 'activity', chartType: 'line', color: '#6366f1' },
  height: { label: 'Height', icon: Activity, unit: 'cm', category: 'activity', chartType: 'line', color: '#14b8a6' },
  steps: { label: 'Steps', icon: Footprints, unit: 'steps', category: 'activity', chartType: 'bar', color: '#10b981' },
  sleep_duration: { label: 'Sleep Duration', icon: Moon, unit: 'hours', category: 'wellness', chartType: 'bar', color: '#6366f1' },
  sleep_quality: { label: 'Sleep Quality', icon: Moon, unit: 'scale', category: 'wellness', chartType: 'line', color: '#8b5cf6' },
  calories_burned: { label: 'Calories Burned', icon: Flame, unit: 'cal', category: 'activity', chartType: 'bar', color: '#f59e0b' },
  hydration: { label: 'Hydration', icon: Droplet, unit: 'L', category: 'wellness', chartType: 'bar', color: '#06b6d4' },
  stress_level: { label: 'Stress Level', icon: AlertTriangle, unit: 'scale', category: 'wellness', chartType: 'line', color: '#ef4444' },
  mood: { label: 'Mood', icon: Smile, unit: 'scale', category: 'wellness', chartType: 'line', color: '#10b981' },
}

const ALL_METRICS = [
  'blood_pressure_systolic',
  'blood_pressure_diastolic',
  'heart_rate',
  'temperature',
  'oxygen_saturation',
  'glucose',
  'weight',
  'height',
  'steps',
  'sleep_duration',
  'sleep_quality',
  'calories_burned',
  'hydration',
  'stress_level',
  'mood',
]

const VITAL_METRICS = ['heart_rate', 'temperature', 'oxygen_saturation', 'glucose']
const ACTIVITY_METRICS = ['steps', 'calories_burned', 'weight', 'height']
const WELLNESS_METRICS = ['sleep_duration', 'sleep_quality', 'hydration', 'stress_level', 'mood']

interface HospitalOverview {
  totalPatients: number
  patientsWithMetrics: number
  metricSummary: Record<string, {
    unit: string
    count: number
    patientCount: number
    average: number
    min: number
    max: number
    median: number
    p25: number
    p75: number
    stdDev: number
    timeSeries: Record<string, { avg: number; min: number; max: number; count: number }>
  }>
  patientHealthStatus: Record<string, {
    status: 'healthy' | 'monitoring' | 'warning' | 'critical' | 'no_data'
    metricsCount: number
    abnormalCount: number
    criticalCount: number
  }>
  statusCounts: {
    healthy: number
    monitoring: number
    warning: number
    critical: number
    no_data: number
  }
  patients: Array<{
    _id: string
    name: string
    email: string
    healthStatus: any
  }>
}

interface HealthMetric {
  _id: string
  metricType: string
  value: number
  unit: string
  timestamp: string | Date
  notes?: string
  source?: string
}

export default function MetricsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'hospital' | 'patient'>('hospital')
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [patients, setPatients] = useState<any[]>([])
  const [hospitalOverview, setHospitalOverview] = useState<HospitalOverview | null>(null)
  const [metrics, setMetrics] = useState<HealthMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year'>('week')
  const [mounted, setMounted] = useState(false)

  // Real-time polling interval (1 minute for live tracking)
  const POLL_INTERVAL = 60000 // 1 minute = 60,000 milliseconds

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user')
      if (userData) {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
        
        // Set default view mode
        if (parsedUser.role === 'patient') {
          setViewMode('patient')
          setSelectedPatientId(parsedUser._id)
        } else if (parsedUser.role === 'provider' || parsedUser.role === 'doctor' || parsedUser.role === 'admin') {
          setViewMode('hospital')
        }
      }
    }
  }, [])

  const loadPatients = async () => {
    try {
      const res = await usersAPI.getPatients({ role: 'patient' })
      const patientsData = res.data.data?.patients || res.data.data || []
      setPatients(Array.isArray(patientsData) ? patientsData : [])
    } catch (error) {
      console.error('Error loading patients:', error)
    }
  }

  const loadHospitalOverview = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true)
    }
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000) // 30 second timeout
      )
      
      const apiPromise = healthMetricsAPI.getHospitalOverview({
        period: timeRange,
      })
      
      const res = await Promise.race([apiPromise, timeoutPromise]) as any
      
      if (res?.data?.data) {
        setHospitalOverview(res.data.data)
        setLastUpdate(new Date())
      } else {
        throw new Error('Invalid response format')
      }
    } catch (error: any) {
      console.error('Error loading hospital overview:', error)
      // Set empty overview on error to prevent infinite loading
      setHospitalOverview(null)
      if (error.response?.status !== 403 && !silent) {
        const errorMsg = error.message === 'Request timeout' 
          ? 'Request timed out. Please try again.' 
          : 'Failed to load hospital overview.'
        toast.error('Error', { description: errorMsg })
      }
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }, [timeRange])

  const loadMetrics = useCallback(async (silent = false) => {
    // For patients, use their own ID if selectedPatientId is not set
    const patientIdToUse = selectedPatientId || (user?.role === 'patient' ? user._id : null)
    
    if (!patientIdToUse) {
      if (!silent) {
        setLoading(false)
      }
      return
    }

    if (!silent) {
      setLoading(true)
    }

    try {
      const now = new Date()
      let startDate: Date

      switch (timeRange) {
        case 'day':
          startDate = subHours(now, 24)
          break
        case 'week':
          startDate = subDays(now, 7)
          break
        case 'month':
          startDate = subDays(now, 30)
          break
        case 'year':
          startDate = subDays(now, 365)
          break
        default:
          startDate = subDays(now, 7)
      }

      let res
      // If user is a patient viewing their own metrics, use regular endpoint
      // If user is a doctor/provider viewing another patient, use patient-specific endpoint
      if (user?.role === 'patient' && patientIdToUse === user._id) {
        res = await healthMetricsAPI.getMetrics({
          startDate: startDate.toISOString(),
          endDate: now.toISOString(),
          limit: 1000,
        })
      } else if (user?.role === 'provider' || user?.role === 'doctor' || user?.role === 'admin') {
        res = await healthMetricsAPI.getPatientMetrics(patientIdToUse, {
          startDate: startDate.toISOString(),
          endDate: now.toISOString(),
          limit: 1000,
        })
      } else {
        // Fallback: try regular endpoint
        res = await healthMetricsAPI.getMetrics({
          startDate: startDate.toISOString(),
          endDate: now.toISOString(),
          limit: 1000,
        })
      }

      const metricsData = res.data.data?.metrics || res.data.data || []
      setMetrics(Array.isArray(metricsData) ? metricsData : [])
      setLastUpdate(new Date())
    } catch (error: any) {
      console.error('Error loading metrics:', error)
      // Don't show error toast for 403 - it's expected for patients trying to access patient endpoint
      if (error.response?.status !== 403 && !silent) {
        toast.error('Error', { description: 'Failed to load health metrics.' })
      }
      // Set empty metrics on error to prevent infinite loading
      setMetrics([])
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }, [selectedPatientId, timeRange, user])

  useEffect(() => {
    if (user?.role === 'provider' || user?.role === 'doctor' || user?.role === 'admin') {
      loadPatients()
    }
  }, [user])

  useEffect(() => {
    if (!user) return // Wait for user to be loaded
    
    if (viewMode === 'hospital' && (user?.role === 'provider' || user?.role === 'doctor' || user?.role === 'admin')) {
      setLoading(true)
      loadHospitalOverview()
    } else if (viewMode === 'patient') {
      // For patients, ensure their ID is set first
      if (user?.role === 'patient' && user._id && !selectedPatientId) {
        setSelectedPatientId(user._id)
        return // Wait for next render after setting ID
      }
      
      // Load metrics if we have a patient ID (either selectedPatientId or user._id for patients)
      const patientIdToUse = selectedPatientId || (user?.role === 'patient' ? user._id : null)
      if (patientIdToUse) {
        setLoading(true)
        loadMetrics()
      }
    }
  }, [viewMode, selectedPatientId, timeRange, user, loadMetrics, loadHospitalOverview])

  useEffect(() => {
    if (viewMode === 'hospital' && (user?.role === 'provider' || user?.role === 'doctor' || user?.role === 'admin')) {
      // Real-time polling for hospital overview (silent updates every 1 minute)
      const interval = setInterval(() => {
        loadHospitalOverview(true) // Silent update - no loading spinner
      }, POLL_INTERVAL)
      return () => clearInterval(interval)
    } else if (viewMode === 'patient' && selectedPatientId) {
      // Real-time polling for patient metrics (silent updates every 1 minute)
      const interval = setInterval(() => {
        loadMetrics(true) // Silent update - no loading spinner
      }, POLL_INTERVAL)
      return () => clearInterval(interval)
    }
  }, [viewMode, selectedPatientId, loadMetrics, loadHospitalOverview])

  const prepareTimeSeriesData = (metricType: string) => {
    if (!hospitalOverview?.metricSummary[metricType]) return []
    
    const timeSeries = hospitalOverview.metricSummary[metricType].timeSeries
    return Object.keys(timeSeries)
      .sort()
      .map(date => ({
        date: format(new Date(date), 'MMM dd'),
        value: timeSeries[date].avg,
        min: timeSeries[date].min,
        max: timeSeries[date].max,
      }))
  }

  const preparePatientChartData = (metricType: string) => {
    const filtered = metrics
      .filter((m) => m.metricType === metricType)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    return filtered.map((m) => ({
      time: format(new Date(m.timestamp), timeRange === 'day' ? 'HH:mm' : timeRange === 'week' ? 'MMM dd' : timeRange === 'month' ? 'MMM dd' : 'MMM yyyy'),
      value: m.value,
      timestamp: m.timestamp,
    }))
  }

  const getLatestPatientValue = (metricType: string) => {
    const metric = metrics
      .filter((m) => m.metricType === metricType)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
    return metric
  }

  const getPatientMetricStatus = (metricType: string, value: number) => {
    const range = NORMAL_RANGES[metricType]
    if (!range) return { status: 'normal', color: 'text-green-600' }

    if (range.criticalMin !== undefined && value < range.criticalMin) {
      return { status: 'critical', color: 'text-red-600' }
    }
    if (range.criticalMax !== undefined && value > range.criticalMax) {
      return { status: 'critical', color: 'text-red-600' }
    }
    if (value < range.min || value > range.max) {
      return { status: 'warning', color: 'text-orange-600' }
    }
    return { status: 'normal', color: 'text-green-600' }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#10b981'
      case 'monitoring': return '#3b82f6'
      case 'warning': return '#f59e0b'
      case 'critical': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return UserCheck
      case 'monitoring': return Clock
      case 'warning': return AlertTriangle
      case 'critical': return AlertCircle
      default: return UserX
    }
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Hospital Overview View (for doctors/providers)
  if (viewMode === 'hospital' && (user?.role === 'provider' || user?.role === 'doctor' || user?.role === 'admin')) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Hospital Analytics Dashboard
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Real-time health metrics monitoring across all patients
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
              <span className="font-medium">Live</span>
            </div>
            <div className="flex gap-2">
              {(['day', 'week', 'month', 'year'] as const).map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeRange(range)}
                >
                  {range === 'day' ? '24 Hours' : range === 'week' ? '7 Days' : range === 'month' ? '30 Days' : '1 Year'}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setViewMode('patient')
                if (patients.length > 0) {
                  setSelectedPatientId(patients[0]._id)
                }
              }}
            >
              <Users className="mr-2 h-4 w-4" />
              Patient View
            </Button>
          </div>
        </div>

        {loading && !hospitalOverview ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Activity className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading hospital analytics...</p>
              <p className="text-xs text-muted-foreground mt-2">This may take a moment...</p>
            </div>
          </div>
        ) : !hospitalOverview && !loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Unable to load hospital analytics</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={() => loadHospitalOverview()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        ) : hospitalOverview ? (
          <>
            {/* Key Statistics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
                  <Building2 className="h-5 w-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-700">{hospitalOverview.totalPatients}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {hospitalOverview.patientsWithMetrics} with metrics
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100/50 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Healthy</CardTitle>
                  <UserCheck className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-700">{hospitalOverview.statusCounts.healthy}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {hospitalOverview.totalPatients > 0 
                      ? Math.round((hospitalOverview.statusCounts.healthy / hospitalOverview.totalPatients) * 100)
                      : 0}% of patients
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100/50 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Warning</CardTitle>
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-700">{hospitalOverview.statusCounts.warning}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Requires attention
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-red-100/50 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Critical</CardTitle>
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-700">{hospitalOverview.statusCounts.critical}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Immediate action needed
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Patient Health Status Distribution */}
            <Card className="shadow-xl border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Patient Health Status Distribution
                </CardTitle>
                <CardDescription>Overview of patient health status across the hospital</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div style={{ width: '100%', height: '300px', minHeight: '300px', minWidth: 0 }}>
                      <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Healthy', value: hospitalOverview.statusCounts.healthy, color: '#10b981' },
                            { name: 'Monitoring', value: hospitalOverview.statusCounts.monitoring, color: '#3b82f6' },
                            { name: 'Warning', value: hospitalOverview.statusCounts.warning, color: '#f59e0b' },
                            { name: 'Critical', value: hospitalOverview.statusCounts.critical, color: '#ef4444' },
                            { name: 'No Data', value: hospitalOverview.statusCounts.no_data, color: '#6b7280' },
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {[
                            { name: 'Healthy', value: hospitalOverview.statusCounts.healthy, color: '#10b981' },
                            { name: 'Monitoring', value: hospitalOverview.statusCounts.monitoring, color: '#3b82f6' },
                            { name: 'Warning', value: hospitalOverview.statusCounts.warning, color: '#f59e0b' },
                            { name: 'Critical', value: hospitalOverview.statusCounts.critical, color: '#ef4444' },
                            { name: 'No Data', value: hospitalOverview.statusCounts.no_data, color: '#6b7280' },
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {Object.entries(hospitalOverview.statusCounts).map(([status, count]) => {
                      const Icon = getStatusIcon(status)
                      const color = getStatusColor(status)
                      const percentage = hospitalOverview.totalPatients > 0 
                        ? Math.round((count / hospitalOverview.totalPatients) * 100)
                        : 0
                      return (
                        <div key={status} className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: color + '40', backgroundColor: color + '10' }}>
                          <div className="flex items-center gap-3">
                            <Icon className="h-5 w-5" style={{ color }} />
                            <div>
                              <p className="font-medium capitalize">{status.replace('_', ' ')}</p>
                              <p className="text-sm text-muted-foreground">{count} patients</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold" style={{ color }}>{percentage}%</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Metric Analytics */}
            <Tabs defaultValue="vitals" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="vitals">Vital Signs</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="wellness">Wellness</TabsTrigger>
              </TabsList>

              <TabsContent value="vitals" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {['heart_rate', 'temperature', 'oxygen_saturation', 'glucose'].map(metricType => {
                    const config = METRIC_CONFIG[metricType]
                    const summary = hospitalOverview.metricSummary[metricType]
                    if (!summary || !config) return null

                    const timeSeriesData = prepareTimeSeriesData(metricType)
                    const Icon = config.icon

                    return (
                      <Card key={metricType} className="shadow-sm border border-gray-200">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Icon className="h-4 w-4 text-gray-600" />
                            {config.label} - Hospital Average
                          </CardTitle>
                          <CardDescription className="text-sm">
                            Across {summary.patientCount} patients
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-2">
                              <div className="text-center p-2 bg-gray-50 rounded border border-gray-100">
                                <p className="text-xs text-gray-500 mb-1">Average</p>
                                <p className="text-lg font-semibold text-gray-900">{summary.average.toFixed(1)}</p>
                                <p className="text-xs text-gray-500 mt-1">{config.unit}</p>
                              </div>
                              <div className="text-center p-2 bg-gray-50 rounded border border-gray-100">
                                <p className="text-xs text-gray-500 mb-1">Min</p>
                                <p className="text-lg font-semibold text-gray-900">{summary.min.toFixed(1)}</p>
                                <p className="text-xs text-gray-500 mt-1">{config.unit}</p>
                              </div>
                              <div className="text-center p-2 bg-gray-50 rounded border border-gray-100">
                                <p className="text-xs text-gray-500 mb-1">Max</p>
                                <p className="text-lg font-semibold text-gray-900">{summary.max.toFixed(1)}</p>
                                <p className="text-xs text-gray-500 mt-1">{config.unit}</p>
                              </div>
                            </div>
                            {timeSeriesData.length > 0 && (
                              <div style={{ width: '100%', height: '250px', minHeight: '250px', minWidth: 0 }}>
                                <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                                  <LineChart data={timeSeriesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                  <XAxis 
                                    dataKey="date" 
                                    stroke="#9ca3af"
                                    style={{ fontSize: '12px' }}
                                    tick={{ fill: '#6b7280' }}
                                  />
                                  <YAxis 
                                    stroke="#9ca3af"
                                    style={{ fontSize: '12px' }}
                                    tick={{ fill: '#6b7280' }}
                                  />
                                  <Tooltip 
                                    contentStyle={{ 
                                      backgroundColor: 'white', 
                                      border: '1px solid #e5e7eb',
                                      borderRadius: '8px',
                                      padding: '12px',
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                    }}
                                    labelStyle={{ color: '#1f2937', fontWeight: '600', marginBottom: '8px' }}
                                    itemStyle={{ color: '#4b5563', fontSize: '14px' }}
                                  />
                                  <Line 
                                    type="monotone" 
                                    dataKey="value" 
                                    stroke="#9ca3af" 
                                    strokeWidth={2}
                                    dot={{ fill: '#9ca3af', r: 4 }}
                                    activeDot={{ r: 6 }}
                                  />
                                  </LineChart>
                              </ResponsiveContainer>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </TabsContent>

              <TabsContent value="activity" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {['steps', 'calories_burned', 'weight', 'height'].map(metricType => {
                    const config = METRIC_CONFIG[metricType]
                    const summary = hospitalOverview.metricSummary[metricType]
                    if (!summary || !config) return null

                    const timeSeriesData = prepareTimeSeriesData(metricType)
                    const Icon = config.icon

                    return (
                      <Card key={metricType} className="shadow-sm border border-gray-200">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Icon className="h-4 w-4 text-gray-600" />
                            {config.label} - Hospital Average
                          </CardTitle>
                          <CardDescription className="text-sm">
                            Across {summary.patientCount} patients
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-2">
                              <div className="text-center p-2 bg-gray-50 rounded border border-gray-100">
                                <p className="text-xs text-gray-500 mb-1">Average</p>
                                <p className="text-lg font-semibold text-gray-900">{summary.average.toFixed(1)}</p>
                                <p className="text-xs text-gray-500 mt-1">{config.unit}</p>
                              </div>
                              <div className="text-center p-2 bg-gray-50 rounded border border-gray-100">
                                <p className="text-xs text-gray-500 mb-1">Min</p>
                                <p className="text-lg font-semibold text-gray-900">{summary.min.toFixed(1)}</p>
                                <p className="text-xs text-gray-500 mt-1">{config.unit}</p>
                              </div>
                              <div className="text-center p-2 bg-gray-50 rounded border border-gray-100">
                                <p className="text-xs text-gray-500 mb-1">Max</p>
                                <p className="text-lg font-semibold text-gray-900">{summary.max.toFixed(1)}</p>
                                <p className="text-xs text-gray-500 mt-1">{config.unit}</p>
                              </div>
                            </div>
                            {timeSeriesData.length > 0 && (
                              <div style={{ width: '100%', height: '250px', minHeight: '250px', minWidth: 0 }}>
                                <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                                  <LineChart data={timeSeriesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                  <XAxis 
                                    dataKey="date" 
                                    stroke="#9ca3af"
                                    style={{ fontSize: '12px' }}
                                    tick={{ fill: '#6b7280' }}
                                  />
                                  <YAxis 
                                    stroke="#9ca3af"
                                    style={{ fontSize: '12px' }}
                                    tick={{ fill: '#6b7280' }}
                                  />
                                  <Tooltip 
                                    contentStyle={{ 
                                      backgroundColor: 'white', 
                                      border: '1px solid #e5e7eb',
                                      borderRadius: '8px',
                                      padding: '12px',
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                    }}
                                    labelStyle={{ color: '#1f2937', fontWeight: '600', marginBottom: '8px' }}
                                    itemStyle={{ color: '#4b5563', fontSize: '14px' }}
                                  />
                                  <Line 
                                      type="monotone" 
                                      dataKey="value" 
                                    stroke="#9ca3af" 
                                      strokeWidth={2}
                                    dot={{ fill: '#9ca3af', r: 4 }}
                                    activeDot={{ r: 6 }}
                                    />
                                  </LineChart>
                              </ResponsiveContainer>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </TabsContent>

              <TabsContent value="wellness" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {['sleep_duration', 'sleep_quality', 'hydration', 'stress_level', 'mood'].map(metricType => {
                    const config = METRIC_CONFIG[metricType]
                    const summary = hospitalOverview.metricSummary[metricType]
                    if (!summary || !config) return null

                    const timeSeriesData = prepareTimeSeriesData(metricType)
                    const Icon = config.icon

                    return (
                      <Card key={metricType} className="shadow-sm border border-gray-200">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Icon className="h-4 w-4 text-gray-600" />
                            {config.label} - Hospital Average
                          </CardTitle>
                          <CardDescription className="text-sm">
                            Across {summary.patientCount} patients
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-2">
                              <div className="text-center p-2 bg-gray-50 rounded border border-gray-100">
                                <p className="text-xs text-gray-500 mb-1">Average</p>
                                <p className="text-lg font-semibold text-gray-900">{summary.average.toFixed(1)}</p>
                                <p className="text-xs text-gray-500 mt-1">{config.unit}</p>
                              </div>
                              <div className="text-center p-2 bg-gray-50 rounded border border-gray-100">
                                <p className="text-xs text-gray-500 mb-1">Min</p>
                                <p className="text-lg font-semibold text-gray-900">{summary.min.toFixed(1)}</p>
                                <p className="text-xs text-gray-500 mt-1">{config.unit}</p>
                              </div>
                              <div className="text-center p-2 bg-gray-50 rounded border border-gray-100">
                                <p className="text-xs text-gray-500 mb-1">Max</p>
                                <p className="text-lg font-semibold text-gray-900">{summary.max.toFixed(1)}</p>
                                <p className="text-xs text-gray-500 mt-1">{config.unit}</p>
                              </div>
                            </div>
                            {timeSeriesData.length > 0 && (
                              <div style={{ width: '100%', height: '250px', minHeight: '250px', minWidth: 0 }}>
                                <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                                  <LineChart data={timeSeriesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                  <XAxis 
                                    dataKey="date" 
                                    stroke="#9ca3af"
                                    style={{ fontSize: '12px' }}
                                    tick={{ fill: '#6b7280' }}
                                  />
                                  <YAxis 
                                    stroke="#9ca3af"
                                    style={{ fontSize: '12px' }}
                                    tick={{ fill: '#6b7280' }}
                                  />
                                  <Tooltip 
                                    contentStyle={{ 
                                      backgroundColor: 'white', 
                                      border: '1px solid #e5e7eb',
                                      borderRadius: '8px',
                                      padding: '12px',
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                    }}
                                    labelStyle={{ color: '#1f2937', fontWeight: '600', marginBottom: '8px' }}
                                    itemStyle={{ color: '#4b5563', fontSize: '14px' }}
                                  />
                                  <Line 
                                      type="monotone" 
                                      dataKey="value" 
                                    stroke="#9ca3af" 
                                      strokeWidth={2}
                                    dot={{ fill: '#9ca3af', r: 4 }}
                                    activeDot={{ r: 6 }}
                                    />
                                  </LineChart>
                              </ResponsiveContainer>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </TabsContent>
            </Tabs>

            {/* Patient List */}
            <Card className="shadow-xl border-2">
              <CardHeader>
                <CardTitle>Patient Health Status</CardTitle>
                <CardDescription>Detailed view of all patients and their health status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {hospitalOverview.patients.map(patient => {
                    const status = patient.healthStatus.status
                    const Icon = getStatusIcon(status)
                    const color = getStatusColor(status)
                    return (
                      <div
                        key={patient._id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => {
                          setViewMode('patient')
                          setSelectedPatientId(patient._id)
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full" style={{ backgroundColor: color + '20' }}>
                            <Icon className="h-4 w-4" style={{ color }} />
                          </div>
                          <div>
                            <p className="font-medium">{patient.name}</p>
                            <p className="text-sm text-muted-foreground">{patient.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            style={{ borderColor: color, color }}
                          >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </Badge>
                          <Button variant="ghost" size="sm">
                            View Details →
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Last Update */}
            <div className="text-center text-sm text-muted-foreground">
              Last updated: {format(lastUpdate, 'PPp')}
            </div>
          </>
        ) : null}
      </div>
    )
  }

  // Patient View (for patients or doctors viewing individual patient)
  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Health Metrics - {user?.role === 'patient' ? 'Your Metrics' : 'Patient View'}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Real-time monitoring and analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(user?.role === 'provider' || user?.role === 'doctor' || user?.role === 'admin') && (
            <>
              <Select value={selectedPatientId || ''} onValueChange={(value) => setSelectedPatientId(value)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient._id} value={patient._id}>
                      {patient.firstName} {patient.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode('hospital')}
              >
                <Building2 className="mr-2 h-4 w-4" />
                Hospital View
              </Button>
            </>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Live</span>
          </div>
          <div className="flex gap-2">
            {(['day', 'week', 'month', 'year'] as const).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(range)}
              >
                {range === 'day' ? '24 Hours' : range === 'week' ? '7 Days' : range === 'month' ? '30 Days' : '1 Year'}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading metrics...</p>
          </div>
        </div>
      ) : metrics.length > 0 ? (
        <>
          {/* Vital Signs Section */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
              <Heart className="h-4 w-4 text-gray-600" />
              Vital Signs
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Blood Pressure */}
              {getLatestPatientValue('blood_pressure_systolic') && getLatestPatientValue('blood_pressure_diastolic') && (
                <Card className="shadow-sm border border-gray-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Blood Pressure</CardTitle>
                    <Gauge className="h-4 w-4 text-gray-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900">
                      {getLatestPatientValue('blood_pressure_systolic')!.value}/{getLatestPatientValue('blood_pressure_diastolic')!.value}
                      <span className="text-sm font-normal text-gray-500 ml-1">mmHg</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {getPatientMetricStatus('blood_pressure_systolic', getLatestPatientValue('blood_pressure_systolic')!.value).status === 'critical' ||
                      getPatientMetricStatus('blood_pressure_diastolic', getLatestPatientValue('blood_pressure_diastolic')!.value).status === 'critical' ? (
                        <Badge variant="destructive" className="text-xs">Critical</Badge>
                      ) : getPatientMetricStatus('blood_pressure_systolic', getLatestPatientValue('blood_pressure_systolic')!.value).status === 'warning' ||
                        getPatientMetricStatus('blood_pressure_diastolic', getLatestPatientValue('blood_pressure_diastolic')!.value).status === 'warning' ? (
                        <Badge variant="default" className="text-xs bg-orange-500">Warning</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700">Normal</Badge>
                      )}
                      <span className="text-xs text-gray-500">
                        {format(new Date(getLatestPatientValue('blood_pressure_systolic')!.timestamp), 'HH:mm')}
                      </span>
        </div>
                  </CardContent>
                </Card>
              )}
              {VITAL_METRICS.map(metricType => {
                const config = METRIC_CONFIG[metricType]
                const latest = getLatestPatientValue(metricType)
                if (!latest || !config) return null
                const Icon = config.icon
                return (
                  <Card key={metricType} className="shadow-sm border border-gray-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{config.label}</CardTitle>
                      <Icon className="h-4 w-4 text-gray-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-gray-900">
                        {latest.value}
                        <span className="text-sm font-normal text-gray-500 ml-1">{latest.unit}</span>
    </div>
                      <div className="flex items-center gap-2 mt-2">
                        {getPatientMetricStatus(metricType, latest.value).status === 'critical' ? (
                          <Badge variant="destructive" className="text-xs">Critical</Badge>
                        ) : getPatientMetricStatus(metricType, latest.value).status === 'warning' ? (
                          <Badge variant="default" className="text-xs bg-orange-500">Warning</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700">Normal</Badge>
                        )}
                        <span className="text-xs text-gray-500">
                          {format(new Date(latest.timestamp), 'HH:mm')}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Activity Metrics */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
              <Activity className="h-4 w-4 text-gray-600" />
              Activity Metrics
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {ACTIVITY_METRICS.map(metricType => {
                const config = METRIC_CONFIG[metricType]
                const latest = getLatestPatientValue(metricType)
                if (!latest || !config) return null
                const Icon = config.icon
                return (
                  <Card key={metricType} className="shadow-sm border border-gray-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{config.label}</CardTitle>
                      <Icon className="h-4 w-4 text-gray-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-gray-900">
                        {latest.value}
                        <span className="text-sm font-normal text-gray-500 ml-1">{latest.unit}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700">Active</Badge>
                        <span className="text-xs text-gray-500">
                          {format(new Date(latest.timestamp), 'HH:mm')}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Wellness Metrics */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
              <Smile className="h-4 w-4 text-gray-600" />
              Wellness Metrics
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {WELLNESS_METRICS.map(metricType => {
                const config = METRIC_CONFIG[metricType]
                const latest = getLatestPatientValue(metricType)
                if (!latest || !config) return null
                const Icon = config.icon
                return (
                  <Card key={metricType} className="shadow-sm border border-gray-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{config.label}</CardTitle>
                      <Icon className="h-4 w-4 text-gray-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-gray-900">
                        {latest.value}
                        <span className="text-sm font-normal text-gray-500 ml-1">{latest.unit}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {getPatientMetricStatus(metricType, latest.value).status === 'critical' ? (
                          <Badge variant="destructive" className="text-xs">Critical</Badge>
                        ) : getPatientMetricStatus(metricType, latest.value).status === 'warning' ? (
                          <Badge variant="default" className="text-xs bg-orange-500">Warning</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700">Normal</Badge>
                        )}
                        <span className="text-xs text-gray-500">
                          {format(new Date(latest.timestamp), 'HH:mm')}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Charts Section */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
              <TrendingUp className="h-4 w-4 text-gray-600" />
              Trends & Analytics
            </h2>
            
            {/* Blood Pressure Chart */}
            {metrics.filter((m) => m.metricType.includes('blood_pressure')).length > 0 && (
              <Card className="mb-4 shadow-sm border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Gauge className="h-4 w-4 text-gray-600" />
                    Blood Pressure Trend
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Systolic and Diastolic over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {getLatestPatientValue('blood_pressure_systolic') && getLatestPatientValue('blood_pressure_diastolic') && (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center p-2 bg-gray-50 rounded border border-gray-100">
                          <p className="text-xs text-gray-500 mb-1">Average</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {((getLatestPatientValue('blood_pressure_systolic')!.value + getLatestPatientValue('blood_pressure_diastolic')!.value) / 2).toFixed(1)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">mmHg</p>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded border border-gray-100">
                          <p className="text-xs text-gray-500 mb-1">Systolic</p>
                          <p className="text-lg font-semibold text-gray-900">{getLatestPatientValue('blood_pressure_systolic')!.value}</p>
                          <p className="text-xs text-gray-500 mt-1">mmHg</p>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded border border-gray-100">
                          <p className="text-xs text-gray-500 mb-1">Diastolic</p>
                          <p className="text-lg font-semibold text-gray-900">{getLatestPatientValue('blood_pressure_diastolic')!.value}</p>
                          <p className="text-xs text-gray-500 mt-1">mmHg</p>
                        </div>
                      </div>
                    )}
                    <div style={{ width: '100%', height: '250px', minHeight: '250px', minWidth: 0 }}>
                      <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                        <LineChart
                          data={preparePatientChartData('blood_pressure_systolic').map((systolic, i) => {
                          const diastolic = preparePatientChartData('blood_pressure_diastolic')[i]
                          return {
                            ...systolic,
                            systolic: systolic.value,
                            diastolic: diastolic?.value || null,
                          }
                        })}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="time" 
                          stroke="#9ca3af"
                          style={{ fontSize: '12px' }}
                          tick={{ fill: '#6b7280' }}
                        />
                        <YAxis 
                          stroke="#9ca3af"
                          style={{ fontSize: '12px' }}
                          tick={{ fill: '#6b7280' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            padding: '12px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                          }}
                          labelStyle={{ color: '#1f2937', fontWeight: '600', marginBottom: '8px' }}
                          itemStyle={{ color: '#4b5563', fontSize: '14px' }}
                        />
                        <Legend 
                          wrapperStyle={{ paddingTop: '20px' }}
                          iconType="line"
                        />
                        <Line
                          type="monotone"
                          dataKey="systolic"
                          stroke="#9ca3af"
                          strokeWidth={2}
                          name="Systolic"
                          dot={{ fill: '#9ca3af', r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="diastolic"
                          stroke="#6b7280"
                          strokeWidth={2}
                          name="Diastolic"
                          dot={{ fill: '#6b7280', r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Other Metric Charts */}
            <div className="grid gap-4 md:grid-cols-2">
              {ALL_METRICS.filter(m => m !== 'blood_pressure_systolic' && m !== 'blood_pressure_diastolic').map(metricType => {
                const config = METRIC_CONFIG[metricType]
                if (!config) return null

                const chartData = preparePatientChartData(metricType)
                if (chartData.length === 0) return null

                const Icon = config.icon
                const avg = chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length
                const min = Math.min(...chartData.map(d => d.value))
                const max = Math.max(...chartData.map(d => d.value))

                return (
                  <Card key={metricType} className="shadow-sm border border-gray-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Icon className="h-4 w-4 text-gray-600" />
                        {config.label}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Patient health metric over time
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center p-2 bg-gray-50 rounded border border-gray-100">
                            <p className="text-xs text-gray-500 mb-1">Average</p>
                            <p className="text-lg font-semibold text-gray-900">{avg.toFixed(1)}</p>
                            <p className="text-xs text-gray-500 mt-1">{config.unit}</p>
                          </div>
                          <div className="text-center p-2 bg-gray-50 rounded border border-gray-100">
                            <p className="text-xs text-gray-500 mb-1">Min</p>
                            <p className="text-lg font-semibold text-gray-900">{min.toFixed(1)}</p>
                            <p className="text-xs text-gray-500 mt-1">{config.unit}</p>
                          </div>
                          <div className="text-center p-2 bg-gray-50 rounded border border-gray-100">
                            <p className="text-xs text-gray-500 mb-1">Max</p>
                            <p className="text-lg font-semibold text-gray-900">{max.toFixed(1)}</p>
                            <p className="text-xs text-gray-500 mt-1">{config.unit}</p>
                          </div>
                        </div>
                        <div style={{ width: '100%', height: '250px', minHeight: '250px', minWidth: 0 }}>
                          <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis 
                              dataKey="time" 
                              stroke="#9ca3af"
                              style={{ fontSize: '12px' }}
                              tick={{ fill: '#6b7280' }}
                            />
                            <YAxis 
                              stroke="#9ca3af"
                              style={{ fontSize: '12px' }}
                              tick={{ fill: '#6b7280' }}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'white', 
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                padding: '12px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                              }}
                              labelStyle={{ color: '#1f2937', fontWeight: '600', marginBottom: '8px' }}
                              itemStyle={{ color: '#4b5563', fontSize: '14px' }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="value" 
                              stroke="#9ca3af" 
                              strokeWidth={2}
                              dot={{ fill: '#9ca3af', r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Last Update */}
          <div className="text-center text-sm text-muted-foreground">
            Last updated: {format(lastUpdate, 'PPp')}
          </div>
        </>
      ) : (
        <div className="text-center text-muted-foreground py-12">
          <p>No metrics data available</p>
          <p className="text-sm mt-2">Metrics will appear here once data is collected</p>
        </div>
      )}
    </div>
  )
}
