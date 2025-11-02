"use server"

import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

/**
 * Check if the current user is an admin
 */
export async function isAdmin(): Promise<{ success: boolean; isAdmin: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, isAdmin: false, error: "No autenticado" }
    }

    const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (error) {
      return { success: false, isAdmin: false, error: error.message }
    }

    return { success: true, isAdmin: profile.role === "admin" }
  } catch (error) {
    console.error("Error checking admin status:", error)
    return { success: false, isAdmin: false, error: "Error al verificar estado de administrador" }
  }
}

/**
 * Assign admin role to a user (admin only)
 */
export async function assignAdminRole(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Check if current user is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "No autenticado" }
    }

    const { data: currentProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (currentProfile?.role !== "admin") {
      return { success: false, error: "No autorizado. Solo administradores pueden asignar roles." }
    }

    // Use service role to update the user's role
    const serviceSupabase = createServiceClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { error: updateError } = await serviceSupabase
      .from("profiles")
      .update({ role: "admin", updated_at: new Date().toISOString() })
      .eq("id", userId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    revalidatePath("/admin")
    return { success: true }
  } catch (error) {
    console.error("Error assigning admin role:", error)
    return { success: false, error: "Error al asignar rol de administrador" }
  }
}

/**
 * Remove admin role from a user (admin only)
 */
export async function removeAdminRole(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Check if current user is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "No autenticado" }
    }

    // Prevent removing own admin role
    if (user.id === userId) {
      return { success: false, error: "No puedes remover tu propio rol de administrador" }
    }

    const { data: currentProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (currentProfile?.role !== "admin") {
      return { success: false, error: "No autorizado. Solo administradores pueden remover roles." }
    }

    // Use service role to update the user's role
    const serviceSupabase = createServiceClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { error: updateError } = await serviceSupabase
      .from("profiles")
      .update({ role: "user", updated_at: new Date().toISOString() })
      .eq("id", userId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    revalidatePath("/admin")
    return { success: true }
  } catch (error) {
    console.error("Error removing admin role:", error)
    return { success: false, error: "Error al remover rol de administrador" }
  }
}

/**
 * Get all admin users
 */
export async function getAllAdmins(): Promise<{
  success: boolean
  admins?: Array<{
    id: string
    name: string
    email: string
    created_at: string
  }>
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Check if current user is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "No autenticado" }
    }

    const { data: currentProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (currentProfile?.role !== "admin") {
      return { success: false, error: "No autorizado" }
    }

    // Use service role to get all admins
    const serviceSupabase = createServiceClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { data: adminProfiles, error } = await serviceSupabase
      .from("profiles")
      .select("id, name, email, created_at")
      .eq("role", "admin")
      .order("created_at", { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, admins: adminProfiles }
  } catch (error) {
    console.error("Error getting admins:", error)
    return { success: false, error: "Error al obtener administradores" }
  }
}

/**
 * Get all users with their roles (admin only)
 */
export async function getAllUsersWithRoles(): Promise<{
  success: boolean
  users?: Array<{
    id: string
    name: string
    email: string
    role: string
    status: string
    balance: number
    vip_level: number
    created_at: string
  }>
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Check if current user is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "No autenticado" }
    }

    const { data: currentProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (currentProfile?.role !== "admin") {
      return { success: false, error: "No autorizado" }
    }

    // Use service role to get all users
    const serviceSupabase = createServiceClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { data: users, error } = await serviceSupabase
      .from("profiles")
      .select("id, name, email, role, status, balance, vip_level, created_at")
      .order("created_at", { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, users }
  } catch (error) {
    console.error("Error getting users:", error)
    return { success: false, error: "Error al obtener usuarios" }
  }
}

/**
 * Update user role (admin only)
 */
export async function updateUserRole(
  userId: string,
  newRole: "user" | "admin",
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Check if current user is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "No autenticado" }
    }

    // Prevent changing own role
    if (user.id === userId) {
      return { success: false, error: "No puedes cambiar tu propio rol" }
    }

    const { data: currentProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (currentProfile?.role !== "admin") {
      return { success: false, error: "No autorizado" }
    }

    // Use service role to update the user's role
    const serviceSupabase = createServiceClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { error: updateError } = await serviceSupabase
      .from("profiles")
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq("id", userId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    revalidatePath("/admin")
    return { success: true }
  } catch (error) {
    console.error("Error updating user role:", error)
    return { success: false, error: "Error al actualizar rol de usuario" }
  }
}
