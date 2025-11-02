"use server"

import { createClient } from "@/lib/supabase/server"

export interface BroadcastMessage {
  id: string
  subject: string
  content: string
  created_at: string
  read?: boolean
}

export async function getBroadcastMessages() {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: "No autenticado", data: [] }
    }

    // Get all broadcast messages
    const { data: messages, error: messagesError } = await supabase
      .from("broadcast_messages")
      .select("*")
      .order("created_at", { ascending: false })

    if (messagesError) {
      console.error("Error fetching messages:", messagesError)
      return { success: false, error: messagesError.message, data: [] }
    }

    // Get user's read messages
    const { data: readMessages, error: readError } = await supabase
      .from("user_message_reads")
      .select("message_id")
      .eq("user_id", user.id)

    if (readError) {
      console.error("Error fetching read messages:", readError)
    }

    const readMessageIds = new Set(readMessages?.map((r) => r.message_id) || [])

    // Mark messages as read/unread
    const messagesWithReadStatus: BroadcastMessage[] = (messages || []).map((msg) => ({
      id: msg.id,
      subject: msg.subject,
      content: msg.content,
      created_at: msg.created_at,
      read: readMessageIds.has(msg.id),
    }))

    return { success: true, data: messagesWithReadStatus }
  } catch (error) {
    console.error("Error in getBroadcastMessages:", error)
    return { success: false, error: "Error al obtener mensajes", data: [] }
  }
}

export async function markMessageAsRead(messageId: string) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: "No autenticado" }
    }

    // Insert or update read status
    const { error } = await supabase.from("user_message_reads").upsert(
      {
        user_id: user.id,
        message_id: messageId,
        read_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,message_id",
      },
    )

    if (error) {
      console.error("Error marking message as read:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in markMessageAsRead:", error)
    return { success: false, error: "Error al marcar mensaje como leído" }
  }
}

export async function markAllMessagesAsRead() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: "No autenticado" }
    }

    // Get all message IDs
    const { data: messages, error: messagesError } = await supabase.from("broadcast_messages").select("id")

    if (messagesError) {
      return { success: false, error: messagesError.message }
    }

    // Mark all as read
    const reads = (messages || []).map((msg) => ({
      user_id: user.id,
      message_id: msg.id,
      read_at: new Date().toISOString(),
    }))

    const { error } = await supabase.from("user_message_reads").upsert(reads, {
      onConflict: "user_id,message_id",
    })

    if (error) {
      console.error("Error marking all messages as read:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in markAllMessagesAsRead:", error)
    return { success: false, error: "Error al marcar todos los mensajes como leídos" }
  }
}

export async function createBroadcastMessage(subject: string, content: string) {
  try {
    const supabase = await createClient()

    // Verify user is admin
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: "No autenticado" }
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError || !profile || profile.role !== "admin") {
      return { success: false, error: "No autorizado" }
    }

    // Create broadcast message
    const { data, error } = await supabase
      .from("broadcast_messages")
      .insert({
        subject,
        content,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating broadcast message:", error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Error in createBroadcastMessage:", error)
    return { success: false, error: "Error al crear mensaje" }
  }
}
