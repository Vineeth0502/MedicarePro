"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Activity, 
  Heart, 
  Users, 
  Calendar, 
  MessageSquare, 
  BarChart3, 
  Shield, 
  Clock,
  CheckCircle2,
  ArrowRight,
  Stethoscope,
  Brain,
  Zap,
  Globe,
  Smartphone,
  TrendingUp,
  AlertCircle,
  FileText,
  Video,
  Phone
} from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const features = [
    {
      icon: Heart,
      title: "Real-Time Health Monitoring",
      description: "Track vital signs, heart rate, blood pressure, and more with live updates every minute",
      color: "from-red-500 to-pink-500"
    },
    {
      icon: Calendar,
      title: "Smart Appointment Booking",
      description: "Schedule, manage, and track appointments with doctors. Get reminders and notifications",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: MessageSquare,
      title: "Secure Messaging",
      description: "Private, encrypted messaging between patients and healthcare providers",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Comprehensive health metrics dashboard with trends, insights, and predictions",
      color: "from-purple-500 to-indigo-500"
    },
    {
      icon: AlertCircle,
      title: "Intelligent Alerts",
      description: "Get instant notifications for critical health conditions requiring immediate attention",
      color: "from-orange-500 to-red-500"
    },
    {
      icon: Shield,
      title: "HIPAA Compliant",
      description: "Enterprise-grade security with end-to-end encryption and privacy protection",
      color: "from-gray-700 to-gray-900"
    },
    {
      icon: Users,
      title: "Multi-User Support",
      description: "Patients, doctors, and administrators all in one integrated platform",
      color: "from-teal-500 to-blue-500"
    },
    {
      icon: FileText,
      title: "Digital Health Records",
      description: "Complete medical history, prescriptions, and reports in one secure location",
      color: "from-indigo-500 to-purple-500"
    }
  ]

  const stats = [
    { label: "Active Patients", value: "26+", icon: Users },
    { label: "Healthcare Providers", value: "14+", icon: Stethoscope },
    { label: "Health Metrics Tracked", value: "15+", icon: Activity },
    { label: "Uptime", value: "99.9%", icon: Zap }
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 backdrop-blur-sm bg-white/95 dark:bg-slate-900/95">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity group">
              <div className="w-10 h-10 bg-slate-900 dark:bg-white rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                <Activity className="h-6 w-6 text-white dark:text-slate-900" />
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                MediCare Pro
              </span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost" className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800">
                  Sign In
                </Button>
              </Link>
              <Link href="/onboarding">
                <Button className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 shadow-md hover:shadow-lg transition-all">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden bg-white dark:bg-slate-900">

        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium">
                <Zap className="h-4 w-4 mr-2" />
                Next-Generation Healthcare Platform
              </div>
              
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 dark:from-white dark:via-blue-100 dark:to-indigo-100 bg-clip-text text-transparent">
                  Professional
                </span>
                <br />
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Healthcare Management
                </span>
              </h1>
              
              <p className="text-xl text-slate-600 dark:text-slate-300 leading-relaxed">
                Comprehensive platform for patients and healthcare providers. Real-time monitoring, 
                intelligent alerts, secure messaging, and advanced analytics all in one place.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/signup">
                  <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg px-8 py-6">
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-2">
                    Sign In
                  </Button>
                </Link>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-8">
                {stats.map((stat, index) => {
                  const Icon = stat.icon
                  return (
                    <div key={index} className="text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 mb-2">
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">{stat.label}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right - 3D Card Showcase */}
            <div className="relative">
              <div className="perspective-1000">
                <div className="transform-3d hover:rotate-y-12 transition-transform duration-700">
                  <Card className="bg-gradient-to-br from-white to-blue-50 dark:from-slate-800 dark:to-slate-900 shadow-2xl border-0">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        </div>
                        <Activity className="h-5 w-5 text-blue-600" />
                      </div>
                      <CardTitle className="text-2xl">Health Dashboard</CardTitle>
                      <CardDescription>Real-time patient monitoring</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
                          <div className="text-sm text-slate-600 dark:text-slate-400">Heart Rate</div>
                          <div className="text-2xl font-bold text-red-600">72</div>
                          <div className="text-xs text-green-600">Normal</div>
                        </div>
                        <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
                          <div className="text-sm text-slate-600 dark:text-slate-400">Blood Pressure</div>
                          <div className="text-2xl font-bold text-blue-600">120/80</div>
                          <div className="text-xs text-green-600">Normal</div>
                        </div>
                      </div>
                      <div className="h-32 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                        <BarChart3 className="h-12 w-12 text-white opacity-80" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              {/* Floating Elements */}
              <div className="absolute -top-10 -right-10 w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl rotate-12 opacity-20 animate-float"></div>
              <div className="absolute -bottom-10 -left-10 w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-2xl -rotate-12 opacity-20 animate-float-delayed"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-800">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              Powerful Features
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Everything you need for comprehensive healthcare management
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div
                  key={index}
                  className="group relative"
                  style={{
                    transformStyle: 'preserve-3d',
                    perspective: '1000px'
                  }}
                >
                  <Card className="h-full transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                    <CardHeader>
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                        <Icon className="h-7 w-7 text-white" />
                      </div>
                      <CardTitle className="text-xl mb-2">{feature.title}</CardTitle>
                      <CardDescription className="text-slate-600 dark:text-slate-400">
                        {feature.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-900">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-slate-600 dark:text-slate-400">
              Simple, secure, and efficient healthcare management
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Sign Up",
                description: "Create your account as a patient or healthcare provider",
                icon: Users
              },
              {
                step: "02",
                title: "Connect Devices",
                description: "Link your health monitoring devices for real-time data",
                icon: Smartphone
              },
              {
                step: "03",
                title: "Monitor & Manage",
                description: "Track health metrics, schedule appointments, and communicate securely",
                icon: Activity
              }
            ].map((item, index) => {
              const Icon = item.icon
              return (
                <div key={index} className="relative">
                  <div className="absolute -top-4 -left-4 w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-xl z-10">
                    {item.step}
                  </div>
                  <Card className="pt-12 h-full border-0 bg-gradient-to-br from-white to-blue-50 dark:from-slate-800 dark:to-slate-900 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader>
                      <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                        <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <CardTitle>{item.title}</CardTitle>
                      <CardDescription>{item.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900 dark:bg-slate-800">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Healthcare Experience?
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            Join thousands of patients and healthcare providers using MediCare Pro
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/onboarding">
              <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 text-lg px-8 py-6">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 text-lg px-8 py-6">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">MediCare Pro</span>
              </div>
              <p className="text-sm">
                Professional healthcare management platform for the modern world.
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Security</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Support</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white transition-colors">Privacy</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Terms</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">HIPAA</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm">
            <p>&copy; 2025 MediCare Pro. All rights reserved.</p>
          </div>
      </div>
      </footer>
    </div>
  )
}
