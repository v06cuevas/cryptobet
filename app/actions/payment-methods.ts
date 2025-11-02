"use server"

import { createClient } from "@/lib/supabase/server"

export async function getPaymentMethods() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.from("payment_methods").select("*").single()

    if (error) {
      console.error("Error fetching payment methods:", error)
      return { data: null, error: "Error al cargar los métodos de pago" }
    }

    return { data, error: null }
  } catch (err) {
    console.error("Error in getPaymentMethods:", err)
    return { data: null, error: "Error al cargar los métodos de pago" }
  }
}
