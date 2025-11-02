"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface Bet {
  id: string
  user_id: string
  user_name: string
  asset: string
  amount: number
  shares: number
  price: number
  type: string
  direction: string
  status: string
  is_processed: boolean
  created_at: string
  updated_at: string
  cancelled_at: string | null
}

export interface BetStats {
  totalBets: number
  totalAmount: number
  activeBets: number
  cancelledBets: number
}

// Create a new bet
export async function createBet(betData: {
  asset: string
  amount: number
  shares: number
  price: number
  type: string
  direction: string
}) {
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

    // Get user profile for name and balance
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("name, balance")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      return { success: false, error: "Perfil de usuario no encontrado" }
    }

    if (profile.balance < betData.amount) {
      return { success: false, error: "Saldo insuficiente" }
    }

    const { error: balanceError } = await supabase.rpc("increment_balance", {
      user_id: user.id,
      amount: -betData.amount, // Negative amount to decrease balance
    })

    if (balanceError) {
      console.error("Error updating balance:", balanceError)
      return { success: false, error: "Error al actualizar el saldo" }
    }

    // Insert bet
    const { data, error } = await supabase
      .from("bets")
      .insert({
        user_id: user.id,
        user_name: profile.name,
        asset: betData.asset,
        amount: betData.amount,
        shares: betData.shares,
        price: betData.price,
        type: betData.type,
        direction: betData.direction,
        status: "pending",
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating bet:", error)
      await supabase.rpc("increment_balance", {
        user_id: user.id,
        amount: betData.amount,
      })
      return { success: false, error: "Error al crear la apuesta" }
    }

    revalidatePath("/purchases")
    revalidatePath("/profile")
    return { success: true, data }
  } catch (error) {
    console.error("Error in createBet:", error)
    return { success: false, error: "Error al crear la apuesta" }
  }
}

// Get user's bets
export async function getUserBets() {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: "Usuario no autenticado", data: [] }
    }

    // Get bets
    const { data, error } = await supabase
      .from("bets")
      .select("*")
      .eq("user_id", user.id)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching bets:", error)
      return { success: false, error: "Error al obtener las apuestas", data: [] }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error("Error in getUserBets:", error)
    return { success: false, error: "Error al obtener las apuestas", data: [] }
  }
}

// Cancel a bet
export async function cancelBet(betId: string) {
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

    // Get the bet to verify ownership and check if it's cancelable
    const { data: bet, error: betError } = await supabase
      .from("bets")
      .select("*")
      .eq("id", betId)
      .eq("user_id", user.id)
      .single()

    if (betError || !bet) {
      return { success: false, error: "Apuesta no encontrada" }
    }

    // Check if bet is already processed
    if (bet.is_processed) {
      return { success: false, error: "Esta apuesta ya ha sido procesada y no puede ser cancelada" }
    }

    // Check if bet is within 24 hours
    const betDate = new Date(bet.created_at)
    const now = new Date()
    const hoursDiff = (now.getTime() - betDate.getTime()) / (1000 * 60 * 60)

    if (hoursDiff > 24) {
      return { success: false, error: "Esta apuesta ya no puede ser cancelada (pasaron más de 24 horas)" }
    }

    // Check scheduled processing time
    const { data: schedule } = await supabase
      .from("bet_processing_schedule")
      .select("*")
      .eq("is_processed", false)
      .order("scheduled_date", { ascending: true })
      .order("scheduled_time", { ascending: true })
      .limit(1)
      .single()

    if (schedule) {
      const scheduledDateTime = new Date(`${schedule.scheduled_date}T${schedule.scheduled_time}`)
      const minutesUntilProcessing = (scheduledDateTime.getTime() - now.getTime()) / (1000 * 60)

      if (minutesUntilProcessing < 5) {
        return { success: false, error: "El período de apuestas está cerrado (menos de 5 minutos para el cierre)" }
      }

      if (scheduledDateTime <= now) {
        return { success: false, error: "El período de apuestas ya ha cerrado" }
      }
    }

    // Update bet status to cancelled
    const { error: updateError } = await supabase
      .from("bets")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", betId)

    if (updateError) {
      console.error("Error cancelling bet:", updateError)
      return { success: false, error: "Error al cancelar la apuesta" }
    }

    // Return the bet amount to user's balance
    const { error: balanceError } = await supabase.rpc("increment_balance", {
      user_id: user.id,
      amount: bet.amount,
    })

    if (balanceError) {
      console.error("Error updating balance:", balanceError)
      // Rollback the cancellation
      await supabase.from("bets").update({ status: "pending", cancelled_at: null }).eq("id", betId)
      return { success: false, error: "Error al actualizar el saldo" }
    }

    revalidatePath("/purchases")
    return { success: true, refundAmount: bet.amount }
  } catch (error) {
    console.error("Error in cancelBet:", error)
    return { success: false, error: "Error al cancelar la apuesta" }
  }
}

// Get bet statistics for user
export async function getBetStats(): Promise<{ success: boolean; data?: BetStats; error?: string }> {
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

    // Get all bets for user
    const { data: bets, error } = await supabase.from("bets").select("*").eq("user_id", user.id)

    if (error) {
      console.error("Error fetching bet stats:", error)
      return { success: false, error: "Error al obtener estadísticas" }
    }

    const stats: BetStats = {
      totalBets: bets?.length || 0,
      totalAmount: bets?.reduce((sum, bet) => sum + Number(bet.amount), 0) || 0,
      activeBets: bets?.filter((bet) => bet.status === "pending").length || 0,
      cancelledBets: bets?.filter((bet) => bet.status === "cancelled").length || 0,
    }

    return { success: true, data: stats }
  } catch (error) {
    console.error("Error in getBetStats:", error)
    return { success: false, error: "Error al obtener estadísticas" }
  }
}

// Get scheduled processing time
export async function getScheduledProcessingTime() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("bet_processing_schedule")
      .select("*")
      .eq("is_processed", false)
      .order("scheduled_date", { ascending: true })
      .order("scheduled_time", { ascending: true })
      .limit(1)
      .single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "no rows returned"
      console.error("Error fetching schedule:", error)
      return { success: false, error: "Error al obtener el horario programado" }
    }

    return { success: true, data: data || null }
  } catch (error) {
    console.error("Error in getScheduledProcessingTime:", error)
    return { success: false, error: "Error al obtener el horario programado" }
  }
}
