"use server"

import { createServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface Withdrawal {
  id: string
  user_id: string
  user_name: string
  user_email: string
  amount: number
  method: string
  method_name: string
  crypto_address: string
  crypto_type: string
  status: "pending" | "approved" | "rejected"
  created_at: string
  updated_at: string
}

export interface CreateWithdrawalInput {
  amount: number
  method: string
  method_name: string
  crypto_address: string
  crypto_type: string
}

/**
 * Create a new withdrawal request
 */
export async function createWithdrawal(input: CreateWithdrawalInput) {
  try {
    const supabase = await createServerClient()

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return {
        success: false,
        error: "No estás autenticado. Por favor inicia sesión.",
      }
    }

    // Get user profile data (name, email, and balance)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("name, email, balance")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      return {
        success: false,
        error: "No se pudo obtener tu perfil. Por favor intenta de nuevo.",
      }
    }

    // Validate amount
    if (input.amount < 10) {
      return {
        success: false,
        error: "El monto mínimo de retiro es de $10",
      }
    }

    if (profile.balance < input.amount) {
      return {
        success: false,
        error: "No tienes saldo suficiente para realizar este retiro.",
      }
    }

    // Create the withdrawal
    const { data, error } = await supabase
      .from("withdrawals")
      .insert({
        user_id: user.id,
        user_name: profile?.name || user.email?.split("@")[0] || "Usuario",
        user_email: profile?.email || user.email || "",
        amount: input.amount,
        method: input.method,
        method_name: input.method_name,
        crypto_address: input.crypto_address,
        crypto_type: input.crypto_type,
        status: "pending",
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating withdrawal:", error)
      return {
        success: false,
        error: "Error al crear la solicitud de retiro. Por favor intenta de nuevo.",
      }
    }

    const newBalance = profile.balance - input.amount
    const { error: updateError } = await supabase.from("profiles").update({ balance: newBalance }).eq("id", user.id)

    if (updateError) {
      console.error("Error updating balance:", updateError)
      // Delete the withdrawal if balance update fails
      await supabase.from("withdrawals").delete().eq("id", data.id)
      return {
        success: false,
        error: "Error al procesar el retiro. Por favor intenta de nuevo.",
      }
    }

    revalidatePath("/withdraw")
    revalidatePath("/profile")

    return {
      success: true,
      data: data as Withdrawal,
    }
  } catch (error) {
    console.error("Unexpected error creating withdrawal:", error)
    return {
      success: false,
      error: "Error inesperado. Por favor intenta de nuevo.",
    }
  }
}

/**
 * Get all withdrawals for the current user
 */
export async function getUserWithdrawals() {
  try {
    const supabase = await createServerClient()

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return {
        success: false,
        error: "No estás autenticado. Por favor inicia sesión.",
        data: [],
      }
    }

    // Get user's withdrawals
    const { data, error } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching withdrawals:", error)
      return {
        success: false,
        error: "Error al cargar los retiros.",
        data: [],
      }
    }

    return {
      success: true,
      data: data as Withdrawal[],
    }
  } catch (error) {
    console.error("Unexpected error fetching withdrawals:", error)
    return {
      success: false,
      error: "Error inesperado al cargar los retiros.",
      data: [],
    }
  }
}

/**
 * Get withdrawal statistics for the current user with rolling 30-day reset
 */
export async function getUserWithdrawalStats() {
  try {
    const supabase = await createServerClient()

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return {
        success: false,
        error: "No estás autenticado. Por favor inicia sesión.",
        data: {
          monthlyWithdrawalsUsed: 0,
          monthlyWithdrawalAmount: 0,
          withdrawalsByDate: [],
        },
      }
    }

    // Get user profile with VIP level
    const { data: profile } = await supabase.from("profiles").select("vip_level").eq("id", user.id).single()

    // Get VIP levels to find the user's withdrawal limit
    const { data: vipLevels } = await supabase
      .from("vip_levels")
      .select("level, retiros_cantidad")
      .order("level", { ascending: true })

    const userVipLevel = profile?.vip_level || 0
    const vipData = vipLevels?.find((v) => v.level === userVipLevel)
    const maxWithdrawals = vipData?.retiros_cantidad || 1

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: recentWithdrawals, error } = await supabase
      .from("withdrawals")
      .select("id, amount, created_at, status")
      .eq("user_id", user.id)
      .in("status", ["pending", "approved"])
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching withdrawal stats:", error)
      return {
        success: false,
        error: "Error al cargar estadísticas de retiros.",
        data: {
          monthlyWithdrawalsUsed: 0,
          monthlyWithdrawalAmount: 0,
          withdrawalsByDate: [],
        },
      }
    }

    // For each withdrawal used, it becomes available again 30 days after its creation date
    const now = new Date()
    let availableWithdrawals = maxWithdrawals

    // Count withdrawals that are still within their 30-day window (not yet expired)
    const withdrawalsWithinWindow = recentWithdrawals.filter((w) => {
      const withdrawalDate = new Date(w.created_at)
      const expirationDate = new Date(withdrawalDate)
      expirationDate.setDate(expirationDate.getDate() + 30)
      return expirationDate > now // Still within 30 days
    })

    availableWithdrawals = maxWithdrawals - withdrawalsWithinWindow.length

    const monthlyWithdrawalAmount = recentWithdrawals.reduce((sum, w) => sum + Number(w.amount), 0)

    return {
      success: true,
      data: {
        monthlyWithdrawalsUsed: withdrawalsWithinWindow.length,
        monthlyWithdrawalAmount,
        availableWithdrawals,
        maxWithdrawals,
        withdrawalsByDate: withdrawalsWithinWindow.map((w) => ({
          id: w.id,
          createdAt: w.created_at,
          expiresAt: new Date(new Date(w.created_at).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })),
      },
    }
  } catch (error) {
    console.error("Unexpected error fetching withdrawal stats:", error)
    return {
      success: false,
      error: "Error inesperado al cargar estadísticas.",
      data: {
        monthlyWithdrawalsUsed: 0,
        monthlyWithdrawalAmount: 0,
        withdrawalsByDate: [],
      },
    }
  }
}
