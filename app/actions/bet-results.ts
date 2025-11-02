"use server"

import { createServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getBetProcessingSchedule() {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from("bet_processing_schedule")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching bet processing schedule:", error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function updateBetProcessingSchedule(
  scheduledDate: string,
  scheduledTime: string,
  winningDirection: string,
) {
  const supabase = await createServerClient()

  // Check if a schedule already exists
  const { data: existing } = await supabase
    .from("bet_processing_schedule")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  const scheduleData = {
    scheduled_date: scheduledDate,
    scheduled_time: scheduledTime,
    winning_direction: winningDirection,
    is_processed: false,
  }

  let result
  if (existing) {
    // Update existing schedule
    result = await supabase.from("bet_processing_schedule").update(scheduleData).eq("id", existing.id).select()
  } else {
    // Insert new schedule
    result = await supabase.from("bet_processing_schedule").insert(scheduleData).select()
  }

  if (result.error) {
    console.error("Error updating bet processing schedule:", result.error)
    return { success: false, error: result.error.message }
  }

  revalidatePath("/apuestas")
  return { success: true, data: result.data[0] }
}

export async function getAllBetsForAdmin() {
  const supabase = await createServerClient()

  // Fetch all bets
  const { data: bets, error: betsError } = await supabase
    .from("bets")
    .select("*")
    .order("created_at", { ascending: false })

  if (betsError) {
    console.error("Error fetching bets:", betsError)
    return { success: false, error: betsError.message }
  }

  // Fetch all profiles
  const { data: profiles, error: profilesError } = await supabase.from("profiles").select("id, name, email, vip_level")

  if (profilesError) {
    console.error("Error fetching profiles:", profilesError)
    return { success: false, error: profilesError.message }
  }

  // Create a map of profiles by user_id for quick lookup
  const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || [])

  // Transform data to match the expected format
  const transformedBets =
    bets?.map((bet) => {
      const profile = profilesMap.get(bet.user_id)
      return {
        ...bet,
        userName: bet.user_name || profile?.name || "Usuario desconocido",
        userId: bet.user_id,
        vipLevel: profile?.vip_level || 0,
        date: bet.created_at,
        symbol: bet.asset,
        profiles: profile,
      }
    }) || []

  return { success: true, data: transformedBets }
}

export async function getAllUsers() {
  const supabase = await createServerClient()

  const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching users:", error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function processBetResults(winningDirection: string) {
  const supabase = await createServerClient()

  console.log("[v0] Starting bet results processing...")

  // Get all active bets (not processed)
  const { data: activeBets, error: betsError } = await supabase
    .from("bets")
    .select("*")
    .eq("is_processed", false)
    .in("status", ["PENDIENTE", "pending"])

  if (betsError) {
    console.error("[v0] Error fetching active bets:", betsError)
    return { success: false, error: betsError.message }
  }

  if (!activeBets || activeBets.length === 0) {
    return { success: false, error: "No hay apuestas activas para procesar" }
  }

  console.log(`[v0] Found ${activeBets.length} active bets to process`)

  // Fetch profiles for all users in the bets
  const userIds = [...new Set(activeBets.map((bet) => bet.user_id))]
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, name, email, vip_level, balance")
    .in("id", userIds)

  if (profilesError) {
    console.error("[v0] Error fetching profiles:", profilesError)
    return { success: false, error: profilesError.message }
  }

  // Create a map of profiles by user_id for quick lookup
  const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || [])

  // Add profile data to bets
  const betsWithProfiles = activeBets.map((bet) => ({
    ...bet,
    profiles: profilesMap.get(bet.user_id),
  }))

  // Separate winning and losing bets
  const winningBets = betsWithProfiles.filter((bet) => bet.direction === winningDirection)
  const losingBets = betsWithProfiles.filter((bet) => bet.direction !== winningDirection)

  console.log(`[v0] Winning bets: ${winningBets.length}, Losing bets: ${losingBets.length}`)

  // VIP interest rates
  const interestRates = [1.7, 1.87, 2.04, 2.21, 2.38, 2.55, 2.72, 2.89, 3.06, 3.23, 3.4]

  // Process winning bets
  for (const bet of winningBets) {
    const betAmount = Number(bet.amount || 0)
    const vipLevel = bet.profiles?.vip_level || 0
    const dailyInterestRate = interestRates[Math.min(Math.max(0, vipLevel), interestRates.length - 1)]
    const dailyInterest = betAmount * (dailyInterestRate / 100)
    const totalPayout = betAmount + dailyInterest

    console.log(`[v0] Processing winning bet ${bet.id}: $${betAmount} + $${dailyInterest} = $${totalPayout}`)

    // Update user balance
    const { error: balanceError } = await supabase.rpc("increment_balance", {
      user_id: bet.user_id,
      amount: totalPayout,
    })

    if (balanceError) {
      console.error(`[v0] Error updating balance for user ${bet.user_id}:`, balanceError)
      continue
    }

    const { error: betUpdateError } = await supabase
      .from("bets")
      .update({
        status: "completed",
        is_processed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bet.id)

    if (betUpdateError) {
      console.error(`[v0] Error updating bet ${bet.id}:`, betUpdateError)
      continue
    }

    const { error: transactionError } = await supabase.from("transactions").insert({
      user_id: bet.user_id,
      user_name: bet.user_name || bet.profiles?.name,
      user_email: bet.profiles?.email,
      type: "bet_win",
      amount: totalPayout,
      status: "completed",
      method: "bet", // Added required method field
      reference_table: "bets",
      reference_id: bet.id,
      notes: `Ganancia de apuesta - Interés: ${dailyInterestRate}%`,
    })

    if (transactionError) {
      console.error(`[v0] Error creating transaction for bet ${bet.id}:`, transactionError)
    }
  }

  // Process losing bets
  for (const bet of losingBets) {
    console.log(`[v0] Processing losing bet ${bet.id}`)

    const { error: betUpdateError } = await supabase
      .from("bets")
      .update({
        status: "completed",
        is_processed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bet.id)

    if (betUpdateError) {
      console.error(`[v0] Error updating bet ${bet.id}:`, betUpdateError)
      continue
    }

    const { error: transactionError } = await supabase.from("transactions").insert({
      user_id: bet.user_id,
      user_name: bet.user_name || bet.profiles?.name,
      user_email: bet.profiles?.email,
      type: "bet_loss",
      amount: 0,
      status: "completed",
      method: "bet", // Added required method field
      reference_table: "bets",
      reference_id: bet.id,
      notes: "Pérdida de apuesta",
    })

    if (transactionError) {
      console.error(`[v0] Error creating transaction for bet ${bet.id}:`, transactionError)
    }
  }

  const { data: currentSchedule } = await supabase
    .from("bet_processing_schedule")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  // Mark current schedule as processed
  if (currentSchedule) {
    const { error: scheduleError } = await supabase
      .from("bet_processing_schedule")
      .update({
        is_processed: true,
        processed_at: new Date().toISOString(),
      })
      .eq("id", currentSchedule.id)

    if (scheduleError) {
      console.error("[v0] Error updating schedule:", scheduleError)
    }
  }

  const currentDate = currentSchedule?.scheduled_date || new Date().toISOString().split("T")[0]
  const currentTime = currentSchedule?.scheduled_time || "02:00"

  const nextDate = new Date(currentDate)
  nextDate.setDate(nextDate.getDate() + 1)
  const nextDateStr = nextDate.toISOString().split("T")[0]

  console.log(`[v0] Auto-incrementing schedule from ${currentDate} ${currentTime} to ${nextDateStr} ${currentTime}`)

  await supabase.from("bet_processing_schedule").insert({
    scheduled_date: nextDateStr,
    scheduled_time: currentTime,
    winning_direction: winningDirection,
    is_processed: false,
  })

  revalidatePath("/apuestas")
  revalidatePath("/purchases")
  revalidatePath("/profile")

  console.log("[v0] Bet results processing completed successfully")

  return {
    success: true,
    data: {
      winningBets: winningBets.length,
      losingBets: losingBets.length,
      totalProcessed: activeBets.length,
    },
  }
}
