"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Activity, ArrowRight, ArrowLeft, Check } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { authAPI } from "@/lib/api"
import { Badge } from "@/components/ui/badge"

const PROVIDER_STEPS = [
  { id: 1, title: "Account Details", description: "Create your account" },
  { id: 2, title: "Professional Info", description: "Your credentials and specialty" },
  { id: 3, title: "Facility Setup", description: "Your practice location" },
]

const PATIENT_STEPS = [
  { id: 1, title: "Account Details", description: "Create your account" },
  { id: 2, title: "Profile Information", description: "Your health information" },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [accountType, setAccountType] = useState<'patient' | 'provider' | null>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    // Step 1: Account Details (both types)
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    username: "",
    // Step 2: Professional Info (provider only)
    role: "",
    specialty: "",
    licenseNumber: "",
    // Step 3: Facility Setup (provider only)
    facilityName: "",
    facilityType: "",
    department: "",
    // Step 2: Profile Info (patient only)
    age: "",
    gender: "",
    bloodType: "",
    height: "",
    weight: "",
  })

  const STEPS = accountType === 'patient' ? PATIENT_STEPS : PROVIDER_STEPS
  const totalSteps = STEPS.length

  const handleNext = () => {
    setError("")
    
    if (currentStep === 1) {
      if (!validateStep1()) {
        return
      }
    } else if (currentStep === 2 && accountType === 'provider') {
      if (!validateStep2()) {
        return
      }
    } else if (currentStep === 2 && accountType === 'patient') {
      // Patient step 2 is optional, can proceed
    } else if (currentStep === 3 && accountType === 'provider') {
      if (!validateStep3()) {
        return
      }
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    setError("")
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    } else if (currentStep === 1 && accountType) {
      // Go back to account type selection
      setAccountType(null)
      setCurrentStep(1)
    }
  }

  const validateStep1 = () => {
    if (!formData.fullName || formData.fullName.trim().length < 2) {
      setError("Please enter your full name")
      return false
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Please enter a valid email address")
      return false
    }
    if (!formData.username || formData.username.length < 3) {
      setError("Username must be at least 3 characters")
      return false
    }
    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      setError("Username can only contain letters, numbers, and underscores")
      return false
    }
    if (!formData.password || formData.password.length < 6) {
      setError("Password must be at least 6 characters")
      return false
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      setError("Password must contain at least one uppercase letter, one lowercase letter, and one number")
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return false
    }
    return true
  }

  const validateStep2 = () => {
    if (accountType === 'provider') {
      if (!formData.role) {
        setError("Professional role is required")
        return false
      }
      if (!formData.specialty) {
        setError("Specialty is required")
        return false
      }
      if (!formData.licenseNumber) {
        setError("License number is required")
        return false
      }
    }
    return true
  }

  const validateStep3 = () => {
    if (accountType === 'provider') {
      if (!formData.facilityName) {
        setError("Facility name is required")
        return false
      }
      if (!formData.facilityType) {
        setError("Facility type is required")
        return false
      }
      if (!formData.department) {
        setError("Department is required")
        return false
      }
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!accountType) {
      setError("Please select an account type")
      return
    }

    setIsLoading(true)

    try {
      // Parse full name into first and last name
      const nameParts = formData.fullName.trim().split(/\s+/)
      const firstName = nameParts[0] || ""
      const lastName = nameParts.slice(1).join(" ") || firstName

      const accountData: any = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        firstName: firstName,
        lastName: lastName,
        role: accountType === 'patient' ? 'patient' : 'provider',
      }

      // Add profile data based on account type
      if (accountType === 'patient') {
        accountData.profile = {
          age: formData.age ? parseInt(formData.age) : undefined,
          gender: formData.gender || undefined,
          bloodType: formData.bloodType || undefined,
          height: formData.height ? parseFloat(formData.height) : undefined,
          weight: formData.weight ? parseFloat(formData.weight) : undefined,
        }
      } else if (accountType === 'provider') {
        accountData.profile = {
          age: formData.age ? parseInt(formData.age) : undefined,
          gender: formData.gender || undefined,
          bloodType: formData.bloodType || undefined,
          height: formData.height ? parseFloat(formData.height) : undefined,
          weight: formData.weight ? parseFloat(formData.weight) : undefined,
          specialty: formData.specialty,
          licenseNumber: formData.licenseNumber,
          facilityName: formData.facilityName,
          facilityType: formData.facilityType,
          department: formData.department,
        }
      }

      const response = await authAPI.register(accountData)

      if (response.data.success) {
        router.push('/login?registered=true&role=' + accountType)
      }
    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message)
      } else if (err.response?.data?.errors) {
        const errors = err.response.data.errors
        setError(errors.map((e: any) => e.msg).join(", "))
      } else {
        setError('Registration failed. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError("")
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-slate-900 dark:bg-white rounded-lg flex items-center justify-center">
              <Activity className="h-6 w-6 text-white dark:text-slate-900" />
            </div>
            <span className="text-xl font-semibold text-slate-900 dark:text-white">MediCare Pro</span>
          </Link>
          <Link href="/login" className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
            Already have an account? <span className="text-slate-900 dark:text-white font-medium">Sign in</span>
          </Link>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="container mx-auto px-4 py-8 bg-white dark:bg-slate-900">
        <div className="max-w-3xl mx-auto">
          {/* Account Type Selection */}
          {!accountType && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-2xl">Choose Your Account Type</CardTitle>
                <CardDescription>Select whether you're a patient or healthcare provider</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setAccountType('patient')
                      setCurrentStep(1)
                    }}
                    className="p-6 border-2 border-slate-200 dark:border-slate-800 rounded-lg hover:border-slate-900 dark:hover:border-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    <div className="text-2xl mb-2">👤</div>
                    <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-white">Patient</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Sign up to track your health, view appointments, and connect with your healthcare providers.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountType('provider')
                      setCurrentStep(1)
                    }}
                    className="p-6 border-2 border-slate-200 dark:border-slate-800 rounded-lg hover:border-slate-900 dark:hover:border-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    <div className="text-2xl mb-2">🩺</div>
                    <h3 className="text-lg font-semibold mb-2">Healthcare Provider</h3>
                    <p className="text-sm text-muted-foreground">
                      Sign up to manage patients, appointments, and monitor health metrics for your practice.
                    </p>
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progress Steps Indicator */}
          {accountType && (
            <>
              <div className="flex items-center justify-between mb-8">
                {STEPS.map((step, index) => (
                  <div key={step.id} className="flex items-center flex-1">
                    <div className="flex flex-col items-center gap-2 flex-1">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors",
                          currentStep > step.id
                            ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                            : currentStep === step.id
                              ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                              : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400",
                        )}
                      >
                        {currentStep > step.id ? <Check className="h-5 w-5" /> : step.id}
                      </div>
                      <div className="text-center hidden sm:block">
                        <div
                          className={cn(
                            "text-sm font-medium",
                            currentStep >= step.id ? "text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {step.title}
                        </div>
                        <div className="text-xs text-muted-foreground">{step.description}</div>
                      </div>
                    </div>
                    {index < STEPS.length - 1 && (
                      <div
                        className={cn(
                          "h-0.5 flex-1 mx-2 transition-colors",
                          currentStep > step.id ? "bg-slate-900 dark:bg-white" : "bg-slate-200 dark:bg-slate-700",
                        )}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Form Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="text-2xl">{STEPS[currentStep - 1].title}</CardTitle>
                    {currentStep === 1 && (
                      <Badge variant="outline" className="text-xs">
                        {accountType === 'patient' ? 'Patient Account' : 'Healthcare Provider'}
                      </Badge>
                    )}
                  </div>
                  <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {error && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <form onSubmit={currentStep === totalSteps ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
                    {/* Step 1: Account Details (both types) */}
                    {currentStep === 1 && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="fullName">Full Name *</Label>
                          <Input
                            id="fullName"
                            placeholder={accountType === 'patient' ? "John Doe" : "Dr. Jane Smith"}
                            value={formData.fullName}
                            onChange={(e) => updateFormData("fullName", e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address *</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder={accountType === 'patient' ? "john.doe@example.com" : "jane.smith@hospital.com"}
                            value={formData.email}
                            onChange={(e) => updateFormData("email", e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="username">Username *</Label>
                          <Input
                            id="username"
                            placeholder="johndoe"
                            value={formData.username}
                            onChange={(e) => updateFormData("username", e.target.value)}
                            required
                          />
                          <p className="text-xs text-muted-foreground">Letters, numbers, and underscores only</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password">Password *</Label>
                          <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => updateFormData("password", e.target.value)}
                            required
                          />
                          <p className="text-xs text-muted-foreground">
                            Must contain uppercase, lowercase, and number
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">Confirm Password *</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => updateFormData("confirmPassword", e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    )}

                    {/* Step 2: Professional Info (provider only) */}
                    {currentStep === 2 && accountType === 'provider' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="role">Professional Role *</Label>
                          <Input
                            id="role"
                            placeholder="e.g., Physician, Nurse, Administrator"
                            value={formData.role}
                            onChange={(e) => updateFormData("role", e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="specialty">Specialty *</Label>
                          <Input
                            id="specialty"
                            placeholder="e.g., Cardiology, Emergency Medicine"
                            value={formData.specialty}
                            onChange={(e) => updateFormData("specialty", e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="licenseNumber">License Number *</Label>
                          <Input
                            id="licenseNumber"
                            placeholder="Your professional license number"
                            value={formData.licenseNumber}
                            onChange={(e) => updateFormData("licenseNumber", e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    )}

                    {/* Step 2: Profile Information (patient only) */}
                    {currentStep === 2 && accountType === 'patient' && (
                      <div className="space-y-4">
                        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                          <p className="text-sm text-blue-900 dark:text-blue-100">
                            <strong>Optional:</strong> This information helps us provide better health monitoring and personalized care. You can add or update this information anytime in your profile settings.
                          </p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="age">Age</Label>
                            <Input
                              id="age"
                              type="number"
                              min="1"
                              max="120"
                              value={formData.age}
                              onChange={(e) => updateFormData("age", e.target.value)}
                              placeholder="e.g., 25"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="gender">Gender</Label>
                            <select
                              id="gender"
                              value={formData.gender}
                              onChange={(e) => updateFormData("gender", e.target.value)}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                              <option value="">Select gender</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bloodType">Blood Type</Label>
                          <select
                            id="bloodType"
                            value={formData.bloodType}
                            onChange={(e) => updateFormData("bloodType", e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value="">Select blood type</option>
                            <option value="A+">A+</option>
                            <option value="A-">A-</option>
                            <option value="B+">B+</option>
                            <option value="B-">B-</option>
                            <option value="AB+">AB+</option>
                            <option value="AB-">AB-</option>
                            <option value="O+">O+</option>
                            <option value="O-">O-</option>
                          </select>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="height">Height (cm)</Label>
                            <Input
                              id="height"
                              type="number"
                              value={formData.height}
                              onChange={(e) => updateFormData("height", e.target.value)}
                              placeholder="e.g., 175"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="weight">Weight (kg)</Label>
                            <Input
                              id="weight"
                              type="number"
                              value={formData.weight}
                              onChange={(e) => updateFormData("weight", e.target.value)}
                              placeholder="e.g., 70"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Facility Setup (provider only) */}
                    {currentStep === 3 && accountType === 'provider' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="facilityName">Facility Name *</Label>
                          <Input
                            id="facilityName"
                            placeholder="General Hospital"
                            value={formData.facilityName}
                            onChange={(e) => updateFormData("facilityName", e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="facilityType">Facility Type *</Label>
                          <Input
                            id="facilityType"
                            placeholder="e.g., Hospital, Clinic, Private Practice"
                            value={formData.facilityType}
                            onChange={(e) => updateFormData("facilityType", e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="department">Department *</Label>
                          <Input
                            id="department"
                            placeholder="e.g., Emergency, ICU, Outpatient"
                            value={formData.department}
                            onChange={(e) => updateFormData("department", e.target.value)}
                            required
                          />
                        </div>
                        {/* Provider can also add profile info */}
                        <div className="pt-4 border-t">
                          <h3 className="text-sm font-semibold mb-4">Additional Profile Information (Optional)</h3>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="age">Age</Label>
                              <Input
                                id="age"
                                type="number"
                                min="1"
                                max="120"
                                value={formData.age}
                                onChange={(e) => updateFormData("age", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="gender">Gender</Label>
                              <select
                                id="gender"
                                value={formData.gender}
                                onChange={(e) => updateFormData("gender", e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                              >
                                <option value="">Select gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                              </select>
                            </div>
                          </div>
                          <div className="space-y-2 mt-4">
                            <Label htmlFor="bloodType">Blood Type</Label>
                            <select
                              id="bloodType"
                              value={formData.bloodType}
                              onChange={(e) => updateFormData("bloodType", e.target.value)}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                              <option value="">Select blood type</option>
                              <option value="A+">A+</option>
                              <option value="A-">A-</option>
                              <option value="B+">B+</option>
                              <option value="B-">B-</option>
                              <option value="AB+">AB+</option>
                              <option value="AB-">AB-</option>
                              <option value="O+">O+</option>
                              <option value="O-">O-</option>
                            </select>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2 mt-4">
                            <div className="space-y-2">
                              <Label htmlFor="height">Height (cm)</Label>
                              <Input
                                id="height"
                                type="number"
                                value={formData.height}
                                onChange={(e) => updateFormData("height", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="weight">Weight (kg)</Label>
                              <Input
                                id="weight"
                                type="number"
                                value={formData.weight}
                                onChange={(e) => updateFormData("weight", e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between mt-6 pt-6 border-t">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleBack} 
                        disabled={currentStep === 1 && !accountType}
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                      </Button>

                      {currentStep < totalSteps ? (
                        <Button type="button" onClick={handleNext} disabled={isLoading} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100">
                          Next
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      ) : (
                        <Button type="submit" disabled={isLoading} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100">
                          {isLoading ? "Creating Account..." : "Complete Setup"}
                          {!isLoading && <Check className="h-4 w-4 ml-2" />}
                        </Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
