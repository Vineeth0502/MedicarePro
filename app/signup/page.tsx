"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function SignupPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to onboarding page
    router.replace('/onboarding')
  }, [router])

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <p className="text-muted-foreground">Redirecting to signup...</p>
      </div>
    </div>
  )
}
