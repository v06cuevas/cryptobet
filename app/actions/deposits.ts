"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface DepositData {
  amount: number
  method: string
  methodName: string
  proofUrl?: string
  bankDetails?: {
    bankName: string
    accountNumber: string
    accountHolder: string
  }
}

export async function createDeposit(data: DepositData) {
  const supabase = await createClient()

  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: "Usuario no autenticado" }
  }

  // Get user name from metadata or email
  const userName = user.user_metadata?.name || user.email?.split("@")[0] || "Usuario"

  const depositPayload: any = {
    user_id: user.id,
    user_name: userName,
    amount: data.amount,
    method: data.method,
    method_name: data.methodName,
    status: "pending",
    proof_url: data.proofUrl,
  }

  // Add bank details if this is a bank transfer
  if (data.method === "bank" && data.bankDetails) {
    depositPayload.bank_name = data.bankDetails.bankName
    depositPayload.account_number = data.bankDetails.accountNumber
    depositPayload.account_holder = data.bankDetails.accountHolder
  }

  const { data: deposit, error } = await supabase.from("deposits").insert(depositPayload).select().single()

  if (error) {
    console.error("Error creating deposit:", error)
    return { error: "Error al crear el depósito" }
  }

  revalidatePath("/deposit")
  revalidatePath("/profile")

  return { data: deposit }
}

export async function uploadPaymentProof(file: File, depositId: string) {
  const supabase = await createClient()

  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: "Usuario no autenticado" }
  }

  // Get user email for naming convention
  const userEmail = user.email || "user"

  // Validate file size (5MB max)
  const MAX_FILE_SIZE = 5 * 1024 * 1024
  if (file.size > MAX_FILE_SIZE) {
    return { error: "El archivo es demasiado grande. El tamaño máximo es 5MB." }
  }

  // Validate file type
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp", "application/pdf"]
  if (!allowedMimeTypes.includes(file.type)) {
    return { error: "Formato de archivo no válido. Usa JPG, PNG o PDF." }
  }

  try {
    // Create a unique file name using user_id, email and deposit_id
    const fileExt = file.name.split(".").pop()
    const cleanEmail = userEmail.split("@")[0] // Get part before @ for cleaner filename
    const fileName = `${cleanEmail}_${depositId}.${fileExt}`
    const filePath = `${user.id}/${fileName}`

    console.log("[v0] Uploading payment proof to:", filePath)

    // Upload file to Supabase Storage
    const { error: uploadError, data } = await supabase.storage.from("payment-receipts").upload(filePath, file)

    if (uploadError) {
      console.error("[v0] Storage upload error:", uploadError)
      return { error: `Error al cargar el comprobante: ${uploadError.message}` }
    }

    // Get public URL for the uploaded file
    const {
      data: { publicUrl },
    } = supabase.storage.from("payment-receipts").getPublicUrl(filePath)

    console.log("[v0] Payment proof URL:", publicUrl)

    // Update the deposit record with the proof URL
    const { data: deposit, error: updateError } = await supabase
      .from("deposits")
      .update({ proof_url: publicUrl })
      .eq("id", depositId)
      .eq("user_id", user.id)
      .select()
      .single()

    if (updateError) {
      console.error("[v0] Deposit update error:", updateError)
      return { error: `Error al actualizar el depósito: ${updateError.message}` }
    }

    console.log("[v0] Deposit updated successfully with proof URL")

    revalidatePath("/deposit")
    revalidatePath("/profile")

    return { success: true, deposit }
  } catch (error) {
    console.error("[v0] Unexpected error in uploadPaymentProof:", error)
    return { error: "Error inesperado al cargar el comprobante. Por favor intenta de nuevo." }
  }
}

export async function getUserDeposits() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: "Usuario no autenticado" }
  }

  const { data: deposits, error } = await supabase
    .from("deposits")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching deposits:", error)
    return { error: "Error al obtener los depósitos" }
  }

  return { data: deposits }
}

export async function getUserDepositsWithStatus() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: "Usuario no autenticado" }
  }

  const { data: deposits, error } = await supabase
    .from("deposits")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching deposits:", error)
    return { error: "Error al obtener los depósitos" }
  }

  return { data: deposits || [] }
}

export async function getPendingDeposits() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: "Usuario no autenticado" }
  }

  // Check if user is admin (you'll need to implement admin check)
  // For now, we'll just return all pending deposits
  const { data: deposits, error } = await supabase
    .from("deposits")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching pending deposits:", error)
    return { error: "Error al obtener los depósitos pendientes" }
  }

  return { data: deposits }
}

export async function updateDepositStatus(depositId: string, status: "approved" | "rejected") {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: "Usuario no autenticado" }
  }

  // TODO: Add admin check here

  const { data: deposit, error } = await supabase
    .from("deposits")
    .update({ status })
    .eq("id", depositId)
    .select()
    .single()

  if (error) {
    console.error("Error updating deposit:", error)
    return { error: "Error al actualizar el depósito" }
  }

  revalidatePath("/admin")
  revalidatePath("/profile")

  return { data: deposit }
}
