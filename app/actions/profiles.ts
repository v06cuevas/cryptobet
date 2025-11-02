"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface Profile {
  id: string
  name: string
  role: string
  balance: number
  status: string
  referral_code: string
  referred_by: string | null
  vip_level: number
  avatar_url: string | null
  referral_earnings: number
  created_at: string
  updated_at: string
}

/**
 * Get the current user's profile
 */
export async function getCurrentProfile() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Not authenticated" }
  }

  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (error) {
    return { error: error.message }
  }

  return { profile }
}

/**
 * Get the current user's profile (with consistent return format)
 */
export async function getUserProfile(): Promise<{ success: boolean; data?: Profile; error?: string }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "Usuario no autenticado" }
    }

    const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

    if (error) {
      console.error("Error fetching profile:", error)
      return { success: false, error: error.message }
    }

    return { success: true, data: profile as Profile }
  } catch (error) {
    console.error("Error in getUserProfile:", error)
    return { success: false, error: "Error al obtener perfil del usuario" }
  }
}

/**
 * Update the current user's profile
 */
export async function updateProfile(updates: Partial<Profile>) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Not authenticated" }
  }

  const { data, error } = await supabase.from("profiles").update(updates).eq("id", user.id).select().single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/profile")
  return { profile: data }
}

/**
 * Update user's balance
 */
export async function updateBalance(amount: number, operation: "add" | "subtract") {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Not authenticated" }
  }

  // Get current balance
  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("balance")
    .eq("id", user.id)
    .single()

  if (fetchError) {
    return { error: fetchError.message }
  }

  const newBalance = operation === "add" ? profile.balance + amount : profile.balance - amount

  if (newBalance < 0) {
    return { error: "Insufficient balance" }
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ balance: newBalance })
    .eq("id", user.id)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/profile")
  return { profile: data }
}

/**
 * Get profile by referral code
 */
export async function getProfileByReferralCode(referralCode: string) {
  const supabase = await createClient()

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("referral_code", referralCode)
    .single()

  if (error) {
    return { error: error.message }
  }

  return { profile }
}

/**
 * Update VIP level
 */
export async function updateVipLevel(vipLevel: number) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Not authenticated" }
  }

  if (vipLevel < 0 || vipLevel > 10) {
    return { error: "Invalid VIP level" }
  }

  const { data, error } = await supabase.from("profiles").update({ vip_level: vipLevel }).eq("id", user.id).select()

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/profile")
  return { profile: data }
}

/**
 * Upload avatar image
 */
export async function uploadAvatar(file: File) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  console.log("[v0] Auth check - Error:", authError, "User:", user?.id)

  if (authError || !user) {
    console.log("[v0] Authentication failed in uploadAvatar")
    return { error: "Usuario no autenticado. Por favor inicia sesión." }
  }

  const MAX_FILE_SIZE = 8 * 1024 * 1024 // 8MB in bytes
  if (file.size > MAX_FILE_SIZE) {
    return { error: "El archivo es demasiado grande. El tamaño máximo es 8 MB." }
  }

  const allowedMimeTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"]
  if (!allowedMimeTypes.includes(file.type)) {
    return { error: "Formato de imagen no válido. Usa JPEG, PNG o WebP." }
  }

  try {
    // Create a unique file name
    const fileExt = file.name.split(".").pop()
    const fileName = `${user.id}-${Date.now()}.${fileExt}`
    const filePath = `profile-photos/${fileName}`

    console.log("[v0] Uploading file to:", filePath)

    // Upload file to Supabase Storage
    const { error: uploadError, data } = await supabase.storage.from("profile-photos").upload(filePath, file)

    if (uploadError) {
      console.log("[v0] Storage upload error:", uploadError)
      return { error: `Error al cargar la imagen: ${uploadError.message}` }
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("profile-photos").getPublicUrl(filePath)

    console.log("[v0] Public URL:", publicUrl)

    // Insert photo metadata
    const { data: photoRecord, error: photoError } = await supabase
      .from("profile_photos")
      .insert([
        {
          user_id: user.id,
          photo_url: publicUrl,
          storage_path: filePath,
          file_name: fileName,
          file_size: file.size,
          mime_type: file.type,
          is_active: true,
        },
      ])
      .select()
      .single()

    if (photoError) {
      console.log("[v0] Database insert error:", photoError)
      return { error: `Error al guardar metadatos de foto: ${photoError.message}` }
    }

    console.log("[v0] Photo record created:", photoRecord?.id)

    // Update profile with new avatar URL
    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id)
      .select()
      .single()

    if (updateError) {
      console.log("[v0] Profile update error:", updateError)
      return { error: `Error al actualizar perfil: ${updateError.message}` }
    }

    console.log("[v0] Profile updated successfully")

    revalidatePath("/profile")
    return { profile: updatedProfile, photoRecord }
  } catch (error) {
    console.log("[v0] Unexpected error in uploadAvatar:", error)
    return { error: "Error inesperado al cargar la imagen. Por favor intenta de nuevo." }
  }
}

/**
 * Get user's profile photos
 */
export async function getUserProfilePhotos() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Not authenticated" }
  }

  const { data: photos, error } = await supabase
    .from("profile_photos")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    return { error: error.message }
  }

  return { photos }
}

/**
 * Delete a profile photo
 */
export async function deleteProfilePhoto(photoId: string) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Not authenticated" }
  }

  // Get the photo record
  const { data: photo, error: fetchError } = await supabase
    .from("profile_photos")
    .select("*")
    .eq("id", photoId)
    .eq("user_id", user.id)
    .single()

  if (fetchError || !photo) {
    return { error: "Photo not found" }
  }

  // Delete from storage
  const { error: deleteStorageError } = await supabase.storage.from("profile-photos").remove([photo.storage_path])

  if (deleteStorageError) {
    return { error: deleteStorageError.message }
  }

  // Delete from database
  const { error: deleteDbError } = await supabase.from("profile_photos").delete().eq("id", photoId)

  if (deleteDbError) {
    return { error: deleteDbError.message }
  }

  revalidatePath("/profile")
  return { success: true }
}

/**
 * Get all profiles (admin only)
 */
export async function getAllProfiles() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Not authenticated" }
  }

  // Check if user is admin
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "admin") {
    return { error: "Unauthorized" }
  }

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    return { error: error.message }
  }

  return { profiles }
}
