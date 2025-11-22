"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Activity, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { authAPI } from "@/lib/api"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<"patient" | "provider">("patient")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    // Check if user is already logged in
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token')
      if (token) {
        router.push('/dashboard')
      }
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccessMessage("")

    try {
      const response = await authAPI.login({
        username: email,
        password,
        role
      })

      const { user, token } = response.data.data

      if (typeof window !== 'undefined') {
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))

        const needsOnboarding = !localStorage.getItem('onboarding_complete')

        if (needsOnboarding && user.role === 'patient') {
          router.push('/onboarding')
        } else {
          router.push('/dashboard')
        }
      }
    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message)
      } else {
        setError('Invalid credentials. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Navigation */}
      <nav className="border-b border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-slate-900 dark:bg-white rounded-lg flex items-center justify-center">
                <Activity className="h-6 w-6 text-white dark:text-slate-900" />
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                MediCare Pro
              </span>
            </Link>
            <Link href="/">
              <Button variant="ghost" className="text-slate-700 dark:text-slate-300">Home</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="min-h-[calc(100vh-4rem)] grid lg:grid-cols-2">
        {/* Left side - Branding */}
        <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 p-12">
          <div className="flex items-center gap-2">

          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-bold leading-tight text-balance text-slate-900 dark:text-white">Advanced Healthcare Management Platform</h1>
            <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed">
              Streamline patient care, monitor vital metrics, and manage your healthcare facility with confidence.
            </p>
          </div>

          <div className="text-sm text-slate-600 dark:text-slate-400">© 2025 MediCare Pro. All rights reserved.</div>
        </div>

        {/* Right side - Login Form */}
        <div className="flex items-center justify-center p-8 bg-white dark:bg-slate-900">
          <Card className="w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="space-y-1">
              <div className="flex lg:hidden items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-slate-900 dark:bg-white rounded-lg flex items-center justify-center">
                  <Activity className="h-5 w-5 text-white dark:text-slate-900" />
                </div>
                <span className="text-xl font-semibold text-slate-900 dark:text-white">MediCare Pro</span>
              </div>
            <CardTitle className="text-3xl font-bold">Welcome back</CardTitle>
            <CardDescription className="text-base">Enter your credentials to access your dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Account Type Selection */}
              <div className="space-y-2">
                <Label>Account Type</Label>
                <div className="flex gap-2 border rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setRole("patient")}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      role === "patient"
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                        : "bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    Patient
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("provider")}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      role === "provider"
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                        : "bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    Provider
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="doctor@hospital.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password" className="text-sm text-slate-900 dark:text-white hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {successMessage && (
                <Alert>
                  <AlertDescription>{successMessage}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full h-11 text-base bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
              Don't have an account?{" "}
              <Link href="/onboarding" className="text-slate-900 dark:text-white font-medium hover:underline">
                Get started
              </Link>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  )
}
