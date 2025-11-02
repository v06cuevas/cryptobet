"use server"

import { createClient } from "@/lib/supabase/server"

export interface VIPLevel {
  id: string
  level: number
  name: string
  depositRequired: number
  monthlyLimit: number
  retirosCantidad: number
  color: string
  interestRate: number
  withdrawalFee: number
  benefits: string[]
}

export interface UserVIPStatus {
  currentLevel: number
  totalDeposits: number
  nextLevel: VIPLevel | null
  progressToNext: number
}

/**
 * Get all VIP levels configuration
 */
export async function getVIPLevels(): Promise<{ success: boolean; data?: VIPLevel[]; error?: string }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.from("vip_levels").select("*").order("level", { ascending: true })

    if (error) {
      console.error("Error fetching VIP levels:", error)
      return { success: false, error: error.message }
    }

    // Transform database format to frontend format
    const vipLevels: VIPLevel[] = data.map((level) => ({
      id: level.id,
      level: level.level,
      name: level.name,
      depositRequired: Number.parseFloat(level.deposit_required),
      monthlyLimit: Number.parseFloat(level.monthly_limit),
      retirosCantidad: level.retiros_cantidad,
      color: level.color,
      interestRate: Number.parseFloat(level.interest_rate),
      withdrawalFee: Number.parseFloat(level.withdrawal_fee),
      benefits: level.benefits || [],
    }))

    return { success: true, data: vipLevels }
  } catch (error) {
    console.error("Error in getVIPLevels:", error)
    return { success: false, error: "Error al obtener niveles VIP" }
  }
}

/**
 * Get user's VIP status including current level and progress
 */
export async function getUserVIPStatus(): Promise<{ success: boolean; data?: UserVIPStatus; error?: string }> {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: "Usuario no autenticado" }
    }

    // Get user's profile with VIP level
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("vip_level")
      .eq("id", user.id)
      .single()

    if (profileError) {
      console.error("Error fetching profile:", profileError)
      return { success: false, error: profileError.message }
    }

    // Calculate total approved deposits
    const { data: deposits, error: depositsError } = await supabase
      .from("deposits")
      .select("amount")
      .eq("user_id", user.id)
      .eq("status", "approved")

    if (depositsError) {
      console.error("Error fetching deposits:", depositsError)
      return { success: false, error: depositsError.message }
    }

    const totalDeposits = deposits.reduce((sum, deposit) => sum + Number.parseFloat(deposit.amount), 0)

    // Get all VIP levels
    const vipLevelsResult = await getVIPLevels()
    if (!vipLevelsResult.success || !vipLevelsResult.data) {
      return { success: false, error: "Error al obtener niveles VIP" }
    }

    const vipLevels = vipLevelsResult.data
    const currentLevel = profile.vip_level || 0

    // Find next level
    const nextLevel = vipLevels.find((level) => level.level > currentLevel) || null

    // Calculate progress to next level
    let progressToNext = 100
    if (nextLevel) {
      const currentLevelData = vipLevels.find((level) => level.level === currentLevel)
      const currentRequired = currentLevelData?.depositRequired || 0
      const nextRequired = nextLevel.depositRequired
      const range = nextRequired - currentRequired
      const progress = totalDeposits - currentRequired
      progressToNext = Math.min(100, Math.max(0, (progress / range) * 100))
    }

    return {
      success: true,
      data: {
        currentLevel,
        totalDeposits,
        nextLevel,
        progressToNext,
      },
    }
  } catch (error) {
    console.error("Error in getUserVIPStatus:", error)
    return { success: false, error: "Error al obtener estado VIP del usuario" }
  }
}

/**
 * Manually recalculate and update user's VIP level
 * (This is also done automatically via database trigger when deposits are approved)
 */
export async function recalculateUserVIPLevel(): Promise<{ success: boolean; newLevel?: number; error?: string }> {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: "Usuario no autenticado" }
    }

    // Call the database function to calculate VIP level
    const { data, error } = await supabase.rpc("calculate_user_vip_level", {
      user_id: user.id,
    })

    if (error) {
      console.error("Error calculating VIP level:", error)
      return { success: false, error: error.message }
    }

    const newLevel = data as number

    // Update profile with new VIP level
    const { error: updateError } = await supabase.from("profiles").update({ vip_level: newLevel }).eq("id", user.id)

    if (updateError) {
      console.error("Error updating VIP level:", updateError)
      return { success: false, error: updateError.message }
    }

    return { success: true, newLevel }
  } catch (error) {
    console.error("Error in recalculateUserVIPLevel:", error)
    return { success: false, error: "Error al recalcular nivel VIP" }
  }
}
