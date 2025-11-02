"use server"

import { createServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

/**
 * Get all pending deposits (admin only)
 */
export async function getPendingDeposits() {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: "No autenticado", data: [] }
    }

    const { data, error } = await supabase
      .from("deposits")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching pending deposits:", error)
      return { success: false, error: "Error al cargar depósitos pendientes", data: [] }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error("[v0] Unexpected error in getPendingDeposits:", error)
    return { success: false, error: "Error inesperado", data: [] }
  }
}

/**
 * Get all pending withdrawals (admin only)
 */
export async function getPendingWithdrawals() {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: "No autenticado", data: [] }
    }

    const { data, error } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching pending withdrawals:", error)
      return { success: false, error: "Error al cargar retiros pendientes", data: [] }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error("[v0] Unexpected error in getPendingWithdrawals:", error)
    return { success: false, error: "Error inesperado", data: [] }
  }
}

/**
 * Get transaction history (admin sees all, users see their own)
 */
export async function getTransactionHistory() {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: "No autenticado", data: [] }
    }

    const { data, error } = await supabase.from("transactions").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching transaction history:", error)
      return { success: false, error: "Error al cargar historial", data: [] }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error("[v0] Unexpected error in getTransactionHistory:", error)
    return { success: false, error: "Error inesperado", data: [] }
  }
}

/**
 * Approve a deposit (admin only)
 */
export async function approveDeposit(depositId: string) {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: "No autenticado" }
    }

    // Get the deposit details
    const { data: deposit, error: depositError } = await supabase
      .from("deposits")
      .select("*")
      .eq("id", depositId)
      .single()

    if (depositError || !deposit) {
      console.error("[v0] Error fetching deposit:", depositError)
      return { success: false, error: "Depósito no encontrado" }
    }

    // Update deposit status
    const { error: updateError } = await supabase
      .from("deposits")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", depositId)

    if (updateError) {
      console.error("[v0] Error updating deposit:", updateError)
      return { success: false, error: "Error al aprobar depósito" }
    }

    // Add to transaction history
    const { error: transactionError } = await supabase.from("transactions").insert({
      user_id: deposit.user_id,
      user_name: deposit.user_name,
      type: "deposit",
      amount: deposit.amount,
      method: deposit.method,
      method_name: deposit.method_name,
      status: "approved",
      reference_id: deposit.id,
      reference_table: "deposits",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })

    if (transactionError) {
      console.error("[v0] Error creating transaction record:", transactionError)
    }

    // Update user balance
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("balance")
      .eq("id", deposit.user_id)
      .single()

    if (!profileError && profile) {
      const newBalance = (profile.balance || 0) + deposit.amount
      await supabase.from("profiles").update({ balance: newBalance }).eq("id", deposit.user_id)
    }

    revalidatePath("/transacciones")
    revalidatePath("/profile")
    revalidatePath("/deposit")

    return { success: true, message: "Depósito aprobado correctamente" }
  } catch (error) {
    console.error("[v0] Unexpected error in approveDeposit:", error)
    return { success: false, error: "Error inesperado" }
  }
}

/**
 * Reject a deposit (admin only)
 */
export async function rejectDeposit(depositId: string) {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: "No autenticado" }
    }

    // Get the deposit details
    const { data: deposit, error: depositError } = await supabase
      .from("deposits")
      .select("*")
      .eq("id", depositId)
      .single()

    if (depositError || !deposit) {
      return { success: false, error: "Depósito no encontrado" }
    }

    // Update deposit status
    const { error: updateError } = await supabase
      .from("deposits")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", depositId)

    if (updateError) {
      console.error("[v0] Error updating deposit:", updateError)
      return { success: false, error: "Error al rechazar depósito" }
    }

    // Add to transaction history
    await supabase.from("transactions").insert({
      user_id: deposit.user_id,
      user_name: deposit.user_name,
      type: "deposit",
      amount: deposit.amount,
      method: deposit.method,
      method_name: deposit.method_name,
      status: "rejected",
      reference_id: deposit.id,
      reference_table: "deposits",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })

    revalidatePath("/transacciones")
    revalidatePath("/profile")

    return { success: true, message: "Depósito rechazado correctamente" }
  } catch (error) {
    console.error("[v0] Unexpected error in rejectDeposit:", error)
    return { success: false, error: "Error inesperado" }
  }
}

/**
 * Approve a withdrawal (admin only)
 */
export async function approveWithdrawal(withdrawalId: string) {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: "No autenticado" }
    }

    // Get the withdrawal details
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("id", withdrawalId)
      .single()

    if (withdrawalError || !withdrawal) {
      return { success: false, error: "Retiro no encontrado" }
    }

    // Update withdrawal status
    const { error: updateError } = await supabase
      .from("withdrawals")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", withdrawalId)

    if (updateError) {
      console.error("[v0] Error updating withdrawal:", updateError)
      return { success: false, error: "Error al aprobar retiro" }
    }

    // Add to transaction history
    await supabase.from("transactions").insert({
      user_id: withdrawal.user_id,
      user_name: withdrawal.user_name,
      user_email: withdrawal.user_email,
      type: "withdrawal",
      amount: withdrawal.amount,
      method: withdrawal.method,
      method_name: withdrawal.method_name,
      status: "approved",
      reference_id: withdrawal.id,
      reference_table: "withdrawals",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })

    revalidatePath("/transacciones")
    revalidatePath("/profile")
    revalidatePath("/withdraw")

    return { success: true, message: "Retiro aprobado correctamente" }
  } catch (error) {
    console.error("[v0] Unexpected error in approveWithdrawal:", error)
    return { success: false, error: "Error inesperado" }
  }
}

/**
 * Reject a withdrawal (admin only)
 */
export async function rejectWithdrawal(withdrawalId: string) {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: "No autenticado" }
    }

    // Get the withdrawal details
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("id", withdrawalId)
      .single()

    if (withdrawalError || !withdrawal) {
      return { success: false, error: "Retiro no encontrado" }
    }

    // Update withdrawal status
    const { error: updateError } = await supabase
      .from("withdrawals")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", withdrawalId)

    if (updateError) {
      console.error("[v0] Error updating withdrawal:", updateError)
      return { success: false, error: "Error al rechazar retiro" }
    }

    // Add to transaction history
    await supabase.from("transactions").insert({
      user_id: withdrawal.user_id,
      user_name: withdrawal.user_name,
      user_email: withdrawal.user_email,
      type: "withdrawal",
      amount: withdrawal.amount,
      method: withdrawal.method,
      method_name: withdrawal.method_name,
      status: "rejected",
      reference_id: withdrawal.id,
      reference_table: "withdrawals",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })

    // Refund the amount to user's balance
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("balance")
      .eq("id", withdrawal.user_id)
      .single()

    if (!profileError && profile) {
      const newBalance = (profile.balance || 0) + withdrawal.amount
      await supabase.from("profiles").update({ balance: newBalance }).eq("id", withdrawal.user_id)
    }

    revalidatePath("/transacciones")
    revalidatePath("/profile")

    return { success: true, message: "Retiro rechazado y saldo devuelto" }
  } catch (error) {
    console.error("[v0] Unexpected error in rejectWithdrawal:", error)
    return { success: false, error: "Error inesperado" }
  }
}
