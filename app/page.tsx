"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to login page using client-side navigation
    router.push("/login")
  }, [router])

  // Return a loading state or empty div while redirecting
  return <div></div>
}
