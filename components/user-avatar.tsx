"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface UserAvatarProps {
  avatarUrl?: string | null
  userName: string
  className?: string
  onClick?: () => void
}

export function UserAvatar({ avatarUrl, userName, className = "h-10 w-10", onClick }: UserAvatarProps) {
  const firstLetter = userName.charAt(0).toUpperCase()

  return (
    <Avatar className={`${className} ${onClick ? "cursor-pointer" : ""}`} onClick={onClick}>
      {avatarUrl && (avatarUrl.startsWith("data:image") || avatarUrl.startsWith("https://")) && (
        <AvatarImage src={avatarUrl || "/placeholder.svg"} alt={userName} />
      )}
      <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
        {firstLetter}
      </AvatarFallback>
    </Avatar>
  )
}
