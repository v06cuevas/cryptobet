"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertCircle,
  Calendar,
  Camera,
  CheckCircle,
  ChevronLeft,
  Clock,
  Crown,
  Eye,
  EyeOff,
  Info,
  KeyRound,
  Lock,
  LogOut,
  Upload,
  User,
  Users,
  Wallet,
  X,
} from "lucide-react"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { portfolioHoldings } from "@/lib/mock-data"
import { uploadAvatar } from "@/app/actions/profiles"

// Modificar la interfaz UserData para incluir un array de notificaciones de depósito
interface UserData {
  id: string
  name: string
  email: string
  role: string
  balance: number
  status?: string
  referralCode?: string
  referredBy?: string
  vipLevel?: number
  depositPending?: boolean
  depositApproved?: boolean
  depositAmount?: string
  depositMethod?: string
  depositPendingDate?: string
  depositApprovedDate?: string
  depositHistory?: Array<{
    id: string
    amount: number | string
    method: string
    methodName?: string
    date: string
    status: string
    approvedDate?: string
  }>
  depositId?: string
  withdrawalId?: string
  avatarUrl?: string
  referralEarnings?: number
}

// Replace with a simple helper function:
const isClient = typeof window !== "undefined"

// Mock ProtectedRoute component (replace with your actual implementation)
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  // In a real app, you would check for authentication state here
  // For this example, we'll just render the children
  return <>{children}</>
}

// Añadir la constante vipLevels al inicio del componente, después de las interfaces
const vipLevels = [
  { level: 0, name: "Básico", depositRequired: 0, monthlyLimit: 150, retirosCantidad: 1, color: "bg-gray-400" },
  { level: 1, name: "Principiante", depositRequired: 20, monthlyLimit: 15, retirosCantidad: 2, color: "bg-zinc-400" },
  { level: 2, name: "Bronce", depositRequired: 40, monthlyLimit: 30, retirosCantidad: 2, color: "bg-amber-700" },
  { level: 3, name: "Plata", depositRequired: 100, monthlyLimit: 75, retirosCantidad: 2, color: "bg-slate-400" },
  { level: 4, name: "Oro", depositRequired: 500, monthlyLimit: 375, retirosCantidad: 3, color: "bg-yellow-500" },
  { level: 5, name: "Platino", depositRequired: 1022, monthlyLimit: 767, retirosCantidad: 3, color: "bg-zinc-300" },
  {
    level: 6,
    name: "Esmeralda",
    depositRequired: 1318,
    monthlyLimit: 989,
    retirosCantidad: 3,
    color: "bg-emerald-500",
  },
  { level: 7, name: "Rubí", depositRequired: 1700, monthlyLimit: 1275, retirosCantidad: 3, color: "bg-red-600" },
  { level: 8, name: "Zafiro", depositRequired: 2193, monthlyLimit: 1645, retirosCantidad: 4, color: "bg-blue-600" },
  { level: 9, name: "Diamante", depositRequired: 2829, monthlyLimit: 2122, retirosCantidad: 4, color: "bg-cyan-300" },
  { level: 10, name: "VIP Black", depositRequired: 3649, monthlyLimit: 2737, retirosCantidad: 5, color: "bg-black" },
]

// Función para generar IDs únicos con el formato WD-XXXXXX (6 dígitos)
const generateWithdrawalId = () => {
  const randomNum = Math.floor(100000 + Math.random() * 900000) // Genera un número de 6 dígitos
  return `WD-${randomNum}`
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfilePageContent />
    </ProtectedRoute>
  )
}

function ProfilePageContent() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  const [showAllDepositsModal, setShowAllDepositsModal] = useState(false)
  const [showAllWithdrawalsModal, setShowAllWithdrawalsModal] = useState(false)

  // Añadir un nuevo estado para el nivel VIP del usuario después de los otros estados
  const [userVipLevel, setUserVipLevel] = useState(3) // Por defecto nivel 3 (Plata)
  const [userDeposits, setUserDeposits] = useState(1500) // Por defecto $1500 de depósitos

  // Modificar el useEffect que carga los datos del usuario para calcular el nivel VIP
  // Buscar el useEffect que tiene "Check if user is logged in" y añadir al final:

  // Asegurarnos de que el useEffect que carga los datos del usuario establezca correctamente
  // los estados de las notificaciones
  // Estados para notificaciones de retiro
  const [hasNewWithdrawalNotification, setHasNewWithdrawalNotification] = useState(false)
  const [withdrawalNotificationsRead, setWithdrawalNotificationsRead] = useState(false)
  const [withdrawalAmount, setWithdrawalAmount] = useState("0")
  const [withdrawalApproved, setWithdrawalApproved] = useState(false)

  // Add new state variables for withdrawal method name and date
  const [withdrawalMethodName, setWithdrawalMethodName] = useState("PayPal")
  const [withdrawalDate, setWithdrawalDate] = useState("10/03/2024")

  // Añadir estos nuevos estados al inicio del componente, junto con los otros estados
  const [referralCode, setReferralCode] = useState("")
  const [isProcessingReferral, setIsProcessingReferral] = useState(false)
  const [referralSuccess, setReferralSuccess] = useState(false)
  const [referralError, setReferralError] = useState("")
  const [copied, setCopied] = useState(false)

  // Añadir estos nuevos estados después de los otros estados
  const [showAvatarUpload, setShowAvatarUpload] = useState(false)
  const [avatarSrc, setAvatarSrc] = useState("/placeholder.svg?height=96&width=96")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Add state for deposit notifications
  const [depositNotificationsRead, setDepositNotificationsRead] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]

      const MAX_FILE_SIZE = 8 * 1024 * 1024
      if (file.size > MAX_FILE_SIZE) {
        alert("La imagen es demasiado grande. El tamaño máximo es 8 MB.")
        return
      }

      const allowedMimeTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"]
      if (!allowedMimeTypes.includes(file.type)) {
        alert("Formato de imagen no válido. Usa JPEG, PNG o WebP.")
        return
      }

      // Simulate upload progress
      setUploadingAvatar(true)
      setUploadProgress(0)

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      uploadAvatar(file)
        .then((result) => {
          console.log("[v0] Upload result:", result)

          if (result.error) {
            console.log("[v0] Upload error:", result.error)
            alert(`Error: ${result.error}`)
            setUploadingAvatar(false)
            setUploadProgress(0)
            clearInterval(progressInterval)
            return
          }

          if (result.profile) {
            // Update UI with new avatar
            console.log("[v0] Avatar URL updated to:", result.profile.avatar_url)
            setAvatarSrc(result.profile.avatar_url)
            if (user) {
              setUser({
                ...user,
                avatarUrl: result.profile.avatar_url,
              })
            }
          }

          // Complete upload
          setTimeout(() => {
            setUploadingAvatar(false)
            setUploadProgress(100)
            setShowAvatarUpload(false)
            clearInterval(progressInterval)
          }, 500)
        })
        .catch((err) => {
          console.log("[v0] Catch error uploading avatar:", err)
          alert("Error al subir la imagen. Intenta de nuevo.")
          setUploadingAvatar(false)
          setUploadProgress(0)
          clearInterval(progressInterval)
        })
    }
  }

  const [activeTabState, setActiveTabState] = useState("personal")
  const [showPassword, setShowPassword] = useState(false)
  const [showWithdrawPassword, setShowWithdrawPassword] = useState(false)
  const [showSecurityCode, setShowSecurityCode] = useState(false)
  const [hasNewNotification, setHasNewNotification] = useState(false)
  const [withdrawPassword, setWithdrawPassword] = useState("Segura2024!")
  const [referralLink, setReferralLink] = useState("https://example.com/referral/12345")

  // Añadir nuevos estados para controlar los modos de edición y las notificaciones
  const [editWithdrawPassword, setEditWithdrawPassword] = useState(false)
  const [editUsername, setEditUsername] = useState(false)
  const [editPassword, setEditPassword] = useState(false)
  const [newWithdrawPassword, setNewWithdrawPassword] = useState("")
  const [newUsername, setNewUsername] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [notificationsRead, setNotificationsRead] = useState(false)

  // Modificar la estructura de datos para manejar múltiples retiros en proceso
  // Añadir estos estados después de las declaraciones de estado existentes
  const [pendingWithdrawals, setPendingWithdrawals] = useState<
    Array<{
      amount: string
      method: string
      methodName: string
      date: string
      status?: string
      completedDate?: string
      id?: string
    }>
  >([])

  // Nuevo estado para almacenar todos los retiros completados
  const [completedWithdrawals, setCompletedWithdrawals] = useState<
    Array<{
      id: string
      amount: string
      method?: string
      methodName: string
      date: string
      completedDate?: string
    }>
  >([])

  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const activeTabParam = tabParam || "personal"
  const [activeTab, setActiveTab] = useState(activeTabParam)

  // Añadir useEffect para cargar el estado de los depósitos desde localStorage
  // Buscar el useEffect que carga los datos del usuario y añadir:

  // Añadir un nuevo estado para almacenar el historial de depósitos
  const [depositHistory, setDepositHistory] = useState<
    Array<{
      id: string
      amount: number | string
      method: string
      methodName?: string
      date: string
      status: string
      approvedDate?: string
    }>
  >([])

  // Estado para almacenar las notificaciones
  const [notifications, setNotifications] = useState<any[]>([])

  // Simulating fetching deposit data
  const [dbDeposits, setDbDeposits] = useState<any[] | null>(null)
  const [loadingDeposits, setLoadingDeposits] = useState(true)

  const [dbWithdrawals, setDbWithdrawals] = useState<any[] | null>(null)
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(true)

  useEffect(() => {
    const fetchDeposits = async () => {
      setLoadingDeposits(true)
      try {
        // Import and call the actual server action
        const { getUserDepositsWithStatus } = await import("@/app/actions/deposits")
        const result = await getUserDepositsWithStatus()

        if (result.error) {
          console.error("[v0] Error fetching deposits:", result.error)
          setDbDeposits([])
        } else {
          console.log("[v0] Deposits loaded:", result.data)
          setDbDeposits(result.data || [])
        }
      } catch (error) {
        console.error("[v0] Failed to load deposits:", error)
        setDbDeposits([])
      } finally {
        setLoadingDeposits(false)
      }
    }

    if (activeTab === "financial") {
      fetchDeposits()
    }
  }, [activeTab])

  useEffect(() => {
    const fetchWithdrawals = async () => {
      setLoadingWithdrawals(true)
      try {
        const { getUserWithdrawals } = await import("@/app/actions/withdrawals")
        const result = await getUserWithdrawals()

        if (result.error) {
          console.error("[v0] Error fetching withdrawals:", result.error)
          setDbWithdrawals([])
        } else {
          console.log("[v0] Withdrawals loaded:", result.data)
          setDbWithdrawals(result.data || [])
        }
      } catch (error) {
        console.error("[v0] Failed to load withdrawals:", error)
        setDbWithdrawals([])
      } finally {
        setLoadingWithdrawals(false)
      }
    }

    if (activeTab === "financial") {
      fetchWithdrawals()
    }
  }, [activeTab])

  // Modificar el useEffect que carga los datos del usuario para cargar también el historial de depósitos
  useEffect(() => {
    // Check if user is logged in
    const loadUserData = async () => {
      console.log("Intentando cargar datos de usuario...")
      try {
        const userData = isClient ? localStorage.getItem("user") : null
        console.log("Datos de usuario en localStorage:", userData)
        if (!userData) {
          console.log("No hay datos de usuario, debería redirigir a /login")

          setLoading(false)
          return
        }

        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)

        // Modificar el useEffect que carga los datos del usuario para asegurar que se genere un código de referido si no existe
        // Añadir este código dentro del useEffect que carga los datos del usuario, justo después de donde se establece setUser(parsedUser):

        // Generar un código de referido si el usuario no tiene uno
        if (!parsedUser.referralCode) {
          const referralCode = `REF${Math.floor(100000 + Math.random() * 900000)}`
          parsedUser.referralCode = referralCode

          // Guardar el código de referido en localStorage
          if (isClient) {
            localStorage.setItem("user", JSON.stringify(parsedUser))

            // También actualizar en la lista de usuarios registrados
            try {
              const registeredUsers = JSON.parse(localStorage.getItem("registeredUsers") || "[]")
              const userIndex = registeredUsers.findIndex((u: any) => u.id === parsedUser.id)
              if (userIndex !== -1) {
                registeredUsers[userIndex].referralCode = referralCode
                localStorage.setItem("registeredUsers", JSON.stringify(registeredUsers))
              }
            } catch (err) {
              console.error("Error al actualizar código de referido en usuarios registrados:", err)
            }
          }

          // Actualizar el estado del usuario
          setUser({ ...parsedUser })
        }

        // Actualizar el enlace de referido
        setReferralLink(`${window.location.origin}/register?ref=${parsedUser.referralCode || ""}`)

        // Load avatar if exists
        // Modificar el useEffect que carga los datos del usuario para asegurar que la imagen se cargue correctamente
        // Buscar el código que establece el avatarSrc y reemplazarlo con:

        // En el useEffect que contiene loadUserData, modificar la parte que carga el avatar:
        // Reemplazar:
        // if (parsedUser.avatarUrl) {
        //   setAvatarSrc(parsedUser.avatarUrl)
        // }

        // Con:
        if (parsedUser.avatarUrl) {
          // Verificar que la URL de la imagen sea válida
          const img = new Image()
          img.onload = () => {
            // La imagen se cargó correctamente
            setAvatarSrc(parsedUser.avatarUrl)
          }
          img.onerror = () => {
            // Error al cargar la imagen, usar el placeholder
            console.error("Error loading avatar image")
            setAvatarSrc(`/placeholder.svg?height=96&width=96&text=${parsedUser.name.charAt(0)}`)
          }
          img.src = parsedUser.avatarUrl
        } else {
          // No hay avatarUrl, usar el placeholder
          setAvatarSrc(`/placeholder.svg?height=96&width=96&text=${parsedUser.name.charAt(0)}`)
        }

        // Cargar historial de depósitos
        if (parsedUser.depositHistory) {
          setDepositHistory(parsedUser.depositHistory)
        } else {
          // Si no hay historial, crear uno vacío
          parsedUser.depositHistory = []
          if (isClient) {
            localStorage.setItem("user", JSON.stringify(parsedUser))
          }
        }

        // Verificar si hay notificaciones de depósito pendiente
        if (isClient) {
          const pendingDepositVerification = localStorage.getItem("pendingDepositVerification")
          if (pendingDepositVerification === "true" || parsedUser.depositPending) {
            setHasNewNotification(true)

            // Actualizar el usuario con la información del depósito pendiente si no la tiene
            if (!parsedUser.depositPending) {
              const depositAmount = localStorage.getItem("depositAmount")
              const depositMethod = localStorage.getItem("depositMethod")
              const depositPendingDate = localStorage.getItem("depositPendingDate")

              if (depositAmount && depositMethod) {
                parsedUser.depositPending = true
                parsedUser.depositAmount = depositAmount
                parsedUser.depositMethod = depositMethod
                parsedUser.depositPendingDate = depositPendingDate || new Date().toLocaleDateString()

                localStorage.setItem("user", JSON.JSON.stringify(parsedUser))
              }
            }
          }

          // Verificar si hay notificaciones de depósito aprobado
          const depositApproved = localStorage.getItem(`depositApproved_${parsedUser.id}`)
          if (depositApproved === "true" || parsedUser.depositApproved) {
            setHasNewNotification(true)

            // Si el depósito fue aprobado, actualizar el usuario si no tiene la información
            if (!parsedUser.depositApproved) {
              parsedUser.depositApproved = true
              parsedUser.depositApprovedDate = new Date().toLocaleDateString()

              localStorage.setItem("user", JSON.JSON.stringify(parsedUser))
            }
          }
        }

        // Use the name or email of the user as username
        setNewUsername(parsedUser.name || parsedUser.email.split("@")[0])

        // Explicitly set the user's VIP level from localStorage
        // This ensures we're using the correct level
        setUserVipLevel(parsedUser.vipLevel || 0)

        // Initialize approvedWithdrawals if it doesn't exist
        if (isClient) {
          if (!localStorage.getItem("approvedWithdrawals")) {
            localStorage.setItem("approvedWithdrawals", JSON.stringify([]))
          }
        }

        // Simplemente cargar el nivel VIP guardado sin cálculos automáticos
        const savedVipLevel = parsedUser.vipLevel !== undefined ? parsedUser.vipLevel : 0

        // Establecer el nivel VIP en el estado directamente desde el valor guardado
        setUserVipLevel(savedVipLevel)
        setUserDeposits(parsedUser.balance || 0)

        // Comentario para explicar el cambio
        // El nivel VIP ahora solo se actualiza desde el panel de administrador
        // y no automáticamente basado en los depósitos

        // Check for pending deposit notification
        const pendingDeposit = isClient ? localStorage.getItem("pendingDepositVerification") : null
        if (pendingDeposit === "true") {
          setHasNewNotification(true)
        }

        // Modificar el useEffect que carga los datos del usuario para verificar correctamente el estado de las notificaciones
        // Buscar el useEffect que contiene "Check for notifications and set states" y modificar:

        // Check for notifications and set states
        const withdrawalAmountStored = isClient ? localStorage.getItem("withdrawalAmount") : null
        const withdrawalMethodStored = isClient ? localStorage.getItem("withdrawalMethod") : null
        const withdrawalMethodNameStored = isClient ? localStorage.getItem("withdrawalMethodName") : null
        const withdrawalDateStored = isClient ? localStorage.getItem("withdrawalDate") : null
        const withdrawalApprovedStatus = isClient ? localStorage.getItem("withdrawalApproved") : null
        const pendingWithdrawal = isClient ? localStorage.getItem("pendingWithdrawalVerification") : null
        const withdrawalIdStored = isClient ? localStorage.getItem("withdrawalId") : null

        // Guardar el ID del retiro en el usuario si existe
        if (withdrawalIdStored) {
          parsedUser.withdrawalId = withdrawalIdStored
          if (isClient) {
            localStorage.setItem("user", JSON.stringify(parsedUser))
          }
        }

        // IMPORTANTE: Configurar el estado de la notificación basado en si está aprobada o pendiente
        if (withdrawalApprovedStatus === "true") {
          setWithdrawalApproved(true)
          setHasNewNotification(true) // Mantener la notificación activa, solo cambiar su estado
          if (withdrawalAmountStored) {
            setWithdrawalAmount(withdrawalAmountStored)
          }
        } else if (pendingWithdrawal === "true") {
          setHasNewNotification(true)
          setWithdrawalApproved(false)
          if (withdrawalAmountStored) {
            setWithdrawalAmount(withdrawalAmountStored)
          }
        }

        // In the same useEffect, add these lines to set the withdrawal method name and date:
        if (withdrawalMethodNameStored) {
          setWithdrawalMethodName(withdrawalMethodNameStored)
        }
        if (withdrawalDateStored) {
          setWithdrawalDate(withdrawalDateStored)
        } else {
          setWithdrawalDate("10/03/2024")
        }

        setLoading(false)
      } catch (error) {
        console.error("Error loading user data:", error)
        router.push("/login")
      }

      // Modificar la función que carga los retiros pendientes
      try {
        if (isClient) {
          // Cargar retiros pendientes
          const pendingWithdrawalsData = localStorage.getItem("pendingWithdrawalsList")
          if (pendingWithdrawalsData) {
            const allWithdrawals = JSON.parse(pendingWithdrawalsData)

            // Asegurarse de que cada retiro tenga un ID único con el formato WD-XXXXXX
            const withdrawalsWithIds = allWithdrawals.map((w: any) => {
              // Si no tiene ID o el ID no tiene el formato correcto, generar uno nuevo
              if (!w.id || !w.id.startsWith("WD-")) {
                return {
                  ...w,
                  id: generateWithdrawalId(),
                  amount: w.amount || "500.00",
                  methodName: w.methodName || "Bitcoin",
                  date: w.date || "28/3/2025",
                }
              }
              return w
            })

            // Establecer todos los retiros pendientes - incluidos los aprobados
            // CRÍTICO: No filtrar por estado aquí para mostrar tanto los pendientes como los aprobados
            setPendingWithdrawals(withdrawalsWithIds)
          }
        }
      } catch (err) {
        console.error("Error al cargar retiros:", err)
      }
    }

    loadUserData()
  }, [router])

  // Añadir una función para verificar periódicamente que la imagen del avatar sigue disponible
  useEffect(() => {
    // Verificar periódicamente que la imagen del avatar sigue disponible
    if (user && user.avatarUrl && avatarSrc.startsWith("data:image")) {
      const checkInterval = setInterval(() => {
        // Verificar que la imagen sigue en localStorage
        try {
          const currentUserData = localStorage.getItem("user")
          if (currentUserData) {
            const currentUser = JSON.parse(currentUserData)
            if (!currentUser.avatarUrl || currentUser.avatarUrl !== user.avatarUrl) {
              // La imagen ha cambiado o se ha eliminado, actualizar
              console.log("Avatar changed or removed, updating...")
              setAvatarSrc(`/placeholder.svg?height=96&width=96&text=${user.name.charAt(0)}`)

              // Restaurar la imagen si se ha eliminado
              if (user.avatarUrl && !currentUser.avatarUrl) {
                const updatedUser = {
                  ...currentUser,
                  avatarUrl: user.avatarUrl,
                }
                localStorage.setItem("user", JSON.stringify(updatedUser))

                // También actualizar en registeredUsers
                const registeredUsers = JSON.parse(localStorage.getItem("registeredUsers") || "[]")
                const userIndex = registeredUsers.findIndex((u: any) => u.id === user.id)
                if (userIndex !== -1) {
                  registeredUsers[userIndex].avatarUrl = user.avatarUrl
                  localStorage.setItem("registeredUsers", JSON.stringify(registeredUsers))
                }
              }
            }
          }
        } catch (err) {
          console.error("Error checking avatar status:", err)
        }
      }, 5000) // Verificar cada 5 segundos

      return () => clearInterval(checkInterval)
    }
  }, [user, avatarSrc])

  // Calculate portfolio total value and performance
  const totalValue = portfolioHoldings.reduce((sum, holding) => sum + holding.value, 0)
  const totalInvested = portfolioHoldings.reduce((sum, holding) => sum + holding.averageCost * holding.shares, 0)
  const totalProfit = totalValue - totalInvested
  const totalProfitPercent = (totalProfit / totalInvested) * 100

  useEffect(() => {
    setActiveTab(activeTabState)
  }, [activeTabState, setActiveTab])

  // Forzar la visualización de las secciones de notificaciones cuando se cambia a la pestaña financial
  useEffect(() => {
    if (activeTab === "financial") {
      // No forzar notificaciones de ejemplo
      // Solo limpiar indicadores de notificaciones no leídas
      try {
        if (isClient) {
          localStorage.setItem("hasUnreadNotifications", "false")
        }
      } catch (err) {
        console.error("Error al actualizar estado de notificaciones:", err)
      }
    }
  }, [activeTab])

  // Modificar el useEffect para que solo marque como leídas las notificaciones de depósito, no las de retiro
  useEffect(() => {
    if (activeTab === "financial") {
      // Mark deposit notifications as read after a delay
      if (hasNewNotification && !notificationsRead) {
        const timer = setTimeout(() => {
          setNotificationsRead(true)
          // No desactivamos la notificación para que siga apareciendo
          // setHasNewNotification(false);
          // localStorage.setItem("pendingDepositVerification", "false");
        }, 3000)
        return () => clearTimeout(timer)
      }

      // No marcar automáticamente las notificaciones de retiro como leídas
      // para que el usuario pueda verlas
    }
  }, [activeTab, hasNewNotification, notificationsRead])

  // Añadir un nuevo useEffect para manejar específicamente las notificaciones de retiro
  useEffect(() => {
    if (activeTab === "financial") {
      // No marcamos automáticamente como leídas las notificaciones de retiro
      // El usuario debe hacer clic en el botón para marcarlas como leídas

      // Verificar si hay notificaciones nuevas para mostrar el punto rojo
      const hasNewNotifications = hasNewNotification || hasNewWithdrawalNotification || withdrawalApproved

      // Actualizar el estado para mostrar el punto rojo en el perfil
      if (hasNewNotifications) {
        // Aquí podríamos establecer un estado para mostrar el punto rojo en el perfil
        // Este estado se usaría en el componente MainNav
        try {
          if (isClient) {
            localStorage.setItem("hasUnreadNotifications", "true")
          }
        } catch (err) {
          console.error("Error al actualizar estado de notificaciones:", err)
        }
      }
    }
  }, [activeTab, hasNewNotification, hasNewWithdrawalNotification, withdrawalApproved])

  // Simular la llegada de una notificación después de enviar un comprobante
  useEffect(() => {
    if (tabParam === "financial" && typeof window !== "undefined") {
      // Simular que acabamos de recibir una notificación de depósito pendiente
      if (isClient) {
        localStorage.setItem("pendingDepositVerification", "true")
      }
      setHasNewNotification(true)
    }
  }, [tabParam])

  // Modificar el useEffect para marcar las notificaciones como leídas cuando se cambia a la pestaña financial
  useEffect(() => {
    if (activeTab === "financial" && hasNewNotification && !notificationsRead) {
      // Marcar como leídas después de un breve retraso para que el usuario pueda ver la notificación
      const timer = setTimeout(() => {
        setNotificationsRead(true)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [activeTab, hasNewNotification, notificationsRead])

  // Eliminar este useEffect que marca las notificaciones de retiro como leídas automáticamente
  // Ya no necesitamos que se marquen como leídas automáticamente

  // Añadir este código después del useEffect que carga los datos del usuario:

  // Añadir funciones para manejar los cambios
  const handleSaveWithdrawPassword = () => {
    if (newWithdrawPassword.length >= 8) {
      setWithdrawPassword(newWithdrawPassword)
      setEditWithdrawPassword(false)
      setNewWithdrawPassword("")
      // Aquí se podría añadir una llamada a la API para guardar la nueva contraseña
    }
  }

  // Modificar la función que se ejecuta cuando el usuario hace clic en la pestaña "financial"
  // para que marque las notificaciones como leídas y elimine el punto rojo

  // Añadir un useEffect para manejar la eliminación del punto rojo cuando el usuario ve las notificaciones
  useEffect(() => {
    if (activeTab === "financial") {
      // Clear the notification indicators immediately when the user views the financial tab
      try {
        if (isClient) {
          localStorage.setItem("hasUnreadNotifications", "false")
        }
      } catch (err) {
        console.error("Error al actualizar estado de notificaciones:", err)
      }

      // Don't immediately clear the notification states so the user can still see them
      const timer = setTimeout(() => {
        setNotificationsRead(true)
        setWithdrawalNotificationsRead(true)
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [activeTab])

  const handleSaveUsername = () => {
    if (newUsername.length >= 5) {
      setEditUsername(false)
      // Aquí se podría añadir una llamada a la API para guardar el nuevo nombre de usuario
    }
  }

  const handleSavePassword = () => {
    if (newPassword.length >= 8 && newPassword === confirmPassword) {
      setShowPassword(false)
      setEditPassword(false)
      setNewPassword("")
      setConfirmPassword("")
      // Aquí se podría añadir una llamada a la API para guardar la nueva contraseña
    }
  }

  const handleLogout = () => {
    if (isClient) {
      localStorage.removeItem("user")
    }
    router.push("/login")
  }

  // Mejorar la función handleAddReferralCode para que funcione correctamente
  const handleAddReferralCode = () => {
    if (!referralCode) {
      setReferralError("Por favor ingresa un código de referido")
      return
    }

    setIsProcessingReferral(true)
    setReferralError("")
    setReferralSuccess(false)

    // Simulamos la verificación del código de referido
    setTimeout(() => {
      try {
        // Obtener la lista de usuarios registrados
        const registeredUsers = isClient ? JSON.parse(localStorage.getItem("registeredUsers") || "[]") : []

        // Verificar si el código existe
        const referrer = registeredUsers.find((u: any) => u.referralCode === referralCode)

        if (!referrer) {
          setReferralError("El código de referido no es válido")
          setIsProcessingReferral(false)
          return
        }

        // Verificar que no sea el propio código del usuario
        if (user?.referralCode === referralCode) {
          setReferralError("No puedes usar tu propio código de referido")
          setIsProcessingReferral(false)
          return
        }

        // Verificar si ya está referido por alguien
        if (user?.referredBy) {
          setReferralError("Ya estás referido por otro usuario")
          setIsProcessingReferral(false)
          return
        }

        // Actualizar el usuario actual con el código de referido
        if (user) {
          const updatedUser = {
            ...user,
            referredBy: referralCode,
          }

          // Actualizar en localStorage
          if (isClient) {
            localStorage.setItem("user", JSON.stringify(updatedUser))
          }
          setUser(updatedUser)

          // Actualizar en la lista de usuarios registrados
          const userIndex = registeredUsers.findIndex((u: any) => u.id === user.id)
          if (userIndex !== -1) {
            registeredUsers[userIndex].referredBy = referralCode

            // Añadir este usuario a la lista de referidos del referente
            const referrerIndex = registeredUsers.findIndex((u: any) => u.referralCode === referralCode)
            if (referrerIndex !== -1) {
              if (!registeredUsers[referrerIndex].referrals) {
                registeredUsers[referrerIndex].referrals = []
              }

              // Verificar si ya está en la lista de referidos
              const alreadyReferred = registeredUsers[referrerIndex].referrals.some((ref: any) => ref.id === user.id)

              if (!alreadyReferred) {
                registeredUsers[referrerIndex].referrals.push({
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  date: new Date().toISOString(),
                  deposits: 0,
                  earnings: 0,
                })
              }

              // Guardar los cambios en localStorage
              if (isClient) {
                localStorage.setItem("registeredUsers", JSON.stringify(registeredUsers))
              }

              // Crear o actualizar los datos de referidos para el referente
              const referrerReferralData = isClient
                ? JSON.parse(
                    localStorage.getItem(`referralData_${referrer.id}`) || '{"referralItems":[],"withdrawalItems":[]}',
                  )
                : { referralItems: [], withdrawalItems: [] }

              // Añadir el nuevo referido a los datos de referidos del referente
              const newReferralItem = {
                id: `ref_${user.id}`,
                referredUser: {
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  avatar: `/placeholder_svg.png?height=96&width=96&text=${user.name.charAt(0)}`,
                },
                amount: 0, // Monto de ejemplo
                status: "pending",
                date: new Date().toISOString(),
                depositDate: new Date().toISOString(),
                availableDate: "",
              }

              // Verificar si ya existe este referido en los datos
              const existingIndex = referrerReferralData.referralItems.findIndex(
                (item: any) => item.referredUser && item.referredUser.id === user.id,
              )

              if (existingIndex === -1) {
                referrerReferralData.referralItems.push(newReferralItem)
                if (isClient) {
                  localStorage.setItem(`referralData_${referrer.id}`, JSON.stringify(referrerReferralData))
                }
              }

              // Notificar al referente que tiene un nuevo referido
              if (isClient) {
                localStorage.setItem(`newReferral_${referrer.id}`, "true")
                localStorage.setItem(`referralCommission_${referrer.id}`, "true")
              }
            }
          }

          setReferralSuccess(true)
          setReferralCode("")
        }
      } catch (err) {
        console.error("Error al procesar el código de referido:", err)
        setReferralError("Ocurrió un error al procesar el código de referido")
      }

      setIsProcessingReferral(false)
    }, 1000)
  }

  // Update the handleCopyLink function to show a proper notification
  const handleCopyLink = () => {
    navigator.clipboard
      .writeText(referralLink)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch((err) => {
        console.error("Error copying link:", err)
      })
  }

  const handleAvatarClick = () => {
    setShowAvatarUpload(true)
  }

  useEffect(() => {
    // Validar que el saldo no se actualice incorrectamente al cargar los datos del usuario
    if (user && isClient) {
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}")

      if (storedUser.balance !== user.balance) {
        console.warn("El saldo del usuario en localStorage no coincide con el estado actual.")
        setUser({ ...user, balance: storedUser.balance })
      }
    }
  }, [user])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Cargando...</p>
      </div>
    )
  }

  if (!user) return null

  // Añadir una sección que muestre claramente el interés diario basado en el nivel VIP del usuario
  // Buscar la sección donde se muestra la información del nivel VIP y añadir:
  const currentVipLevel = vipLevels[userVipLevel]
  const totalDeposits = userDeposits
  const remainingWithdrawals = currentVipLevel.retirosCantidad
  const dailyInterestRate = 0.02 // Example daily interest rate

  // Verificar si hay retiros pendientes o completados que coincidan con el ID del retiro principal
  const hasPendingWithdrawalWithId = pendingWithdrawals.some((w) => w.id === user?.withdrawalId)
  const hasCompletedWithdrawalWithId = completedWithdrawals.some((w) => w.id === user?.withdrawalId)
  const shouldShowMainWithdrawalNotification =
    hasNewWithdrawalNotification && !hasPendingWithdrawalWithId && !hasCompletedWithdrawalWithId
  const shouldShowApprovedWithdrawalNotification = withdrawalApproved && !hasCompletedWithdrawalWithId

  return (
    <div className="container mx-auto px-4 py-6 pb-20">
      {/* Back button */}
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" className="flex items-center gap-2 p-0">
            <ChevronLeft className="h-4 w-4" />
            <span>Volver</span>
          </Button>
        </Link>
      </div>

      {/* User profile header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6 mb-6">
          <div className="relative">
            <Avatar
              className="h-24 w-24 md:h-32 md:w-32 border-4 border-background shadow-lg cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleAvatarClick}
            >
              {avatarSrc && (avatarSrc.startsWith("data:image") || avatarSrc.startsWith("https://")) ? (
                <AvatarImage src={avatarSrc || "/placeholder.svg"} alt={user.name} />
              ) : (
                <AvatarImage
                  src={`/ceholder-svg-key-3p8rk-height-96-width-96-text-.jpg?key=3p8rk&height=96&width=96&text=${user.name.charAt(0)}`}
                  alt={user.name}
                />
              )}
              <AvatarFallback className="text-lg md:text-2xl bg-primary text-primary-foreground">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Badge className="absolute -bottom-2 -right-2 px-2 md:px-3 py-1 text-xs md:text-sm bg-primary text-primary-foreground">
              {user.status || "En espera"}
            </Badge>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />

            {showAvatarUpload && (
              <div
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                onClick={() => setShowAvatarUpload(false)}
              >
                <div
                  className="bg-background p-4 md:p-6 rounded-lg max-w-md w-full max-h-screen overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base md:text-lg font-medium">Cambiar foto de perfil</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setShowAvatarUpload(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {uploadingAvatar ? (
                    <div className="space-y-4 py-6 md:py-8">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-10 md:h-12 w-10 md:w-12 border-b-2 border-primary"></div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div
                          className="bg-primary h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-center text-xs md:text-sm text-muted-foreground">
                        Subiendo imagen... {uploadProgress}%
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div
                        className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 md:p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Camera className="h-6 md:h-8 w-6 md:w-8 text-muted-foreground" />
                          <p className="font-medium text-sm md:text-base">Haz clic para seleccionar una imagen</p>
                          <p className="text-xs md:text-sm text-muted-foreground">o arrastra y suelta aquí</p>
                          <p className="text-xs text-muted-foreground mt-2">Máximo 8 MB (JPEG, PNG, WebP)</p>
                        </div>
                      </div>
                      <div className="flex flex-col md:flex-row gap-2 md:gap-3">
                        <Button
                          variant="outline"
                          onClick={() => setShowAvatarUpload(false)}
                          className="text-sm md:text-base"
                        >
                          Cancelar
                        </Button>
                        <Button onClick={() => fileInputRef.current?.click()} className="text-sm md:text-base flex-1">
                          <Upload className="h-4 w-4 mr-2" />
                          Seleccionar archivo
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="text-center md:text-left flex-1 w-full md:w-auto">
            <h1 className="text-2xl md:text-3xl font-bold">{user.name}</h1>
            <div className="flex flex-col gap-1 md:gap-4 mt-1 md:mt-2 text-xs md:text-sm text-muted-foreground">
              <div className="flex items-center justify-center md:justify-start gap-1">
                <Calendar className="h-3 md:h-4 w-3 md:w-4" />
                <span>Miembro desde: {new Date().toLocaleDateString()}</span>
              </div>
              <div className="hidden md:flex items-center justify-start gap-1">
                <Clock className="h-4 w-4" />
                <span>Última conexión: Hoy, {new Date().toLocaleTimeString()}</span>
              </div>
              <div className="hidden md:flex items-center justify-start gap-1">
                <User className="h-4 w-4" />
                <span>ID: {user.id}</span>
              </div>
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-1 md:gap-2 mt-3 md:mt-4">
              <Button
                variant="outline"
                size="sm"
                className="text-xs md:text-sm rounded-full bg-transparent p-2 md:px-3"
                onClick={handleAvatarClick}
              >
                <User className="h-3 md:h-4 w-3 md:w-4 mr-1" />
                <span className="hidden md:inline">Cambiar foto</span>
                <span className="inline md:hidden">Foto</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs md:text-sm rounded-full bg-transparent p-2 md:px-3"
                onClick={handleLogout}
              >
                <LogOut className="h-3 md:h-4 w-3 md:w-4 mr-1" />
                <span className="hidden md:inline">Cerrar Sesión</span>
                <span className="inline md:hidden">Salir</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`text-xs md:text-sm rounded-full relative ${vipLevels[userVipLevel].color} text-white hover:text-white p-2 md:px-3`}
              >
                <Crown className="h-3 md:h-4 w-3 md:w-4 mr-1" />
                <span className="hidden md:inline">Nivel {vipLevels[userVipLevel].name}</span>
                <span className="inline md:hidden">{vipLevels[userVipLevel].name}</span>
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full md:w-auto">
            <Card className="bg-primary text-primary-foreground">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 md:h-5 w-4 md:w-5" />
                    <span className="font-medium text-xs md:text-sm">Saldo disponible</span>
                  </div>
                  <span className="text-lg md:text-xl font-bold">${user.balance.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
            <div className="flex gap-1 md:gap-2">
              <Link href="/deposit" className="flex-1">
                <Button className="w-full text-xs md:text-sm py-2 md:py-3">Depositar</Button>
              </Link>
              <Link href="/withdraw" className="flex-1">
                <Button variant="outline" className="w-full text-xs md:text-sm py-2 md:py-3 bg-transparent">
                  Retirar
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Profile tabs */}
      <Tabs defaultValue={activeTabParam} value={activeTab} onValueChange={setActiveTabState} className="mb-6">
        <TabsList className="mb-6 grid grid-cols-2 h-auto p-1">
          <TabsTrigger value="personal" className="py-3">
            <User className="h-4 w-4 mr-2 md:mr-2" />
            <span className="hidden md:inline">Información Personal</span>
          </TabsTrigger>
          <TabsTrigger value="financial" className="py-3 relative">
            <Wallet className="h-4 w-4 mr-2 md:mr-2" />
            <span className="hidden md:inline">Retiros, Depósitos e Historial</span>
            {(hasNewNotification || hasNewWithdrawalNotification || withdrawalApproved) && (
              <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full md:hidden"></span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Personal Information Tab */}
        <TabsContent value="personal" className="space-y-6">
          <div>
            <h2 className="text-xl font-bold">Información Personal</h2>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                <span>Contraseña de Retiro</span>{" "}
              </CardTitle>
              <CardDescription>Esta contraseña es necesaria para realizar retiros de fondos</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Contraseña de retiro actual</Label>
                  <div className="flex items-center mt-1">
                    <div className="font-medium flex items-center flex-1">
                      {showWithdrawPassword ? withdrawPassword : "••••••••••"}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 h-8 w-8 p-0"
                        onClick={() => setShowWithdrawPassword(!showWithdrawPassword)}
                      >
                        {showWithdrawPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setEditWithdrawPassword(true)}>
                      Cambiar
                    </Button>
                  </div>
                </div>
                {editWithdrawPassword && (
                  <div className="mt-4 space-y-3 border p-3 rounded-md">
                    <Label htmlFor="newWithdrawPassword">Nueva contraseña de retiro</Label>
                    <Input
                      id="newWithdrawPassword"
                      type="password"
                      value={newWithdrawPassword}
                      onChange={(e) => setNewWithdrawPassword(e.target.value)}
                      placeholder="Ingresa nueva contraseña de retiro"
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditWithdrawPassword(false)}>
                        Cancelar
                      </Button>
                      <Button size="sm" onClick={handleSaveWithdrawPassword}>
                        Guardar
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">La contraseña debe tener al menos 8 caracteres</p>
                  </div>
                )}
                <div className="mt-6 space-y-4 border-t pt-6">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span>Código de Referido</span>
                  </h3>

                  {referralSuccess && (
                    <div className="bg-green-50 p-3 rounded-md">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 shrink-0 mt-0.5 text-green-500" />
                        <p className="text-sm text-green-700">
                          ¡Código de referido registrado correctamente! Ahora formas parte del programa de referidos.
                        </p>
                      </div>
                    </div>
                  )}

                  {referralError && (
                    <div className="bg-red-50 p-3 rounded-md">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-500" />
                        <p className="text-sm text-red-700">{referralError}</p>
                      </div>
                    </div>
                  )}

                  {user?.referredBy ? (
                    <div className="bg-blue-50 p-3 rounded-md">
                      <div className="flex items-start gap-2">
                        <Info className="h-5 w-5 shrink-0 mt-0.5 text-blue-500" />
                        <div className="text-sm text-blue-700">
                          <p>
                            Ya estás referido con el código: <span className="font-bold">{user.referredBy}</span>
                          </p>
                          <p className="mt-1">Esto significa que formas parte del programa de referidos.</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Si tienes un código de referido, ingrésalo aquí para unirte al programa de referidos.
                      </p>
                      <div className="flex gap-3">
                        <Input
                          placeholder="Ingresa el código de referido"
                          value={referralCode}
                          onChange={(e) => setReferralCode(e.target.value)}
                          disabled={isProcessingReferral}
                        />
                        <Button onClick={handleAddReferralCode} disabled={isProcessingReferral}>
                          {isProcessingReferral ? "Procesando..." : "Aplicar"}
                        </Button>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Al unirte al programa de referidos, podrás ganar comisiones cuando tus referidos realicen depósitos.
                  </p>
                </div>

                <div className="mt-4 bg-amber-50 p-3 rounded-md">
                  <div className="flex items-start gap-2">
                    <Info className="h-5 w-5 shrink-0 mt-0.5 text-amber-500" />
                    <p className="text-sm text-amber-700">
                      Esta contraseña es obligatoria para realizar cualquier retiro de fondos. Asegúrate de que sea
                      segura y no la compartas con nadie.
                    </p>
                  </div>
                </div>

                <div className="mt-2">
                  <p className="text-sm text-muted-foreground">Última actualización: hace 15 días</p>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-green-600 w-4/5"></div>
                    </div>
                    <span className="text-green-600 font-medium">Fuerte</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <span>Credenciales de Acceso</span>
              </CardTitle>
              <CardDescription>Información utilizada para iniciar sesión en la plataforma</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div>
                  <Label className="text-sm text-muted-foreground">Nombre de usuario</Label>
                  <div className="flex items-center justify-between mt-1">
                    <div className="font-medium">{newUsername}</div>
                    <Button variant="outline" size="sm" onClick={() => setEditUsername(true)}>
                      Cambiar
                    </Button>
                  </div>
                  {editUsername && (
                    <div className="mt-2 space-y-3 border p-3 rounded-md">
                      <Label htmlFor="newUsername">Nuevo nombre de usuario</Label>
                      <Input
                        id="newUsername"
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="Ingresa nuevo nombre de usuario"
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditUsername(false)}>
                          Cancelar
                        </Button>
                        <Button size="sm" onClick={handleSaveUsername}>
                          Guardar
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        El nombre de usuario debe tener al menos 5 caracteres
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground">Contraseña</Label>
                  <div className="flex items-center justify-between mt-1">
                    <div className="font-medium flex items-center">
                      {showPassword ? "••••••••••••••" : "••••••••••••••"}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 h-8 w-8 p-0"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setEditPassword(true)}>
                      Cambiar
                    </Button>
                  </div>
                  {editPassword && (
                    <div className="mt-2 space-y-3 border p-3 rounded-md">
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">Nueva contraseña</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Ingresa nueva contraseña"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditPassword(false)}>
                          Cancelar
                        </Button>
                        <Button size="sm" onClick={handleSavePassword}>
                          Guardar
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">La contraseña debe tener al menos 8 caracteres</p>
                    </div>
                  )}
                  <div className="mt-2 text-sm">
                    <p className="text-muted-foreground">Última actualización: hace 30 días</p>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-green-600 w-4/5"></div>
                      </div>
                      <span className="text-green-600 font-medium">Fuerte</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground">Correos electrónicos</Label>
                  <div className="mt-1 space-y-4">
                    <div className="flex justify-between items-center pb-2">
                      <div>
                        <p className="font-medium">Correo principal</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        Verificado
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Information Tab */}
        <TabsContent value="financial" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Historial Financiero</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllDepositsModal(true)}
                className="hidden md:inline-flex"
              >
                Ver todos los depósitos
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllWithdrawalsModal(true)}
                className="hidden md:inline-flex"
              >
                Ver todos los retiros
              </Button>
            </div>
          </div>

          {/* Depósito Pendiente */}
          {(user.depositPending || hasNewNotification) && !depositNotificationsRead && (
            <Card className="border-yellow-400 bg-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-700">
                  <Info className="h-5 w-5" />
                  <span className="text-sm">Depósito Pendiente de Verificación</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-sm text-yellow-700">
                  Tu depósito de {user?.depositAmount} a través de {user?.depositMethod} está pendiente de verificación.
                  Te notificaremos cuando sea aprobado.
                </p>
                <p className="text-xs text-yellow-500 mt-1">Fecha de solicitud: {user?.depositPendingDate}</p>
                <div className="flex justify-end mt-2">
                  <Button variant="outline" size="sm" onClick={() => setDepositNotificationsRead(true)}>
                    Entendido
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Depósito Aprobado */}
          {(user.depositApproved || depositNotificationsRead) && !depositNotificationsRead && (
            <Card className="border-green-400 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm">Depósito Aprobado</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-sm text-green-700">
                  ¡Tu depósito de {user?.depositAmount} ha sido aprobado! Tu saldo se ha actualizado.
                </p>
                <p className="text-xs text-green-500 mt-1">Fecha de aprobación: {user?.depositApprovedDate}</p>
                <div className="flex justify-end mt-2">
                  <Button variant="outline" size="sm" onClick={() => setDepositNotificationsRead(true)}>
                    Entendido
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Retiro Aprobado */}
          {shouldShowApprovedWithdrawalNotification && (
            <Card className="border-green-400 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm">Retiro Aprobado</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-sm text-green-700">
                  Tu solicitud de retiro de {withdrawalAmount} ha sido aprobada. El dinero ha sido enviado.
                </p>
                <p className="text-xs text-green-500 mt-1">Fecha de aprobación: {new Date().toLocaleDateString()}</p>
                <div className="flex justify-end mt-2">
                  <Button variant="outline" size="sm" onClick={() => setWithdrawalNotificationsRead(true)}>
                    Entendido
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Retiro Pendiente */}
          {(hasNewWithdrawalNotification || pendingWithdrawals.length > 0) && !withdrawalNotificationsRead && (
            <Card className="border-yellow-400 bg-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-700">
                  <Info className="h-5 w-5" />
                  <span className="text-sm">Retiro Pendiente de Procesamiento</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-sm text-yellow-700">
                  Tu solicitud de retiro de {withdrawalAmount} a través de {withdrawalMethodName} está pendiente de
                  procesamiento. Te notificaremos cuando esté aprobado.
                </p>
                <p className="text-xs text-yellow-500 mt-1">Fecha de solicitud: {withdrawalDate}</p>
                <div className="flex justify-end mt-2">
                  <Button variant="outline" size="sm" onClick={() => setWithdrawalNotificationsRead(true)}>
                    Entendido
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Últimos Depósitos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                <span>Últimos Depósitos</span>
              </CardTitle>
              <CardDescription>Historial de tus depósitos recientes</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loadingDeposits ? (
                <div className="p-4 text-center">Cargando depósitos...</div>
              ) : dbDeposits && dbDeposits.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">ID</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Monto</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Método</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Fecha</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbDeposits.slice(0, 3).map((deposit) => (
                      <tr key={deposit.id} className="border-b last:border-b-0 hover:bg-accent/50">
                        <td className="px-4 py-3 text-sm">{deposit.id}</td>
                        <td className="px-4 py-3 text-sm">${deposit.amount.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm">{deposit.method_name || deposit.method}</td>
                        <td className="px-4 py-3 text-sm">{new Date(deposit.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm">
                          <Badge
                            variant="outline"
                            className={`${
                              deposit.status === "approved"
                                ? "bg-green-50 text-green-700 border-green-300"
                                : deposit.status === "pending"
                                  ? "bg-yellow-50 text-yellow-700 border-yellow-300"
                                  : "bg-red-50 text-red-700 border-red-300"
                            } capitalize`}
                          >
                            {deposit.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-4 text-center text-muted-foreground">No hay depósitos registrados.</div>
              )}
              <div className="p-4 border-t">
                <Button variant="link" className="p-0 h-auto" onClick={() => setShowAllDepositsModal(true)}>
                  Ver historial completo de depósitos
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Últimos Retiros */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                <span>Últimos Retiros</span>
              </CardTitle>
              <CardDescription>Historial de tus retiros recientes</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loadingWithdrawals ? (
                <div className="p-4 text-center">Cargando retiros...</div>
              ) : dbWithdrawals && dbWithdrawals.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">ID</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Monto</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Método</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Fecha</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbWithdrawals.slice(0, 3).map((withdrawal) => (
                      <tr key={withdrawal.id} className="border-b last:border-b-0 hover:bg-accent/50">
                        <td className="px-4 py-3 text-sm">{withdrawal.id}</td>
                        <td className="px-4 py-3 text-sm">${withdrawal.amount.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm">{withdrawal.method_name || withdrawal.method}</td>
                        <td className="px-4 py-3 text-sm">{new Date(withdrawal.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm">
                          <Badge
                            variant="outline"
                            className={`${
                              withdrawal.status === "approved"
                                ? "bg-green-50 text-green-700 border-green-300"
                                : withdrawal.status === "pending"
                                  ? "bg-yellow-50 text-yellow-700 border-yellow-300"
                                  : "bg-red-50 text-red-700 border-red-300"
                            } capitalize`}
                          >
                            {withdrawal.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-4 text-center text-muted-foreground">No hay retiros registrados.</div>
              )}
              <div className="p-4 border-t">
                <Button variant="link" className="p-0 h-auto" onClick={() => setShowAllWithdrawalsModal(true)}>
                  Ver historial completo de retiros
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modales para ver todos los depósitos y retiros */}
      {showAllDepositsModal && (
        <DepositModal onClose={() => setShowAllDepositsModal(false)} deposits={dbDeposits || []} />
      )}
      {showAllWithdrawalsModal && (
        <WithdrawalModal onClose={() => setShowAllWithdrawalsModal(false)} withdrawals={dbWithdrawals || []} />
      )}
    </div>
  )
}

// Modal para mostrar todos los depósitos
function DepositModal({ onClose, deposits }: { onClose: () => void; deposits: any[] }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-background p-4 md:p-6 rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base md:text-lg font-medium">Historial Completo de Depósitos</h3>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {deposits.length > 0 ? (
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Monto</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Método</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Fecha</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Estado</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Fecha Aprobación</th>
              </tr>
            </thead>
            <tbody>
              {deposits.map((deposit) => (
                <tr key={deposit.id} className="border-b last:border-b-0 hover:bg-accent/50">
                  <td className="px-4 py-3 text-sm">{deposit.id}</td>
                  <td className="px-4 py-3 text-sm">${deposit.amount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm">{deposit.method_name || deposit.method}</td>
                  <td className="px-4 py-3 text-sm">{new Date(deposit.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm">
                    <Badge
                      variant="outline"
                      className={`${
                        deposit.status === "approved"
                          ? "bg-green-50 text-green-700 border-green-300"
                          : deposit.status === "pending"
                            ? "bg-yellow-50 text-yellow-700 border-yellow-300"
                            : "bg-red-50 text-red-700 border-red-300"
                      } capitalize`}
                    >
                      {deposit.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {deposit.approved_at ? new Date(deposit.approved_at).toLocaleDateString() : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-4 text-center text-muted-foreground">No hay depósitos registrados.</div>
        )}
      </div>
    </div>
  )
}

// Modal para mostrar todos los retiros
function WithdrawalModal({ onClose, withdrawals }: { onClose: () => void; withdrawals: any[] }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-background p-4 md:p-6 rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base md:text-lg font-medium">Historial Completo de Retiros</h3>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {withdrawals.length > 0 ? (
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Monto</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Método</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Fecha</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Estado</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Fecha Aprobación</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map((withdrawal) => (
                <tr key={withdrawal.id} className="border-b last:border-b-0 hover:bg-accent/50">
                  <td className="px-4 py-3 text-sm">{withdrawal.id}</td>
                  <td className="px-4 py-3 text-sm">${withdrawal.amount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm">{withdrawal.method_name || withdrawal.method}</td>
                  <td className="px-4 py-3 text-sm">{new Date(withdrawal.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm">
                    <Badge
                      variant="outline"
                      className={`${
                        withdrawal.status === "approved"
                          ? "bg-green-50 text-green-700 border-green-300"
                          : withdrawal.status === "pending"
                            ? "bg-yellow-50 text-yellow-700 border-yellow-300"
                            : "bg-red-50 text-red-700 border-red-300"
                      } capitalize`}
                    >
                      {withdrawal.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {withdrawal.approved_at ? new Date(withdrawal.approved_at).toLocaleDateString() : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-4 text-center text-muted-foreground">No hay retiros registrados.</div>
        )}
      </div>
    </div>
  )
}
