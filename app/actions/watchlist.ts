"use server"

import { createClient } from "@/lib/supabase/server"

export interface WatchlistItem {
  id: string
  crypto_id: string
  crypto_symbol: string
  crypto_name: string
  created_at: string
}

export async function getWatchlist() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: "No autenticado", data: [] }
    }

    const { data, error } = await supabase
      .from("watchlist")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching watchlist:", error)
      return { success: false, error: error.message, data: [] }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error("Error in getWatchlist:", error)
    return { success: false, error: "Error al obtener watchlist", data: [] }
  }
}

export async function addToWatchlist(cryptoId: string, cryptoSymbol: string, cryptoName: string) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: "No autenticado" }
    }

    const { data, error } = await supabase
      .from("watchlist")
      .insert({
        user_id: user.id,
        crypto_id: cryptoId,
        crypto_symbol: cryptoSymbol,
        crypto_name: cryptoName,
      })
      .select()
      .single()

    if (error) {
      console.error("Error adding to watchlist:", error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Error in addToWatchlist:", error)
    return { success: false, error: "Error al agregar a watchlist" }
  }
}

export async function removeFromWatchlist(cryptoId: string) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: "No autenticado" }
    }

    const { error } = await supabase.from("watchlist").delete().eq("user_id", user.id).eq("crypto_id", cryptoId)

    if (error) {
      console.error("Error removing from watchlist:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in removeFromWatchlist:", error)
    return { success: false, error: "Error al eliminar de watchlist" }
  }
}
