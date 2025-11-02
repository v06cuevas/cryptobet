"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface ReferralItem {
  id: string
  user_id: string
  referred_user_id: string
  referred_user_name: string
  referred_user_email: string
  amount: number
  status: "pending" | "available" | "withdrawn"
  deposit_date: string | null
  available_date: string | null
  join_date: string
  created_at: string
  updated_at: string
}

export interface WithdrawalItem {
  id: string
  user_id: string
  amount: number
  amount_after_fee: number | null
  fee_percentage: number | null
  status: "processing" | "completed" | "failed"
  type: "withdrawal" | "transfer"
  method: string | null
  crypto_address: string | null
  vip_level: number
  created_at: string
  updated_at: string
}

// Get all referrals for the current user
export async function getUserReferrals() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { data, error } = await supabase
    .from("referrals")
    .select("*")
    .eq("user_id", user.id)
    .order("join_date", { ascending: true })

  if (error) {
    console.error("Error fetching referrals:", error)
    return { error: error.message }
  }

  return { data }
}

// Get referral statistics
export async function getReferralStats() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { data: referrals, error } = await supabase.from("referrals").select("*").eq("user_id", user.id)

  if (error) {
    console.error("Error fetching referral stats:", error)
    return { error: error.message }
  }

  // Calculate statistics
  const totalReferrals = referrals?.length || 0
  const activeReferrals = referrals?.filter((r) => r.status === "available").length || 0
  const pendingReferrals = referrals?.filter((r) => r.status === "pending").length || 0

  const totalAvailableAmount =
    referrals?.filter((r) => r.status === "available").reduce((sum, r) => sum + Number.parseFloat(r.amount), 0) || 0

  const totalPendingAmount =
    referrals?.filter((r) => r.status === "pending").reduce((sum, r) => sum + Number.parseFloat(r.amount), 0) || 0

  const totalEarnings = referrals?.reduce((sum, r) => sum + Number.parseFloat(r.amount), 0) || 0

  // Calculate monthly earnings (current month)
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  const monthlyEarnings =
    referrals
      ?.filter((r) => {
        if (!r.deposit_date) return false
        const depositDate = new Date(r.deposit_date)
        return depositDate.getMonth() === currentMonth && depositDate.getFullYear() === currentYear
      })
      .reduce((sum, r) => sum + Number.parseFloat(r.amount), 0) || 0

  return {
    data: {
      totalReferrals,
      activeReferrals,
      pendingReferrals,
      totalAvailableAmount,
      totalPendingAmount,
      totalEarnings,
      monthlyEarnings,
    },
  }
}

// Create or update a referral
export async function createOrUpdateReferral(data: {
  referred_user_id: string
  referred_user_name: string
  referred_user_email: string
  amount: number
  deposit_date?: string
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Check if referral already exists
  const { data: existing } = await supabase
    .from("referrals")
    .select("*")
    .eq("user_id", user.id)
    .eq("referred_user_id", data.referred_user_id)
    .single()

  if (existing) {
    // Update existing referral
    const { data: updated, error } = await supabase
      .from("referrals")
      .update({
        amount: data.amount,
        deposit_date: data.deposit_date || existing.deposit_date,
        status: "pending",
      })
      .eq("id", existing.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating referral:", error)
      return { error: error.message }
    }

    revalidatePath("/referrals")
    return { data: updated }
  } else {
    // Create new referral
    const { data: created, error } = await supabase
      .from("referrals")
      .insert({
        user_id: user.id,
        referred_user_id: data.referred_user_id,
        referred_user_name: data.referred_user_name,
        referred_user_email: data.referred_user_email,
        amount: data.amount,
        deposit_date: data.deposit_date,
        status: "pending",
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating referral:", error)
      return { error: error.message }
    }

    revalidatePath("/referrals")
    return { data: created }
  }
}

// Update referral statuses (pending -> available after 14 days)
export async function updateReferralStatuses() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Call the database function to update statuses
  const { error } = await supabase.rpc("update_referral_status")

  if (error) {
    console.error("Error updating referral statuses:", error)
    return { error: error.message }
  }

  revalidatePath("/referrals")
  return { success: true }
}

// Get withdrawal history
export async function getWithdrawalHistory() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { data, error } = await supabase
    .from("referral_withdrawals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching withdrawal history:", error)
    return { error: error.message }
  }

  return { data }
}

// Create a withdrawal request
export async function createWithdrawal(data: {
  amount: number
  type: "withdrawal" | "transfer"
  method?: string
  crypto_address?: string
  fee_percentage: number
  vip_level: number
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const amount_after_fee = data.amount * (1 - data.fee_percentage / 100)

  const { data: withdrawal, error } = await supabase
    .from("referral_withdrawals")
    .insert({
      user_id: user.id,
      amount: data.amount,
      amount_after_fee,
      fee_percentage: data.fee_percentage,
      status: data.type === "transfer" ? "completed" : "processing",
      type: data.type,
      method: data.method,
      crypto_address: data.crypto_address,
      vip_level: data.vip_level,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating withdrawal:", error)
    return { error: error.message }
  }

  // Mark referrals as withdrawn
  const { error: updateError } = await supabase
    .from("referrals")
    .update({ status: "withdrawn" })
    .eq("user_id", user.id)
    .eq("status", "available")

  if (updateError) {
    console.error("Error updating referral status:", updateError)
  }

  // If it's a transfer, update the user's balance in profiles
  if (data.type === "transfer") {
    const { error: balanceError } = await supabase.rpc("increment_balance", {
      user_id: user.id,
      amount: data.amount,
    })

    if (balanceError) {
      console.error("Error updating balance:", balanceError)
    }
  }

  revalidatePath("/referrals")
  return { data: withdrawal }
}
