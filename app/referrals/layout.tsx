"use client"

import { useState, useEffect } from "react"
import MainNav from "@/components/main-nav"
import type React from "react"

export default function ReferralsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return (
    <div className="min-h-screen bg-background pb-16">
      <main className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Programa de Referidos</h1>
        {children}
      </main>
      {isClient && <MainNav />}
    </div>
  )
}
