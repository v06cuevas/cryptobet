"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Users, Crown, User, Menu, ShoppingBag, BarChart2, DollarSign, Bitcoin, CreditCard } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

interface UserData {
  id: string
  name: string
  email: string
  role: string
  balance: number
  status?: string
}

export default function MainNav() {
  const pathname = usePathname()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false)

  useEffect(() => {
    // Verificar si el usuario está logueado
    try {
      const userData = localStorage.getItem("user")
      if (userData) {
        const user: UserData = JSON.parse(userData)
        setIsLoggedIn(true)
        setIsAdmin(user.role === "admin")
      } else {
        setIsLoggedIn(false)
        setIsAdmin(false)
      }
    } catch (err) {
      console.error("Error al verificar el estado de inicio de sesión:", err)
      setIsLoggedIn(false)
      setIsAdmin(false)
    }
  }, [])

  useEffect(() => {
    // Verificar si hay notificaciones no leídas
    const checkNotifications = () => {
      try {
        const unreadNotifications = localStorage.getItem("hasUnreadNotifications")
        setHasUnreadNotifications(unreadNotifications === "true")
      } catch (err) {
        console.error("Error al verificar notificaciones no leídas:", err)
        setHasUnreadNotifications(false)
      }
    }

    // Check initially
    checkNotifications()

    // Set up an interval to check periodically
    const interval = setInterval(checkNotifications, 2000)

    // Clean up interval on unmount
    return () => clearInterval(interval)
  }, [pathname]) // Add pathname as a dependency to re-check when navigation occurs

  // Si el usuario no está logueado, no mostrar la barra de navegación
  if (!isLoggedIn) return null

  // Modificar la definición de los elementos de navegación
  const navItems = [
    {
      name: "Inicio",
      href: "/markets",
      icon: Home,
      show: !isAdmin, // Solo mostrar para usuarios regulares
    },
    {
      name: "Mis Compras",
      href: "/purchases",
      icon: ShoppingBag,
      show: !isAdmin, // Solo mostrar para usuarios regulares
    },
    {
      name: "Referidos",
      href: "/referrals",
      icon: Users,
      show: !isAdmin, // Solo mostrar para usuarios regulares
    },
    {
      name: "Niveles VIP",
      href: "/vip-levels",
      icon: Crown,
      show: !isAdmin, // Solo mostrar para usuarios regulares
    },
    {
      name: "Perfil",
      href: "/profile",
      icon: User,
      show: true, // Mostrar para todos los usuarios
      hasNotification: hasUnreadNotifications, // Solo mostrar cuando hay notificaciones no leídas
    },
    {
      name: "Admin",
      href: "/admin",
      icon: Menu,
      show: isAdmin, // Solo mostrar si es admin
    },
    // Nuevas páginas solo para administradores
    {
      name: "Apuestas",
      href: "/apuestas",
      icon: BarChart2,
      show: isAdmin, // Solo mostrar si es admin
    },
    {
      name: "Transacciones",
      href: "/transacciones",
      icon: DollarSign,
      show: isAdmin, // Solo mostrar si es admin
    },
    {
      name: "Crypt",
      href: "/crypt",
      icon: Bitcoin,
      show: isAdmin, // Solo mostrar si es admin
    },
    {
      name: "Métodos",
      href: "/payment-methods",
      icon: CreditCard,
      show: isAdmin, // Solo mostrar si es admin
    },
  ]

  // Filtrar los elementos de navegación según el estado de inicio de sesión
  const filteredNavItems = navItems.filter((item) => item.show)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 bg-background border-t">
      <div className="container mx-auto">
        <div className="flex justify-between items-center">
          {filteredNavItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center py-2 px-3 text-xs relative",
                pathname === item.href ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <div className="relative">
                <item.icon className="h-6 w-6 mb-1" />
                {item.hasNotification && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                )}
              </div>
              <span>{item.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
