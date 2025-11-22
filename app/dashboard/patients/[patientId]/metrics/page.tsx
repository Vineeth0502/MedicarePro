"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Activity, Heart, Droplet, Thermometer, Gauge, TrendingUp, TrendingDown, AlertTriangle, RefreshCw, Clock, Activity as ActivityIcon, Footprints, Moon, Flame, Smile, Scale } from "lucide-react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { healthMetricsAPI, alertsAPI, usersAPI } from "@/lib/api"
import { format, subDays, subHours } from "date-fns"
import { toast } from "sonner"

// Normal ranges for health metrics
const NORMAL_RANGES: Record<string, { min: number; max: number; criticalMin?: number; criticalMax?: number }> = {
  blood_pressure_systolic: { min: 90, max: 120, criticalMin: 70, criticalMax: 180 },
  blood_pressure_diastolic: { min: 60, max: 80, criticalMin: 40, criticalMax: 120 },
  heart_rate: { min: 60, max: 100, criticalMin: 40, criticalMax: 150 },
  temperature: { min: 36.1, max: 37.2, criticalMin: 35, criticalMax: 38.5 },
  oxygen_saturation: { min: 95, max: 100, criticalMin: 90, criticalMax: 100 },
  glucose: { min: 70, max: 100, criticalMin: 50, criticalMax: 200 },
  weight: { min: 0, max: 300 }, // No critical range, but can monitor trends
  height: { min: 0, max: 250 }, // No critical range
  steps: { min: 0, max: 50000 }, // Daily steps - no critical, but can set goals
  sleep_duration: { min: 7, max: 9, criticalMin: 4, criticalMax: 12 }, // Hours
  sleep_quality: { min: 6, max: 10, criticalMin: 1, criticalMax: 10 }, // Scale 1-10
  calories_burned: { min: 0, max: 10000 }, // Daily calories
  hydration: { min: 1.5, max: 4, criticalMin: 0.5, criticalMax: 6 }, // Liters per day
  stress_level: { min: 1, max: 5, criticalMin: 1, criticalMax: 10 }, // Scale 1-10
  mood: { min: 3, max: 5, criticalMin: 1, criticalMax: 5 }, // Scale 1-5
}

// Metric display configuration
const METRIC_CONFIG: Record<string, { 
  label: string
  icon: any
  unit: string
  category: 'vital' | 'activity' | 'wellness'
  chartType: 'line' | 'bar'
}> = {
  blood_pressure_systolic: { label: 'Systolic BP', icon: Gauge, unit: 'mmHg', category: 'vital', chartType: 'line' },
  blood_pressure_diastolic: { label: 'Diastolic BP', icon: Gauge, unit: 'mmHg', category: 'vital', chartType: 'line' },
  heart_rate: { label: 'Heart Rate', icon: Heart, unit: 'bpm', category: 'vital', chartType: 'line' },
  temperature: { label: 'Temperature', icon: Thermometer, unit: '°C', category: 'vital', chartType: 'line' },
  oxygen_saturation: { label: 'O2 Saturation', icon: Droplet, unit: '%', category: 'vital', chartType: 'line' },
  glucose: { label: 'Blood Glucose', icon: Activity, unit: 'mg/dL', category: 'vital', chartType: 'line' },
  weight: { label: 'Weight', icon: Scale, unit: 'kg', category: 'activity', chartType: 'line' },
  height: { label: 'Height', icon: Activity, unit: 'cm', category: 'activity', chartType: 'line' },
  steps: { label: 'Steps', icon: Footprints, unit: 'steps', category: 'activity', chartType: 'bar' },
  sleep_duration: { label: 'Sleep Duration', icon: Moon, unit: 'hours', category: 'wellness', chartType: 'bar' },
  sleep_quality: { label: 'Sleep Quality', icon: Moon, unit: 'scale', category: 'wellness', chartType: 'line' },
  calories_burned: { label: 'Calories Burned', icon: Flame, unit: 'cal', category: 'activity', chartType: 'bar' },
  hydration: { label: 'Hydration', icon: Droplet, unit: 'L', category: 'wellness', chartType: 'bar' },
  stress_level: { label: 'Stress Level', icon: AlertTriangle, unit: 'scale', category: 'wellness', chartType: 'line' },
  mood: { label: 'Mood', icon: Smile, unit: 'scale', category: 'wellness', chartType: 'line' },
}

// All available metric types
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

const VITAL_METRICS = ['heart_rate', 'temperature', 'oxygen_saturation', 'glucose'] // BP handled separately
const ACTIVITY_METRICS = ['steps', 'calories_burned', 'weight', 'height']
const WELLNESS_METRICS = ['sleep_duration', 'sleep_quality', 'hydration', 'stress_level', 'mood']

interface HealthMetric {
  _id: string
  metricType: string
  value: number
  unit: string
  timestamp: string | Date
  notes?: string
  source?: string
}

interface Alert {
  _id: string
  title: string
  message: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  triggeredAt: string | Date
  isRead: boolean
}

export default function PatientMetricsPage() {
  const router = useRouter()
  const params = useParams()
  const patientId = params?.patientId as string

  const [patient, setPatient] = useState<any>(null)
  const [metrics, setMetrics] = useState<HealthMetric[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h')

  // Real-time polling interval (1 minute for live tracking)
  const POLL_INTERVAL = 60000 // 1 minute = 60,000 milliseconds

  const loadPatient = async () => {
    try {
      const res = await usersAPI.getUser(patientId)
      setPatient(res.data.data || res.data)
    } catch (error) {
      console.error('Error loading patient:', error)
      toast.error('Error', { description: 'Failed to load patient information.' })
    }
  }

  const loadMetrics = useCallback(async (silent = false) => {
    if (!patientId) {
      console.log('[PatientMetrics] No patientId, skipping loadMetrics')
      setLoading(false)
      return
    }

    if (!silent) {
      setLoading(true)
    }

    try {
      console.log('[PatientMetrics] Fetching metrics for patient:', patientId, 'timeRange:', timeRange)
      const now = new Date()
      let startDate: Date

      switch (timeRange) {
        case '1h':
          startDate = subHours(now, 1)
          break
        case '24h':
          startDate = subDays(now, 1)
          break
        case '7d':
          startDate = subDays(now, 7)
          break
        case '30d':
          startDate = subDays(now, 30)
          break
        default:
          startDate = subDays(now, 1)
      }

      const res = await healthMetricsAPI.getPatientMetrics(patientId, {
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        limit: 1000,
      })

      const metricsData = res.data.data?.metrics || res.data.data || []
      console.log('[PatientMetrics] Received metrics:', metricsData.length, 'items')
      setMetrics(Array.isArray(metricsData) ? metricsData : [])
      setLastUpdate(new Date())

      // Check for abnormal values and create alerts (only on non-silent updates)
      if (!silent) {
        checkForAbnormalValues(metricsData)
      }
    } catch (error: any) {
      console.error('Error loading metrics:', error)
      // Set empty array on error to prevent infinite loading
      setMetrics([])
      if (!silent) {
        const errorMessage = error?.response?.data?.message || error?.message || 'Failed to load health metrics.'
        toast.error('Error', { description: errorMessage })
        // Log more details for debugging
        if (error?.response?.status === 403) {
          console.error('Access denied - user may not have provider role')
        } else if (error?.response?.status === 404) {
          console.error('Patient not found or no metrics available')
        }
      }
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }, [patientId, timeRange])

  const loadAlerts = async () => {
    if (!patientId) return

    try {
      const res = await alertsAPI.getPatientAlerts(patientId, {
        limit: 20,
        status: 'active',
      })
      const alertsData = res.data.data?.alerts || res.data.data || []
      setAlerts(Array.isArray(alertsData) ? alertsData : [])
    } catch (error) {
      console.error('Error loading alerts:', error)
    }
  }

  const checkForAbnormalValues = async (metricsData: HealthMetric[]) => {
    if (!metricsData || metricsData.length === 0) return

    // Get the latest value for each metric type
    const latestMetrics = new Map<string, HealthMetric>()
    metricsData.forEach((metric) => {
      const existing = latestMetrics.get(metric.metricType)
      if (!existing || new Date(metric.timestamp) > new Date(existing.timestamp)) {
        latestMetrics.set(metric.metricType, metric)
      }
    })

    // Check each metric against normal ranges
    for (const [metricType, metric] of latestMetrics) {
      const range = NORMAL_RANGES[metricType]
      if (!range) continue

      const value = metric.value
      let severity: 'critical' | 'high' | 'medium' | 'low' | null = null
      let shouldAlert = false

      // Check for critical values
      if (range.criticalMin !== undefined && value < range.criticalMin) {
        severity = 'critical'
        shouldAlert = true
      } else if (range.criticalMax !== undefined && value > range.criticalMax) {
        severity = 'critical'
        shouldAlert = true
      }
      // Check for high/low values (outside normal range)
      else if (value < range.min) {
        severity = 'high'
        shouldAlert = true
      } else if (value > range.max) {
        severity = 'high'
        shouldAlert = true
      }

      if (shouldAlert && severity) {
        // Check if alert already exists for this metric
        const existingAlert = alerts.find(
          (a) => a.message.includes(metricType) && !a.isRead
        )

        if (!existingAlert) {
          const metricName = metricType
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (l) => l.toUpperCase())
          const message = `Patient ${patient?.firstName || 'Patient'} has abnormal ${metricName}: ${value} ${metric.unit}. Normal range: ${range.min}-${range.max} ${metric.unit}`

          try {
            await alertsAPI.createAlert({
              title: `Abnormal ${metricName} Alert`,
              message,
              severity,
              alertType: 'health_alert',
              patientId: patientId,
              relatedMetricId: metric._id,
            })

            // Play alert sound
            playAlertSound()
            toast.warning('Health Alert', { description: message })
          } catch (error) {
            console.error('Error creating alert:', error)
          }
        }
      }
    }
  }

  const playAlertSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 1000
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
    } catch (error) {
      console.log('Alert sound not available')
    }
  }

  useEffect(() => {
    if (patientId) {
      console.log('[PatientMetrics] Loading data for patient:', patientId)
      loadPatient()
      loadMetrics() // This will set loading state properly
      loadAlerts()
    } else {
      // If no patientId, stop loading
      console.log('[PatientMetrics] No patientId found')
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    if (!patientId) return

    // Real-time polling (silent updates every 1 minute)
    const interval = setInterval(() => {
      loadMetrics(true) // Silent update - no loading spinner
      loadAlerts()
    }, POLL_INTERVAL)

    return () => clearInterval(interval)
  }, [patientId, loadMetrics])

  useEffect(() => {
    if (patientId) {
      loadMetrics() // Reload when timeRange changes
    }
  }, [timeRange, patientId])

  const getLatestValue = (metricType: string) => {
    const metric = metrics
      .filter((m) => m.metricType === metricType)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
    return metric
  }

  const getMetricStatus = (metricType: string, value: number) => {
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

  const prepareChartData = (metricType: string) => {
    const filtered = metrics
      .filter((m) => m.metricType === metricType)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    return filtered.map((m) => ({
      time: format(new Date(m.timestamp), timeRange === '1h' ? 'HH:mm' : timeRange === '24h' ? 'HH:mm' : 'MMM dd'),
      value: m.value,
      timestamp: m.timestamp,
    }))
  }

  const getPatientName = () => {
    if (!patient) return 'Patient'
    if (patient.firstName && patient.lastName) {
      return `${patient.firstName} ${patient.lastName}`
    }
    return patient.username || patient.email || 'Patient'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <ActivityIcon className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading patient metrics...</p>
        </div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Patient not found</p>
          <Button onClick={() => router.push('/dashboard/patients')} className="mt-4">
            Back to Patients
          </Button>
        </div>
      </div>
    )
  }

  // Get latest values for all metrics
  const getLatestValues = () => {
    const values: Record<string, HealthMetric | undefined> = {}
    ALL_METRICS.forEach((metricType) => {
      values[metricType] = getLatestValue(metricType)
    })
    return values
  }

  const latestValues = getLatestValues()

  // Render metric card component
  const renderMetricCard = (metricType: string) => {
    const config = METRIC_CONFIG[metricType]
    if (!config) return null

    const latest = latestValues[metricType]
    const Icon = config.icon

    return (
      <Card key={metricType} className="shadow-sm border border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{config.label}</CardTitle>
          <Icon className="h-4 w-4 text-gray-600" />
        </CardHeader>
        <CardContent>
          {latest ? (
            <>
              <div className="text-2xl font-bold text-gray-900">
                {latest.value}
                <span className="text-sm font-normal text-gray-500 ml-1">
                  {latest.unit}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {getMetricStatus(metricType, latest.value).status === 'critical' ? (
                  <Badge variant="destructive" className="text-xs">Critical</Badge>
                ) : getMetricStatus(metricType, latest.value).status === 'warning' ? (
                  <Badge variant="default" className="text-xs bg-orange-500">Warning</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700">Normal</Badge>
                )}
                <span className="text-xs text-gray-500">
                  {format(new Date(latest.timestamp), 'HH:mm')}
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">No data available</p>
          )}
        </CardContent>
      </Card>
    )
  }

  // Render chart for a metric
  const renderMetricChart = (metricType: string) => {
    const config = METRIC_CONFIG[metricType]
    if (!config) return null

    const chartData = prepareChartData(metricType)
    if (chartData.length === 0) return null

    const Icon = config.icon
    const latest = latestValues[metricType]
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
            <ResponsiveContainer width="100%" height={250}>
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
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Health Metrics - {getPatientName()}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Real-time monitoring and analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Live</span>
          </div>
          <div className="flex gap-2">
            {(['1h', '24h', '7d', '30d'] as const).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(range)}
              >
                {range === '1h' ? '1 Hour' : range === '24h' ? '24 Hours' : range === '7d' ? '7 Days' : '30 Days'}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Active Health Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.slice(0, 3).map((alert) => (
                <div
                  key={alert._id}
                  className="flex items-start gap-3 p-3 bg-white rounded-lg border border-red-200"
                >
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-red-900">{alert.title}</p>
                    <p className="text-sm text-red-700">{alert.message}</p>
                    <p className="text-xs text-red-600 mt-1">
                      {format(new Date(alert.triggeredAt), 'PPp')}
                    </p>
                  </div>
                  <Badge
                    variant={alert.severity === 'critical' ? 'destructive' : 'default'}
                    className="bg-red-600"
                  >
                    {alert.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vital Signs Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
          <Heart className="h-4 w-4 text-gray-600" />
          Vital Signs
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Blood Pressure - Special handling */}
          <Card className="shadow-sm border border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Blood Pressure</CardTitle>
              <Gauge className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              {latestValues.blood_pressure_systolic && latestValues.blood_pressure_diastolic ? (
                <>
                  <div className="text-2xl font-bold text-gray-900">
                    {latestValues.blood_pressure_systolic.value}/{latestValues.blood_pressure_diastolic.value}
                    <span className="text-sm font-normal text-gray-500 ml-1">mmHg</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {getMetricStatus('blood_pressure_systolic', latestValues.blood_pressure_systolic.value).status === 'critical' ||
                    getMetricStatus('blood_pressure_diastolic', latestValues.blood_pressure_diastolic.value).status === 'critical' ? (
                      <Badge variant="destructive" className="text-xs">Critical</Badge>
                    ) : getMetricStatus('blood_pressure_systolic', latestValues.blood_pressure_systolic.value).status === 'warning' ||
                      getMetricStatus('blood_pressure_diastolic', latestValues.blood_pressure_diastolic.value).status === 'warning' ? (
                      <Badge variant="default" className="text-xs bg-orange-500">Warning</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700">Normal</Badge>
                    )}
                    <span className="text-xs text-gray-500">
                      {format(new Date(latestValues.blood_pressure_systolic.timestamp), 'HH:mm')}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">No data available</p>
              )}
            </CardContent>
          </Card>
          {VITAL_METRICS.filter(m => m !== 'blood_pressure_systolic' && m !== 'blood_pressure_diastolic').map(renderMetricCard)}
        </div>
      </div>

      {/* Activity Metrics Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
          <Activity className="h-4 w-4 text-gray-600" />
          Activity Metrics
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {ACTIVITY_METRICS.map(renderMetricCard)}
        </div>
      </div>

      {/* Wellness Metrics Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
          <Smile className="h-4 w-4 text-gray-600" />
          Wellness Metrics
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {WELLNESS_METRICS.map(renderMetricCard)}
        </div>
      </div>

      {/* Charts Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
          <TrendingUp className="h-4 w-4 text-gray-600" />
          Trends & Analytics
        </h2>
        
        {/* Blood Pressure Chart - Special handling */}
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
                {latestValues.blood_pressure_systolic && latestValues.blood_pressure_diastolic && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 bg-gray-50 rounded border border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">Average</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {((latestValues.blood_pressure_systolic.value + latestValues.blood_pressure_diastolic.value) / 2).toFixed(1)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">mmHg</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded border border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">Systolic</p>
                      <p className="text-lg font-semibold text-gray-900">{latestValues.blood_pressure_systolic.value}</p>
                      <p className="text-xs text-gray-500 mt-1">mmHg</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded border border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">Diastolic</p>
                      <p className="text-lg font-semibold text-gray-900">{latestValues.blood_pressure_diastolic.value}</p>
                      <p className="text-xs text-gray-500 mt-1">mmHg</p>
                    </div>
                  </div>
                )}
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart
                    data={prepareChartData('blood_pressure_systolic').map((systolic, i) => {
                      const diastolic = prepareChartData('blood_pressure_diastolic')[i]
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
            </CardContent>
          </Card>
        )}

        {/* Charts for all other metrics */}
        <div className="grid gap-4 md:grid-cols-2">
          {ALL_METRICS.filter(m => m !== 'blood_pressure_systolic' && m !== 'blood_pressure_diastolic').map((metricType) => {
            const chartData = prepareChartData(metricType)
            if (chartData.length === 0) return null
            return renderMetricChart(metricType)
          })}
        </div>
      </div>

      {/* Last Update */}
      <div className="text-center text-sm text-muted-foreground">
        Last updated: {format(lastUpdate, 'PPp')}
      </div>
    </div>
  )
}

