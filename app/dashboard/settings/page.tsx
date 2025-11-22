"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { User, Lock, Bell, Shield, Save, Eye, EyeOff, Mail, Phone, Calendar, Pill, AlertCircle } from "lucide-react"
import { usersAPI, consentAPI } from "@/lib/api"
import { toast } from "sonner"

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("profile")

  // Profile data
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    age: "",
    gender: "",
    bloodType: "",
    height: "",
    weight: "",
    phone: "",
    address: "",
    // Provider-specific fields
    specialty: "",
    licenseNumber: "",
    facilityName: "",
    facilityType: "",
    department: "",
  })

  // Password data
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    medicationReminders: true,
    appointmentReminders: true,
    healthAlerts: true,
    weeklyReports: false,
    marketingEmails: false,
  })

  // Consent/Privacy settings
  const [consentSettings, setConsentSettings] = useState<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user')
      if (userData) {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
        // Initialize profile data from localStorage
        setProfileData({
          firstName: parsedUser.firstName || "",
          lastName: parsedUser.lastName || "",
          email: parsedUser.email || "",
          age: parsedUser.profile?.age?.toString() || "",
          gender: parsedUser.profile?.gender || "",
          bloodType: parsedUser.profile?.bloodType || "",
          height: parsedUser.profile?.height?.toString() || "",
          weight: parsedUser.profile?.weight?.toString() || "",
          phone: parsedUser.profile?.phone || "",
          address: parsedUser.profile?.address || "",
          specialty: parsedUser.profile?.specialty || "",
          licenseNumber: parsedUser.profile?.licenseNumber || "",
          facilityName: parsedUser.profile?.facilityName || "",
          facilityType: parsedUser.profile?.facilityType || "",
          department: parsedUser.profile?.department || "",
        })
      } else {
        router.push('/login')
      }
    }
    loadProfile()
    loadConsentSettings()
  }, [router])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const res = await usersAPI.getProfile()
      if (res.data.success) {
        const userData = res.data.data.user
        setUser(userData)
        setProfileData({
          firstName: userData.firstName || "",
          lastName: userData.lastName || "",
          email: userData.email || "",
          age: userData.profile?.age?.toString() || "",
          gender: userData.profile?.gender || "",
          bloodType: userData.profile?.bloodType || "",
          height: userData.profile?.height?.toString() || "",
          weight: userData.profile?.weight?.toString() || "",
          phone: userData.profile?.phone || "",
          address: userData.profile?.address || "",
          specialty: userData.profile?.specialty || "",
          licenseNumber: userData.profile?.licenseNumber || "",
          facilityName: userData.profile?.facilityName || "",
          facilityType: userData.profile?.facilityType || "",
          department: userData.profile?.department || "",
        })
        // Update localStorage
        localStorage.setItem('user', JSON.stringify(userData))
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      toast.error('Error', { description: 'Failed to load profile data.' })
    } finally {
      setLoading(false)
    }
  }

  const loadConsentSettings = async () => {
    try {
      const res = await consentAPI.getConsent()
      if (res.data.success) {
        const consent = res.data.data.consentSettings
        setConsentSettings(consent)
        // Map consent settings to notification settings
        if (consent?.notifications) {
          setNotificationSettings({
            emailNotifications: consent.notifications.receiveAlerts !== false,
            pushNotifications: true,
            smsNotifications: false,
            medicationReminders: consent.notifications.receiveMedicationReminders !== false,
            appointmentReminders: consent.notifications.receiveAppointmentReminders !== false,
            healthAlerts: consent.notifications.receiveAlerts !== false,
            weeklyReports: consent.notifications.receiveWeeklyReports === true,
            marketingEmails: consent.notifications.receiveMarketingEmails === true,
          })
        }
      }
    } catch (error) {
      console.error('Error loading consent settings:', error)
      // Don't show error toast - consent settings might not exist yet
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const updateData: any = {
        firstName: profileData.firstName.trim(),
        lastName: profileData.lastName.trim(),
        profile: {
          age: profileData.age ? parseInt(profileData.age) : undefined,
          gender: profileData.gender || undefined,
          bloodType: profileData.bloodType || undefined,
          height: profileData.height ? parseFloat(profileData.height) : undefined,
          weight: profileData.weight ? parseFloat(profileData.weight) : undefined,
          phone: profileData.phone || undefined,
          address: profileData.address || undefined,
          // Provider-specific fields
          specialty: profileData.specialty || undefined,
          licenseNumber: profileData.licenseNumber || undefined,
          facilityName: profileData.facilityName || undefined,
          facilityType: profileData.facilityType || undefined,
          department: profileData.department || undefined,
        }
      }

      const res = await usersAPI.updateProfile(updateData)
      if (res.data.success) {
        const updatedUser = res.data.data.user
        setUser(updatedUser)
        localStorage.setItem('user', JSON.stringify(updatedUser))
        toast.success('Profile Updated', { description: 'Your profile has been updated successfully!' })
      }
    } catch (error: any) {
      console.error('Error updating profile:', error)
      const errorMessage = error.response?.data?.message || 'Failed to update profile. Please try again.'
      toast.error('Update Failed', { description: errorMessage })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Password Mismatch', { description: 'New passwords do not match.' })
      setSaving(false)
      return
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Password Too Short', { description: 'Password must be at least 8 characters long.' })
      setSaving(false)
      return
    }

    try {
      // TODO: Implement password change endpoint
      toast.info('Coming Soon', { description: 'Password change feature will be available soon. Please contact support for assistance.' })
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
    } catch (error: any) {
      console.error('Error changing password:', error)
      const errorMessage = error.response?.data?.message || 'Failed to change password. Please try again.'
      toast.error('Password Change Failed', { description: errorMessage })
    } finally {
      setSaving(false)
    }
  }

  const handleNotificationUpdate = async () => {
    setSaving(true)

    try {
      const updateData = {
        notifications: {
          receiveAlerts: notificationSettings.healthAlerts,
          receiveReminders: notificationSettings.appointmentReminders,
          receiveAppointmentReminders: notificationSettings.appointmentReminders,
          receiveMedicationReminders: notificationSettings.medicationReminders,
          receiveWeeklyReports: notificationSettings.weeklyReports,
          receiveMarketingEmails: notificationSettings.marketingEmails,
        }
      }

      await consentAPI.updateConsent(updateData)
      toast.success('Settings Saved', { description: 'Notification preferences have been saved!' })
    } catch (error: any) {
      console.error('Error updating notification settings:', error)
      const errorMessage = error.response?.data?.message || 'Failed to save notification settings.'
      toast.error('Save Failed', { description: errorMessage })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <User className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="password" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            <span className="hidden sm:inline">Password</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Privacy</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information and profile details</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={profileData.firstName}
                      onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={profileData.lastName}
                      onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      type="number"
                      min="1"
                      max="150"
                      value={profileData.age}
                      onChange={(e) => setProfileData({ ...profileData, age: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select
                      value={profileData.gender}
                      onValueChange={(value) => setProfileData({ ...profileData, gender: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="bloodType">Blood Type</Label>
                    <Select
                      value={profileData.bloodType}
                      onValueChange={(value) => setProfileData({ ...profileData, bloodType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select blood type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height">Height (cm)</Label>
                    <Input
                      id="height"
                      type="number"
                      min="30"
                      max="300"
                      value={profileData.height}
                      onChange={(e) => setProfileData({ ...profileData, height: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      min="10"
                      max="500"
                      step="0.1"
                      value={profileData.weight}
                      onChange={(e) => setProfileData({ ...profileData, weight: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={profileData.address}
                      onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                      placeholder="Street address"
                    />
                  </div>
                </div>

                {/* Provider-specific Professional Information */}
                {(user?.role === 'provider' || user?.role === 'doctor') && (
                  <div className="pt-6 border-t space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Professional Information</h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="specialty">Specialty</Label>
                          <Input
                            id="specialty"
                            value={profileData.specialty}
                            onChange={(e) => setProfileData({ ...profileData, specialty: e.target.value })}
                            placeholder="e.g., Cardiology, Emergency Medicine"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="licenseNumber">License Number</Label>
                          <Input
                            id="licenseNumber"
                            value={profileData.licenseNumber}
                            onChange={(e) => setProfileData({ ...profileData, licenseNumber: e.target.value })}
                            placeholder="Your professional license number"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="facilityName">Facility Name</Label>
                          <Input
                            id="facilityName"
                            value={profileData.facilityName}
                            onChange={(e) => setProfileData({ ...profileData, facilityName: e.target.value })}
                            placeholder="e.g., General Hospital"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="facilityType">Facility Type</Label>
                          <Input
                            id="facilityType"
                            value={profileData.facilityType}
                            onChange={(e) => setProfileData({ ...profileData, facilityType: e.target.value })}
                            placeholder="e.g., Hospital, Clinic, Private Practice"
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="department">Department</Label>
                          <Input
                            id="department"
                            value={profileData.department}
                            onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                            placeholder="e.g., Emergency, ICU, Outpatient"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Password Tab */}
        <TabsContent value="password" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your password to keep your account secure</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password *</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showPasswords.current ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      required
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    >
                      {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password *</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPasswords.new ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      required
                      minLength={8}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    >
                      {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Password must be at least 8 characters long</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showPasswords.confirm ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      required
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    >
                      {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={saving}>
                    <Lock className="mr-2 h-4 w-4" />
                    {saving ? 'Changing...' : 'Change Password'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Manage how you receive notifications and alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="text-base font-medium">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, emailNotifications: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="text-base font-medium">Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive push notifications in browser</p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationSettings.pushNotifications}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, pushNotifications: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="text-base font-medium">SMS Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive notifications via SMS</p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationSettings.smsNotifications}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, smsNotifications: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Pill className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="text-base font-medium">Medication Reminders</Label>
                      <p className="text-sm text-muted-foreground">Get reminders for medications</p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationSettings.medicationReminders}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, medicationReminders: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="text-base font-medium">Appointment Reminders</Label>
                      <p className="text-sm text-muted-foreground">Get reminders for appointments</p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationSettings.appointmentReminders}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, appointmentReminders: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="text-base font-medium">Health Alerts</Label>
                      <p className="text-sm text-muted-foreground">Get alerts for health issues</p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationSettings.healthAlerts}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, healthAlerts: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="text-base font-medium">Weekly Reports</Label>
                      <p className="text-sm text-muted-foreground">Receive weekly health summary reports</p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationSettings.weeklyReports}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, weeklyReports: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="text-base font-medium">Marketing Emails</Label>
                      <p className="text-sm text-muted-foreground">Receive promotional and marketing emails</p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationSettings.marketingEmails}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, marketingEmails: checked })
                    }
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={handleNotificationUpdate} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Preferences'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>Manage your privacy and data sharing preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">Data Sharing</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Control how your health data is shared with healthcare providers and researchers.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => router.push('/dashboard/alerts')}
                  >
                    Manage Consent Settings
                  </Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">Account Security</h3>
                  <p className="text-sm text-muted-foreground">
                    Your account is secured with JWT authentication and encrypted password storage.
                    All data is encrypted in transit and at rest.
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">Data Export</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Download a copy of your health data and records.
                  </p>
                  <Button variant="outline" disabled>
                    Export Data (Coming Soon)
                  </Button>
                </div>

                <div className="p-4 border rounded-lg border-destructive/50">
                  <h3 className="font-medium mb-2 text-destructive">Danger Zone</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  <Button variant="destructive" disabled>
                    Delete Account (Coming Soon)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

