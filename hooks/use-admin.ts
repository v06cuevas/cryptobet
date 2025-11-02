"use client"

import { useEffect, useState } from "react"
import { isAdmin } from "@/app/actions/admin"

/**
 * Hook to check if the current user is an admin
 */
export function useAdmin() {
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkAdmin() {
      try {
        setLoading(true)
        const result = await isAdmin()

        if (result.success) {
          setIsAdminUser(result.isAdmin)
        } else {
          setError(result.error || "Error al verificar estado de administrador")
        }
      } catch (err) {
        setError("Error al verificar estado de administrador")
        console.error("Error checking admin status:", err)
      } finally {
        setLoading(false)
      }
    }

    checkAdmin()
  }, [])

  return { isAdmin: isAdminUser, loading, error }
}
