"use server"

import { createClient } from "@/lib/supabase/server"
import { getRoleByEmail } from "./user-roles"

function generateReferralCode(): string {
  return (
    "REF" +
    Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, "0")
  )
}

export async function loginUser(email: string, password: string) {
  try {
    const supabase = await createClient()

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", email)
        .limit(1)

      if (profileError || !profiles || profiles.length === 0) {
        return {
          success: false,
          error: "Usuario no registrado",
        }
      }

      return {
        success: false,
        error: "Error de Contraseña",
      }
    }

    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .limit(1)

    if (profileError || !profiles || profiles.length === 0) {
      return {
        success: false,
        error: "Error al cargar el perfil del usuario",
      }
    }

    const profile = profiles[0]

    return {
      success: true,
      user: {
        id: profile.id,
        name: profile.name,
        email: authData.user.email,
        role: profile.role || "user",
        balance: profile.balance,
        status: profile.status,
        referralCode: profile.referral_code,
        referredBy: profile.referred_by,
        vipLevel: profile.vip_level,
        avatarUrl: profile.avatar_url,
        referralEarnings: profile.referral_earnings,
      },
    }
  } catch (error) {
    console.error("Error en loginUser:", error)
    return {
      success: false,
      error: "Error al iniciar sesión",
    }
  }
}

export async function registerUser(name: string, email: string, password: string, referralCode?: string | null) {
  try {
    const supabase = await createClient()

    const { data: existingProfiles } = await supabase.from("profiles").select("email").eq("email", email).limit(1)

    if (existingProfiles && existingProfiles.length > 0) {
      return {
        success: false,
        error: "Este correo electrónico ya está registrado",
      }
    }

    const roleResult = await getRoleByEmail(email)
    const assignedRole = roleResult.success && roleResult.role ? roleResult.role : "user"

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify`,
      },
    })

    if (authError) {
      console.error("Error en auth.signUp:", authError)
      return {
        success: false,
        error: authError.message,
      }
    }

    if (!authData.user) {
      return {
        success: false,
        error: "Error al crear el usuario",
      }
    }

    let newReferralCode = generateReferralCode()
    let codeExists = true

    while (codeExists) {
      const { data: existingCodes } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("referral_code", newReferralCode)
        .limit(1)

      if (!existingCodes || existingCodes.length === 0) {
        codeExists = false
      } else {
        newReferralCode = generateReferralCode()
      }
    }

    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: authData.user.id,
        email: email,
        name: name,
        role: assignedRole,
        balance: 0,
        status: "En espera",
        referral_code: newReferralCode,
        referred_by: referralCode || null,
        vip_level: 0,
        referral_earnings: 0,
      })
      .select()

    if (profileError) {
      console.error("Error al crear perfil:", profileError)
      return {
        success: false,
        error: "Error al crear el perfil del usuario",
      }
    }

    if (!profiles || profiles.length === 0) {
      return {
        success: false,
        error: "Error al crear el perfil del usuario",
      }
    }

    const profile = profiles[0]

    return {
      success: true,
      user: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        balance: profile.balance,
        status: profile.status,
        referralCode: profile.referral_code,
        referredBy: profile.referred_by,
        vipLevel: profile.vip_level,
        avatarUrl: profile.avatar_url,
        referralEarnings: profile.referral_earnings,
      },
    }
  } catch (error) {
    console.error("Error en registerUser:", error)
    return {
      success: false,
      error: "Error al registrar el usuario",
    }
  }
}

export async function logoutUser() {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
    }
  } catch (error) {
    console.error("Error en logoutUser:", error)
    return {
      success: false,
      error: "Error al cerrar sesión",
    }
  }
}
