"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    const currentUser = localStorage.getItem("user")

    if (!currentUser) {
      // Not logged in, redirect to login
      router.push("/login")
      return
    }

    try {
      const user = JSON.parse(currentUser)

      // If admin is required, check role
      if (requireAdmin && user.role !== "admin") {
        // Not admin, redirect to markets
        router.push("/markets")
        return
      }

      // User is authorized
      setIsAuthorized(true)
    } catch (error) {
      // Invalid user data, redirect to login
      router.push("/login")
    }
  }, [router, requireAdmin])

  // Show nothing while checking authorization
  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return <>{children}</>
}
