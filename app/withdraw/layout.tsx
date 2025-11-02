import type React from "react"
import MainNav from "@/components/main-nav"

export default function WithdrawLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div>
      {children}
      <MainNav />
    </div>
  )
}
