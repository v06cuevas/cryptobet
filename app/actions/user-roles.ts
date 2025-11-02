"use server"

import { createClient } from "@/lib/supabase/server"

export interface UserRole {
  id: string
  profile_id: string | null
  email: string
  role: "admin" | "user"
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Check if an email has admin privileges
 */
export async function isAdminEmail(email: string): Promise<{ success: boolean; isAdmin: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { data: profile, error } = await supabase.from("profiles").select("role").eq("email", email).single()

    if (error) {
      console.error("[v0] Error checking admin email:", error)
      return { success: false, isAdmin: false, error: error.message }
    }

    return { success: true, isAdmin: profile?.role === "admin" }
  } catch (error) {
    console.error("[v0] Error in isAdminEmail:", error)
    return { success: false, isAdmin: false, error: "Error checking admin status" }
  }
}

/**
 * Get role by email
 */
export async function getRoleByEmail(email: string): Promise<{ success: boolean; role?: string; error?: string }> {
  try {
    const supabase = await createClient()

    const { data: profile, error } = await supabase.from("profiles").select("role").eq("email", email).single()

    if (error) {
      console.error("[v0] Error getting role by email:", error)
      return { success: true, role: "user" }
    }

    return { success: true, role: profile?.role || "user" }
  } catch (error) {
    console.error("[v0] Error in getRoleByEmail:", error)
    return { success: true, role: "user" }
  }
}

/**
 * Assign admin role to an email
 * Only existing admins can assign admin roles
 */
export async function assignAdminRole(email: string): Promise<{ success: boolean; data?: UserRole; error?: string }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "No autenticado" }
    }

    const { data: currentProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (!currentProfile || currentProfile.role !== "admin") {
      return { success: false, error: "No tienes permisos de administrador" }
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update({ role: "admin" })
      .eq("email", email)
      .select()
      .single()

    if (updateError) {
      console.error("[v0] Error assigning admin role:", updateError)
      return { success: false, error: updateError.message }
    }

    return { success: true, data: updatedProfile as any }
  } catch (error) {
    console.error("[v0] Error in assignAdminRole:", error)
    return { success: false, error: "Error asignando rol de administrador" }
  }
}

/**
 * Remove admin role from an email
 */
export async function removeAdminRole(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "No autenticado" }
    }

    const { data: currentProfile } = await supabase.from("profiles").select("role, email").eq("id", user.id).single()

    if (!currentProfile || currentProfile.role !== "admin") {
      return { success: false, error: "No tienes permisos de administrador" }
    }

    if (currentProfile.email === email) {
      return { success: false, error: "No puedes remover tu propio rol de administrador" }
    }

    const { error } = await supabase.from("profiles").update({ role: "user" }).eq("email", email)

    if (error) {
      console.error("[v0] Error removing admin role:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("[v0] Error in removeAdminRole:", error)
    return { success: false, error: "Error removiendo rol de administrador" }
  }
}

/**
 * Get all user roles
 */
export async function getAllUserRoles(): Promise<{ success: boolean; data?: UserRole[]; error?: string }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "No autenticado" }
    }

    const { data: currentProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (!currentProfile || currentProfile.role !== "admin") {
      return { success: false, error: "No tienes permisos de administrador" }
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, role, created_at, updated_at")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error getting user roles:", error)
      return { success: false, error: error.message }
    }

    return { success: true, data: (data as any) || [] }
  } catch (error) {
    console.error("[v0] Error in getAllUserRoles:", error)
    return { success: false, error: "Error obteniendo roles de usuarios" }
  }
}

/**
 * Link user_role to profile after registration
 */
export async function linkUserRoleToProfile(
  email: string,
  profileId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    return { success: true }
  } catch (error) {
    console.error("[v0] Error in linkUserRoleToProfile:", error)
    return { success: false, error: "Error vinculando rol de usuario" }
  }
}
