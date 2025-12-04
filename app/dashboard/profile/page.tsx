"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Camera, X, Loader2, Save } from "lucide-react"
import { usersAPI } from "@/lib/api"
import { toast } from "sonner"
import { getBackendBaseUrl } from "@/lib/utils"

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user')
      if (userData) {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
        if (parsedUser.profilePicture) {
          // If profilePicture is a relative path, make it absolute
          const pictureUrl = parsedUser.profilePicture.startsWith('http')
            ? parsedUser.profilePicture
            : `${getBackendBaseUrl()}${parsedUser.profilePicture}`
          setPreview(pictureUrl)
        }
      } else {
        router.push('/login')
      }
    }
    loadProfile()
  }, [router])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const res = await usersAPI.getProfile()
      if (res.data.success) {
        const userData = res.data.data.user
        setUser(userData)
        localStorage.setItem('user', JSON.stringify(userData))
        if (userData.profilePicture) {
          const pictureUrl = userData.profilePicture.startsWith('http')
            ? userData.profilePicture
            : `${getBackendBaseUrl()}${userData.profilePicture}`
          setPreview(pictureUrl)
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      toast.error('Error', { description: 'Failed to load profile data.' })
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File Too Large', { description: 'Profile picture must be less than 5MB' })
        return
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        toast.error('Invalid File Type', { description: 'Please upload an image file (JPEG, PNG, GIF, or WebP)' })
        return
      }

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      toast.error('No File Selected', { description: 'Please select an image to upload' })
      return
    }

    setUploading(true)
    try {
      const res = await usersAPI.uploadProfilePicture(file)
      if (res.data.success) {
        const updatedUser = res.data.data.user
        setUser(updatedUser)
        localStorage.setItem('user', JSON.stringify(updatedUser))
        
        // Update preview with new image URL
        const pictureUrl = res.data.data.profilePicture || updatedUser.profilePicture
        setPreview(pictureUrl)
        
        toast.success('Profile Picture Updated', { description: 'Your profile picture has been updated successfully!' })
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    } catch (error: any) {
      console.error('Error uploading profile picture:', error)
      const errorMessage = error.response?.data?.message || 'Failed to upload profile picture. Please try again.'
      toast.error('Upload Failed', { description: errorMessage })
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async () => {
    try {
      const res = await usersAPI.deleteProfilePicture()
      if (res.data.success) {
        const updatedUser = res.data.data.user
        setUser(updatedUser)
        localStorage.setItem('user', JSON.stringify(updatedUser))
        setPreview(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        toast.success('Profile Picture Removed', { description: 'Your profile picture has been removed.' })
      }
    } catch (error: any) {
      console.error('Error removing profile picture:', error)
      const errorMessage = error.response?.data?.message || 'Failed to remove profile picture. Please try again.'
      toast.error('Remove Failed', { description: errorMessage })
    }
  }

  const handleCancel = () => {
    // Reset preview to current profile picture
    if (user?.profilePicture) {
      const pictureUrl = user.profilePicture.startsWith('http')
        ? user.profilePicture
        : `${getBackendBaseUrl()}${user.profilePicture}`
      setPreview(pictureUrl)
    } else {
      setPreview(null)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
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
    const name = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username || user.email || 'User'
    if (user.role === 'doctor' || user.role === 'provider') {
      return `Dr. ${name}`
    }
    return name
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  const hasNewImage = fileInputRef.current?.files?.[0] && preview && preview.startsWith('data:')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Manage your profile picture and information</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Picture Section */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Profile Picture</CardTitle>
            <CardDescription>Upload or update your profile picture</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={preview || undefined} alt={getUserName()} />
                  <AvatarFallback className="text-2xl">{getUserInitials()}</AvatarFallback>
                </Avatar>
                {preview && (
                  <div className="absolute -bottom-2 -right-2">
                    <div className="bg-green-500 rounded-full p-1 border-2 border-background">
                      <Camera className="h-4 w-4 text-white" />
                    </div>
                  </div>
                )}
              </div>

              <div className="w-full space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="profile-picture-input"
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  {preview ? 'Change Picture' : 'Upload Picture'}
                </Button>

                {hasNewImage && (
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={handleUpload}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      disabled={uploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {preview && !hasNewImage && (
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={handleRemove}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Remove Picture
                  </Button>
                )}
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Recommended: Square image, at least 400x400 pixels. Max file size: 5MB
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Profile Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Your account details and information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-base font-medium">{getUserName()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-base">{user?.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Username</label>
                  <p className="text-base">{user?.username || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Role</label>
                  <p className="text-base capitalize">{user?.role || 'N/A'}</p>
                </div>
                {user?.profile?.age && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Age</label>
                    <p className="text-base">{user.profile.age} years</p>
                  </div>
                )}
                {user?.profile?.gender && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Gender</label>
                    <p className="text-base capitalize">{user.profile.gender}</p>
                  </div>
                )}
                {user?.profile?.bloodType && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Blood Type</label>
                    <p className="text-base">{user.profile.bloodType}</p>
                  </div>
                )}
                {user?.profile?.height && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Height</label>
                    <p className="text-base">{user.profile.height} cm</p>
                  </div>
                )}
                {user?.profile?.weight && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Weight</label>
                    <p className="text-base">{user.profile.weight} kg</p>
                  </div>
                )}
              </div>

              {/* Provider-specific Professional Information */}
              {(user?.role === 'provider' || user?.role === 'doctor') && (
                <div className="pt-6 border-t space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Professional Information</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {user?.profile?.specialty && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Specialty</label>
                          <p className="text-base">{user.profile.specialty}</p>
                        </div>
                      )}
                      {user?.profile?.licenseNumber && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">License Number</label>
                          <p className="text-base font-mono text-sm">{user.profile.licenseNumber}</p>
                        </div>
                      )}
                      {user?.profile?.facilityName && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Facility Name</label>
                          <p className="text-base">{user.profile.facilityName}</p>
                        </div>
                      )}
                      {user?.profile?.facilityType && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Facility Type</label>
                          <p className="text-base">{user.profile.facilityType}</p>
                        </div>
                      )}
                      {user?.profile?.department && (
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium text-muted-foreground">Department</label>
                          <p className="text-base">{user.profile.department}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard/settings')}
                >
                  <User className="mr-2 h-4 w-4" />
                  Edit Profile Information
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

