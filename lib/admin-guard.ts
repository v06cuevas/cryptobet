"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

/**
 * Server-side guard to ensure user is authenticated and is an admin
 * Redirects to /login if not authenticated or /profile if not admin
 */
export async function requireAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect("/login")
  }

  const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (error || profile?.role !== "admin") {
    redirect("/profile")
  }

  return { user, profile }
}

/**
 * Check if user is admin without redirecting
 */
export async function checkAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return false
    }

    const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    return !error && profile?.role === "admin"
  } catch {
    return false
  }
}
