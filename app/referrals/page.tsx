"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Share2,
  Copy,
  CheckCircle,
  Users,
  DollarSign,
  HelpCircle,
  Clock,
  Calendar,
  ArrowRight,
  TrendingUp,
  Info,
  Bitcoin,
  Coins,
  Lock,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Constante para el monto mínimo de retiro
const MINIMUM_WITHDRAWAL_AMOUNT = 50

// Estructura de comisiones por nivel VIP (porcentaje)
const VIP_WITHDRAWAL_FEES = [
  { level: 0, name: "Básico", fee: 5 }, // 5% de comisión
  { level: 1, name: "Principiante", fee: 4 }, // 4% de comisión
  { level: 2, name: "Bronce", fee: 3.5 }, // 3.5% de comisión
  { level: 3, name: "Plata", fee: 3 }, // 3% de comisión
  { level: 4, name: "Oro", fee: 2.5 }, // 2.5% de comisión
  { level: 5, name: "Platino", fee: 2 }, // 2% de comisión
  { level: 6, name: "Esmeralda", fee: 1.5 }, // 1.5% de comisión
  { level: 7, name: "Rubí", fee: 1 }, // 1% de comisión
  { level: 8, name: "Zafiro", fee: 0.8 }, // 0.8% de comisión
  { level: 9, name: "Diamante", fee: 0.5 }, // 0.5% de comisión
  { level: 10, name: "VIP Black", fee: 0 }, // 0% de comisión (sin comisión)
]

interface UserType {
  id: string
  name: string
  email: string
  referralCode: string
  referralEarnings?: number
  referrals?: Array<{
    id: string
    name: string
    email: string
    date: string
    deposits: number
    earnings: number
    lastDepositDate?: string
  }>
  balance?: number
  vipLevel?: number
}

interface ReferralItem {
  id: string
  referredUser: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  amount: number
  status: "pending" | "available" | "withdrawn"
  date: string
  depositDate: string
  availableDate: string
  joinDate: string // Fecha en que el referido se unió
  lastDepositDate?: string
}

interface WithdrawalItem {
  id: string
  amount: number
  status: "processing" | "completed" | "failed"
  date: string
  type: "withdrawal" | "transfer"
  method?: string
}

// Function to generate a unique withdrawal ID
const generateWithdrawalId = () => {
  return `WD-${Math.floor(100000 + Math.random() * 900000)}`
}

// Modificar la función formatDate para que muestre el formato día/mes/año
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
}

export default function ReferralsPage() {
  const isClient = typeof window !== "undefined"

  // Hooks
  const { toast } = useToast()
  const router = useRouter()
  const [user, setUser] = useState<UserType | null>(null)
  const [loading, setLoading] = useState(true)
  const [referralItems, setReferralItems] = useState<ReferralItem[]>([])
  const [withdrawalItems, setWithdrawalItems] = useState<WithdrawalItem[]>([])
  const [copied, setCopied] = useState(false)
  const [withdrawalProgress, setWithdrawalProgress] = useState(0)
  const [totalAvailableAmount, setTotalAvailableAmount] = useState(0)
  const [totalPendingAmount, setTotalPendingAmount] = useState(0)
  const [totalReferrals, setTotalReferrals] = useState(0)
  const [activeReferrals, setActiveReferrals] = useState(0)
  const [totalEarnings, setTotalEarnings] = useState(0)
  const [pendingReferrals, setPendingReferrals] = useState(0)
  const [monthlyEarnings, setMonthlyEarnings] = useState(0)
  const [processingAction, setProcessingAction] = useState(false)
  const [showSuccessAlert, setShowSuccessAlert] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [canWithdraw, setCanWithdraw] = useState(false)

  // Estado para el modal de retiro
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false)
  const [cryptoMethod, setCryptoMethod] = useState("bitcoin")
  const [cryptoAddress, setCryptoAddress] = useState("")
  const [withdrawalStep, setWithdrawalStep] = useState(1)

  // Añadir un estado para el nivel VIP del usuario y la comisión
  const [userVipLevel, setUserVipLevel] = useState(0)
  const [withdrawalFee, setWithdrawalFee] = useState(5) // Por defecto 5% (nivel básico)

  // Añadir una función para limpiar cualquier comisión que pudiera haberse añadido incorrectamente al saldo

  // Añadir esta función al inicio del componente, después de las declaraciones de estado
  const cleanupIncorrectlyAddedCommissions = useCallback(() => {
    if (!user || !isClient) return

    try {
      // Obtener todos los referidos del usuario
      const registeredUsers = JSON.parse(localStorage.getItem("registeredUsers") || "[]")
      const userReferrals = registeredUsers.filter((u: any) => u.referredBy === user.referralCode)

      // Calcular el total de comisiones que deberían estar en el sistema
      let totalCommissions = 0
      userReferrals.forEach((referral: any) => {
        // Verificar depósitos del referido
        const transactionHistory = JSON.parse(localStorage.getItem("transactionHistory") || "[]")
        const userDeposits = transactionHistory.filter(
          (t: any) =>
            t.userId === referral.id && t.type === "Depósito" && (t.status === "completed" || t.status === "approved"),
        )

        // Calcular depósitos totales
        const totalDeposits = userDeposits.reduce((sum: number, deposit: any) => sum + (deposit.amount || 0), 0)

        // Añadir comisión (2%)
        totalCommissions += totalDeposits * 0.02
      })

      // Obtener las comisiones ya retiradas o transferidas
      const referralData = JSON.parse(
        localStorage.getItem(`referralData_${user.id}`) || '{"referralItems":[],"withdrawalItems":[]}',
      )
      const withdrawnCommissions = referralData.withdrawalItems.reduce((sum: number, item: any) => {
        if (item.status === "completed") {
          return sum + item.amount
        }
        return sum
      }, 0)

      // Calcular comisiones que deberían estar en el sistema (pendientes o disponibles)
      const remainingCommissions = totalCommissions - withdrawnCommissions

      // Verificar si hay comisiones incorrectamente añadidas al saldo
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}")
      const currentBalance = currentUser.balance || 0

      // Si el saldo es mayor que lo esperado, podría haber comisiones incorrectamente añadidas
      // Pero no podemos simplemente restar, ya que el usuario podría haber hecho depósitos legítimos

      console.log("Comisiones totales generadas:", totalCommissions)
      console.log("Comisiones retiradas/transferidas:", withdrawnCommissions)
      console.log("Comisiones pendientes/disponibles:", remainingCommissions)

      // Actualizar los datos de referidos para asegurar que todas las comisiones están correctamente registradas
      const updatedReferralItems = [...referralItems]
      let totalTrackedCommissions = 0

      updatedReferralItems.forEach((item) => {
        if (item.status === "pending" || item.status === "available") {
          totalTrackedCommissions += item.amount
        }
      })

      console.log("Comisiones actualmente rastreadas:", totalTrackedCommissions)

      // Si hay una discrepancia significativa, podríamos necesitar una corrección manual
      if (Math.abs(totalTrackedCommissions - remainingCommissions) > 0.01) {
        console.warn("Posible discrepancia en las comisiones. Verificar manualmente.")
      }
    } catch (error) {
      console.error("Error al limpiar comisiones incorrectamente añadidas:", error)
    }
  }, [user, isClient, referralItems])

  // Calculate totals for display - Define this function first with useCallback
  const calculateTotals = useCallback((referrals: ReferralItem[], withdrawals: WithdrawalItem[]) => {
    // Available earnings (status = available)
    const availableItems = referrals.filter((item) => item.status === "available")
    const availableAmount = availableItems.reduce((sum, item) => sum + item.amount, 0)

    // Pending earnings (status = pending)
    const pendingItems = referrals.filter((item) => item.status === "pending")
    const pendingAmount = pendingItems.reduce((sum, item) => sum + item.amount, 0)

    // Total earnings (all statuses)
    const allEarnings = referrals.reduce((sum, item) => sum + item.amount, 0)

    // Monthly earnings (this month)
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()

    // Calcular ganancias mensuales basadas en la fecha de depósito, no en la fecha de creación del item
    const monthlyItems = referrals.filter((item) => {
      const depositDate = new Date(item.depositDate)
      return depositDate.getMonth() === currentMonth && depositDate.getFullYear() === currentYear
    })
    const monthlyAmount = monthlyItems.reduce((sum, item) => sum + item.amount, 0)

    setTotalAvailableAmount(availableAmount)
    setTotalPendingAmount(pendingAmount)
    setTotalReferrals(referrals.length)
    setActiveReferrals(availableItems.length)
    setPendingReferrals(pendingItems.length)
    setTotalEarnings(allEarnings)
    setMonthlyEarnings(monthlyAmount)

    // Calculate progress towards minimum withdrawal
    const progress = Math.min(Math.round((availableAmount / MINIMUM_WITHDRAWAL_AMOUNT) * 100), 100)
    setWithdrawalProgress(progress)

    // Determinar si se puede retirar (si el monto disponible es >= al mínimo)
    setCanWithdraw(availableAmount >= MINIMUM_WITHDRAWAL_AMOUNT)
  }, [])

  // Save referral data to localStorage
  const saveReferralDataToLocalStorage = useCallback(
    (userId: string, referrals: ReferralItem[], withdrawals: WithdrawalItem[]) => {
      try {
        localStorage.setItem(
          `referralData_${userId}`,
          JSON.stringify({
            referralItems: referrals,
            withdrawalItems: withdrawals,
          }),
        )
      } catch (error) {
        console.error("Error saving referral data:", error)
      }
    },
    [],
  )

  // Función para limpiar los datos de referidos existentes
  const clearExistingReferralData = useCallback(() => {
    if (!user || !isClient) return

    try {
      // Eliminar los datos de referidos existentes
      localStorage.removeItem(`referralData_${user.id}`)
      console.log("Datos de referidos eliminados correctamente")
    } catch (error) {
      console.error("Error al eliminar datos de referidos:", error)
    }
  }, [user, isClient])

  // Load referral data from localStorage or create mock data if none exists
  const loadReferralData = useCallback(
    (user: UserType) => {
      try {
        // Try to load from localStorage first
        const storedReferralData = localStorage.getItem(`referralData_${user.id}`)

        if (storedReferralData) {
          const parsedData = JSON.parse(storedReferralData)
          setReferralItems(parsedData.referralItems || [])
          setWithdrawalItems(parsedData.withdrawalItems || [])
          calculateTotals(parsedData.referralItems || [], parsedData.withdrawalItems || [])
        } else {
          // Si no hay datos almacenados, generarlos a partir de los referidos del usuario
          const generatedReferralItems: ReferralItem[] = []

          // Obtener la lista de usuarios registrados
          const registeredUsers = isClient ? JSON.parse(localStorage.getItem("registeredUsers") || "[]") : []

          // Buscar todos los usuarios que tienen como referredBy el código de referido del usuario actual
          const userReferrals = registeredUsers.filter((u: any) => u.referredBy === user.referralCode)

          // Si hay referidos, crear los items correspondientes
          if (userReferrals && userReferrals.length > 0) {
            userReferrals.forEach((referral: any) => {
              // Verificar si el referido ha realizado depósitos
              let hasDeposits = false
              let totalDeposits = 0
              let depositDate = new Date().toISOString()
              let commission = 0
              const joinDate = referral.registrationDate || new Date().toISOString()

              try {
                // Verificar si hay depósitos en el historial de transacciones
                const transactionHistory = isClient
                  ? JSON.parse(localStorage.getItem("transactionHistory") || "[]")
                  : []

                // Buscar depósitos directos y comisiones
                const userDeposits = transactionHistory.filter(
                  (t: any) =>
                    t.userId === referral.id &&
                    t.type === "Depósito" &&
                    (t.status === "completed" || t.status === "approved"),
                )

                // También buscar comisiones específicas para este referido
                const referralCommissions = transactionHistory.filter(
                  (t: any) =>
                    t.type === "Comisión de Referido" && t.referredUserId === referral.id && t.status === "completed",
                )

                hasDeposits = userDeposits.length > 0

                if (hasDeposits) {
                  // Calcular el total de depósitos
                  totalDeposits = userDeposits.reduce((sum: number, deposit: any) => sum + (deposit.amount || 0), 0)

                  // Calcular comisión (2% de los depósitos)
                  commission = totalDeposits * 0.02

                  // Verificar si ya hay comisiones registradas para este referido
                  if (referralCommissions.length > 0) {
                    // Usar la comisión ya calculada en lugar de recalcular
                    const totalCommissions = referralCommissions.reduce(
                      (sum: number, comm: any) => sum + (comm.amount || 0),
                      0,
                    )
                    commission = totalCommissions
                  }

                  // Usar la fecha del último depósito
                  if (userDeposits.length > 0) {
                    const sortedDeposits = [...userDeposits].sort(
                      (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime(),
                    )
                    depositDate = sortedDeposits[0].date || new Date().toISOString()
                  }
                } else {
                  // FORZAR comisión a 0 si no hay depósitos
                  commission = 0
                }
              } catch (error) {
                console.error("Error al verificar depósitos del referido:", error)
                hasDeposits = false
                commission = 0 // Asegurar que la comisión sea 0 en caso de error
              }

              // Verificar si es un referido nuevo (agregado recientemente)
              const isNewReferral = localStorage.getItem(`newReferral_${referral.id}`) === "true"

              // Verificar la fecha de registro para determinar si es un referido reciente
              const userRegistrationDate = new Date(referral.registrationDate || new Date().toISOString())
              const currentDate = new Date()
              const daysSinceRegistration = Math.floor(
                (currentDate.getTime() - userRegistrationDate.getTime()) / (1000 * 60 * 60 * 24),
              )
              const isRecentRegistration = daysSinceRegistration < 1 // Considerar como nuevo si se registró hace menos de 1 día

              // Crear referral item: siempre como "pending"
              const referralItem: ReferralItem = {
                id: `ref_${referral.id}`,
                referredUser: {
                  id: referral.id,
                  name: referral.name,
                  email: referral.email,
                  avatar: `/placeholder.svg?height=40&width=40&text=${referral.name.charAt(0)}`,
                },
                // Forzar comisión a 0 si es un referido nuevo, reciente o no tiene depósitos
                amount: isNewReferral || isRecentRegistration || !hasDeposits ? 0 : commission,
                status: "pending", // Se mantiene pendiente hasta los 14 días
                date: new Date().toISOString(),
                depositDate: depositDate,
                availableDate: "",
                joinDate: joinDate, // Guardar la fecha en que el referido se unió
              }

              // Si es un referido nuevo, limpiar la bandera después de procesarlo
              if (isNewReferral) {
                localStorage.removeItem(`newReferral_${referral.id}`)
              }

              generatedReferralItems.push(referralItem)
            })
          }

          // Load withdrawal history
          const withdrawalHistory = localStorage.getItem(`withdrawalHistory_${user.id}`)
            ? JSON.parse(localStorage.getItem(`withdrawalHistory_${user.id}`) || "[]")
            : []

          setReferralItems(generatedReferralItems)
          setWithdrawalItems(withdrawalHistory)
          calculateTotals(generatedReferralItems, withdrawalHistory)

          // Save to localStorage
          saveReferralDataToLocalStorage(user.id, generatedReferralItems, withdrawalHistory)
        }
      } catch (error) {
        console.error("Error loading referral data:", error)
        setReferralItems([])
        setWithdrawalItems([])
      }
    },
    [isClient, calculateTotals, saveReferralDataToLocalStorage],
  )

  // Modificar la función updateEarningsStatus para que no genere notificaciones incorrectas
  // Buscar esta función y reemplazarla con la siguiente versión:

  const updateEarningsStatus = useCallback(() => {
    if (!user) return

    const updatedReferralItems = [...referralItems]
    let changed = false

    // Ordenar los items por fecha de depósito (más antiguos primero)
    updatedReferralItems.sort((a, b) => {
      return new Date(a.depositDate).getTime() - new Date(b.depositDate).getTime()
    })

    updatedReferralItems.forEach((item) => {
      // If item is pending and 14 days have passed since deposit
      if (item.status === "pending") {
        const depositDate = new Date(item.depositDate)
        const currentDate = new Date()
        const daysDifference = Math.floor((currentDate.getTime() - depositDate.getTime()) / (1000 * 60 * 60 * 24))

        if (daysDifference >= 14) {
          item.status = "available"
          item.availableDate = new Date().toISOString()
          changed = true

          // Notificar al usuario que tiene ganancias disponibles
          if (isClient) {
            localStorage.setItem("referralEarningsAvailable", "true")
            localStorage.setItem("hasUnreadNotifications", "true")
            // NO generar notificación de comisión recibida aquí
          }
        }
      }
    })

    if (changed) {
      setReferralItems(updatedReferralItems)
      calculateTotals(updatedReferralItems, withdrawalItems)

      // Update localStorage
      saveReferralDataToLocalStorage(user.id, updatedReferralItems, withdrawalItems)
    }
  }, [user, referralItems, withdrawalItems, calculateTotals, saveReferralDataToLocalStorage, isClient])

  // Load user data and referral information
  useEffect(() => {
    const loadUserData = () => {
      try {
        setLoading(true)
        const userData = localStorage.getItem("user")

        if (!userData) {
          router.push("/login")
          return
        }

        const parsedUser = JSON.parse(userData)

        // If no referral code, generate one
        if (!parsedUser.referralCode) {
          parsedUser.referralCode = generateReferralCode(parsedUser.id)
          localStorage.setItem("user", JSON.stringify(parsedUser))
        }

        // Obtener el nivel VIP del usuario
        const vipLevel = parsedUser.vipLevel || 0
        setUserVipLevel(vipLevel)

        // Establecer la comisión según el nivel VIP
        const feeInfo = VIP_WITHDRAWAL_FEES.find((fee) => fee.level === vipLevel) || VIP_WITHDRAWAL_FEES[0]
        setWithdrawalFee(feeInfo.fee)

        setUser(parsedUser)
      } catch (error) {
        console.error("Error loading user data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [router])

  // Add a separate useEffect to load referral data only when user changes
  useEffect(() => {
    if (user) {
      loadReferralData(user)
    }
  }, [user, loadReferralData])

  // Add a separate useEffect for the interval to update earnings status
  useEffect(() => {
    if (!user) return

    // Set up interval to check for earnings that should move from pending to available
    const interval = setInterval(() => {
      updateEarningsStatus()
    }, 10000) // Check every 10 seconds

    return () => clearInterval(interval)
  }, [user, updateEarningsStatus])

  // Añadir este useEffect después del useEffect principal
  useEffect(() => {
    // Este efecto se ejecutará cuando se monte el componente
    // y limpiará los datos de referidos existentes para asegurar
    // que se generen correctamente
    if (user && isClient) {
      // Verificar si hay datos almacenados
      const storedReferralData = localStorage.getItem(`referralData_${user.id}`)

      // Si hay datos almacenados, verificar si tienen la estructura correcta
      if (storedReferralData) {
        try {
          const parsedData = JSON.parse(storedReferralData)
          const referralItems = parsedData.referralItems || []

          // Verificar si hay referidos con comisiones incorrectas
          const hasIncorrectCommissions = referralItems.some((item: ReferralItem) => {
            // Si tiene comisión pero no hay depósitos registrados en el historial de transacciones
            if (item.amount > 0) {
              // Verificar en el historial de transacciones
              const transactionHistory = JSON.parse(localStorage.getItem("transactionHistory") || "[]")
              const userDeposits = transactionHistory.filter(
                (t: any) =>
                  t.userId === item.referredUser.id &&
                  t.type === "Depósito" &&
                  (t.status === "completed" || t.status === "approved"),
              )

              // Si no hay depósitos pero hay comisión, es incorrecto
              return userDeposits.length === 0
            }
            return false
          })

          // Verificar si los items tienen la propiedad joinDate
          const missingJoinDate = referralItems.some((item: ReferralItem) => !item.joinDate)

          if (hasIncorrectCommissions || missingJoinDate) {
            console.log("Se encontraron datos incorrectos, limpiando datos...")
            clearExistingReferralData()
          }
        } catch (error) {
          console.error("Error al verificar datos de referidos:", error)
          // En caso de error, limpiar los datos
          clearExistingReferralData()
        }
      }
    }
  }, [user, isClient, clearExistingReferralData])

  // Add this useEffect inside the ReferralsPage component, after the other useEffect hooks
  useEffect(() => {
    // Check if there's a new referral added flag
    if (isClient && localStorage.getItem("newReferralAdded") === "true") {
      console.log("Detectada adición de nuevo referido, regenerando datos...")

      // Clear the flag
      localStorage.removeItem("newReferralAdded")

      // Asegurarse de que todos los referidos nuevos tengan comisión 0
      try {
        const registeredUsers = JSON.parse(localStorage.getItem("registeredUsers") || "[]")
        let updated = false

        registeredUsers.forEach((user) => {
          if (localStorage.getItem(`newReferral_${user.id}`) === "true") {
            console.log(`Marcando referido ${user.id} con comisión inicial 0`)
            // No eliminamos la bandera aquí, se hará en loadReferralData
            updated = true
          }
        })

        // Solo si encontramos referidos nuevos, limpiamos y recargamos
        if (updated && user) {
          // Forzar limpieza de datos existentes
          clearExistingReferralData()

          // Pequeño retraso para asegurar que la limpieza se complete
          setTimeout(() => {
            // Recargar datos de referidos
            loadReferralData(user)
          }, 100)
        }
      } catch (error) {
        console.error("Error al procesar nuevos referidos:", error)
      }
    }
  }, [user, isClient, clearExistingReferralData, loadReferralData])

  // Efecto para actualizar las comisiones cuando hay nuevos depósitos
  useEffect(() => {
    if (!user || !isClient) return

    const checkForNewDeposits = () => {
      try {
        // Obtener el historial de transacciones
        const transactionHistory = JSON.parse(localStorage.getItem("transactionHistory") || "[]")

        // Filtrar solo los depósitos aprobados
        const approvedDeposits = transactionHistory.filter(
          (t: any) => t.type === "Depósito" && (t.status === "approved" || t.status === "completed"),
        )

        // También buscar transacciones de comisiones
        const commissionTransactions = transactionHistory.filter(
          (t: any) => t.type === "Comisión de Referido" && t.status === "completed" && t.userId === user.id,
        )

        // Verificar si hay nuevos depósitos para los referidos
        const updatedItems = [...referralItems]
        let hasUpdates = false

        // Obtener la lista de usuarios registrados para verificar referidos
        const registeredUsers = JSON.parse(localStorage.getItem("registeredUsers") || "[]")
        const userReferrals = registeredUsers.filter((u: any) => u.referredBy === user.referralCode)

        // Para cada referido, verificar si hay depósitos nuevos
        for (const referral of userReferrals) {
          // Buscar el item de referido correspondiente
          const referralItemIndex = updatedItems.findIndex((item) => item.referredUser.id === referral.id)

          // Buscar depósitos del referido
          const referralDeposits = approvedDeposits.filter((d: any) => d.userId === referral.id)

          // Buscar comisiones específicas para este referido
          const referralCommissions = commissionTransactions.filter((c: any) => c.referredUserId === referral.id)

          if (referralDeposits.length > 0) {
            // Calcular el total de depósitos
            const totalDeposits = referralDeposits.reduce((sum: number, d: any) => sum + (d.amount || 0), 0)

            // Calcular la comisión (2%)
            let expectedCommission = totalDeposits * 0.02

            // Si hay comisiones registradas, usar ese valor
            if (referralCommissions.length > 0) {
              expectedCommission = referralCommissions.reduce((sum: number, c: any) => sum + (c.amount || 0), 0)
            }

            // Obtener la fecha del último depósito
            const latestDeposit = [...referralDeposits].sort(
              (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime(),
            )[0]

            if (referralItemIndex !== -1) {
              // Actualizar el item existente si la comisión calculada es diferente
              if (Math.abs(updatedItems[referralItemIndex].amount - expectedCommission) > 0.01) {
                updatedItems[referralItemIndex].amount = expectedCommission
                updatedItems[referralItemIndex].depositDate = latestDeposit.date
                updatedItems[referralItemIndex].status = "pending" // Reiniciar a pendiente con cada nuevo depósito
                hasUpdates = true
                console.log(`Actualizando comisión para ${referral.name} a ${expectedCommission}`)
              }
            } else {
              // Crear un nuevo item si no existe
              const newReferralItem = {
                id: `ref_${referral.id}`,
                referredUser: {
                  id: referral.id,
                  name: referral.name,
                  email: referral.email,
                  avatar: `/placeholder.svg?height=40&width=40&text=${referral.name.charAt(0)}`,
                },
                amount: expectedCommission,
                status: "pending",
                date: new Date().toISOString(),
                depositDate: latestDeposit.date,
                availableDate: "",
                joinDate: referral.registrationDate || new Date().toISOString(),
              }

              updatedItems.push(newReferralItem)
              hasUpdates = true
              console.log(`Añadiendo nuevo referido ${referral.name} con comisión ${expectedCommission}`)
            }
          }
        }

        if (hasUpdates) {
          console.log("Actualizando datos de referidos con nuevos depósitos")
          setReferralItems(updatedItems)
          calculateTotals(updatedItems, withdrawalItems)
          saveReferralDataToLocalStorage(user.id, updatedItems, withdrawalItems)
        }
      } catch (error) {
        console.error("Error al verificar nuevos depósitos:", error)
      }
    }

    // Verificar al cargar y luego cada 30 segundos
    checkForNewDeposits()
    const interval = setInterval(checkForNewDeposits, 30000)

    return () => clearInterval(interval)
  }, [user, isClient, referralItems, withdrawalItems, calculateTotals, saveReferralDataToLocalStorage])

  // Añadir un nuevo useEffect para detectar nuevos depósitos de referidos
  // Añadir este código después de los otros useEffect en app/referrals/page.tsx:

  // Efecto para detectar nuevos depósitos de referidos
  useEffect(() => {
    if (!user || !isClient) return

    // Verificar si hay una nueva notificación de depósito de referido
    const newReferralDeposit = localStorage.getItem("newReferralDeposit")

    if (newReferralDeposit === "true") {
      // Limpiar la notificación
      localStorage.removeItem("newReferralDeposit")

      // Recargar los datos de referidos
      if (user) {
        loadReferralData(user)
      }
    }
  }, [user, isClient, loadReferralData])

  // Añadir un useEffect para ejecutar esta función al cargar la página
  useEffect(() => {
    if (user) {
      cleanupIncorrectlyAddedCommissions()
    }
  }, [user, cleanupIncorrectlyAddedCommissions])

  // Generate referral code
  const generateReferralCode = (userId: string) => {
    return `REF${Math.floor(100000 + Math.random() * 900000)}`
  }

  // Copy referral link
  const copyReferralLink = () => {
    if (!user) return

    const referralLink = `${window.location.origin}/register?ref=${user.referralCode}`
    navigator.clipboard.writeText(referralLink)

    setCopied(true)
    toast({
      title: "Enlace copiado",
      description: "El enlace de referido ha sido copiado al portapapeles",
    })

    setTimeout(() => setCopied(false), 2000)
  }

  // Share referral link
  const shareReferralLink = () => {
    if (!user) return

    const referralLink = `${window.location.origin}/register?ref=${user.referralCode}`

    if (navigator.share) {
      navigator
        .share({
          title: "Únete con mi código de referido",
          text: "¡Regístrate usando mi enlace de referido y obtén beneficios!",
          url: referralLink,
        })
        .catch((error) => console.log("Error sharing:", error))
    } else {
      copyReferralLink()
    }
  }

  // Función para forzar la limpieza de todos los datos de referidos
  const forceCleanAllReferralData = () => {
    if (!isClient) return

    try {
      // Obtener todas las claves de localStorage
      const allKeys = Object.keys(localStorage)

      // Filtrar las claves relacionadas con referidos
      const referralKeys = allKeys.filter((key) => key.startsWith("referralData_") || key.startsWith("newReferral_"))

      // Eliminar todos los datos de referidos
      referralKeys.forEach((key) => {
        localStorage.removeItem(key)
      })

      // Eliminar la bandera general de nuevo referido
      localStorage.removeItem("newReferralAdded")

      console.log("Todos los datos de referidos han sido eliminados")

      // Recargar la página para regenerar los datos
      window.location.reload()
    } catch (error) {
      console.error("Error al limpiar todos los datos de referidos:", error)
    }
  }

  // Handle withdrawal request
  const handleWithdrawal = () => {
    if (!user || processingAction || !canWithdraw) return
    setShowWithdrawalModal(true)
  }

  const handleCryptoMethodChange = (value: string) => {
    setCryptoMethod(value)
  }

  const handleCryptoAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCryptoAddress(e.target.value)
  }

  const handleCancelWithdrawal = () => {
    setShowWithdrawalModal(false)
    setWithdrawalStep(1)
    setCryptoAddress("")
  }

  const handleContinueWithdrawal = () => {
    setWithdrawalStep(2)
  }

  const handleConfirmWithdrawal = () => {
    if (!user || processingAction || !cryptoAddress || !canWithdraw) return

    setProcessingAction(true)

    // Calcular el monto después de la comisión
    const feeAmount = totalAvailableAmount * (withdrawalFee / 100)
    const amountAfterFee = totalAvailableAmount - feeAmount

    // Crear registro de retiro
    const withdrawalId = generateWithdrawalId()
    const withdrawalDate = new Date().toISOString()

    const newWithdrawal: WithdrawalItem = {
      id: withdrawalId,
      amount: totalAvailableAmount,
      status: "processing",
      date: withdrawalDate,
      type: "withdrawal",
      method: cryptoMethod === "bitcoin" ? "Bitcoin" : "Ethereum",
    }

    // Actualizar los elementos de retiro
    const updatedWithdrawalItems = [...withdrawalItems, newWithdrawal]
    setWithdrawalItems(updatedWithdrawalItems)

    // Marcar las ganancias disponibles como retiradas
    const updatedReferralItems = referralItems.map((item) => {
      if (item.status === "available") {
        return { ...item, status: "withdrawn" }
      }
      return item
    })

    setReferralItems(updatedReferralItems)

    // Crear notificación de ganancia en la sección "Ganancias"
    const transactionHistory = JSON.parse(localStorage.getItem("transactionHistory") || "[]")
    transactionHistory.push({
      id: withdrawalId,
      type: "Retiro de Referidos",
      userId: user.id,
      userName: user.name,
      amount: totalAvailableAmount,
      amountAfterFee: amountAfterFee,
      fee: withdrawalFee,
      method: cryptoMethod === "bitcoin" ? "Bitcoin" : "Ethereum",
      methodName: cryptoMethod === "bitcoin" ? "Bitcoin" : "Ethereum",
      cryptoAddress: cryptoAddress,
      date: withdrawalDate,
      status: "pending",
      vipLevel: userVipLevel,
    })

    localStorage.setItem("transactionHistory", JSON.stringify(transactionHistory))

    // Actualizar localStorage
    saveReferralDataToLocalStorage(user.id, updatedReferralItems, updatedWithdrawalItems)

    // Mostrar mensaje de éxito
    setSuccessMessage(
      `Tu solicitud de retiro por $${totalAvailableAmount.toFixed(2)} ha sido enviada y está en proceso. Recibirás $${amountAfterFee.toFixed(2)} después de la comisión.`,
    )
    setShowSuccessAlert(true)

    // Actualizar totales
    calculateTotals(updatedReferralItems, updatedWithdrawalItems)

    setProcessingAction(false)
    setShowWithdrawalModal(false)
    setWithdrawalStep(1)
    setCryptoAddress("")
  }

  // Actualización de la función handleTransferToBalance para que se ejecute solo si la acción fue iniciada por el usuario
  const handleTransferToBalance = () => {
    // Comprobar que la acción es iniciada por el usuario
    if (!localStorage.getItem("userInitiatedTransfer")) return
    // Remover la bandera para evitar llamadas repetidas
    localStorage.removeItem("userInitiatedTransfer")

    if (!user || processingAction || !canWithdraw) return
    setProcessingAction(true)

    // Validar que el monto disponible sea mayor a 0 antes de continuar
    if (totalAvailableAmount <= 0) {
      console.error("El monto disponible es 0 o menor. No se puede transferir.")
      setProcessingAction(false)
      return
    }

    // Crear registro de transferencia
    const transferId = `TR-${Math.floor(100000 + Math.random() * 900000)}`
    const transferDate = new Date().toISOString()

    const newTransfer: WithdrawalItem = {
      id: transferId,
      amount: totalAvailableAmount,
      status: "completed", // Las transferencias se completan inmediatamente
      date: transferDate,
      type: "transfer",
      method: "Saldo de Referidos",
    }

    // Actualizar los elementos de retiro
    const updatedWithdrawalItems = [...withdrawalItems, newTransfer]
    setWithdrawalItems(updatedWithdrawalItems)

    // Marcar las ganancias disponibles como retiradas
    const updatedReferralItems = referralItems.map((item) => {
      if (item.status === "available") {
        return { ...item, status: "withdrawn" }
      }
      return item
    })

    setReferralItems(updatedReferralItems)

    // Actualizar el saldo del usuario
    try {
      // Validar que el usuario exista y que el saldo no se actualice sin motivo
      if (user && totalAvailableAmount > 0) {
        const updatedUser = { ...user }
        updatedUser.balance = (updatedUser.balance || 0) + totalAvailableAmount
        setUser(updatedUser)
        localStorage.setItem("user", JSON.stringify(updatedUser))

        // Actualizar en la lista de usuarios registrados
        const registeredUsers = JSON.parse(localStorage.getItem("registeredUsers") || "[]")
        const userIndex = registeredUsers.findIndex((u: any) => u.id === user.id)

        if (userIndex !== -1) {
          registeredUsers[userIndex].balance = (registeredUsers[userIndex].balance || 0) + totalAvailableAmount
          localStorage.setItem("registeredUsers", JSON.stringify(registeredUsers))
        }

        // Añadir al historial de transacciones
        const transactionHistory = JSON.parse(localStorage.getItem("transactionHistory") || "[]")
        transactionHistory.push({
          id: transferId,
          type: "Transferencia",
          userId: user.id,
          userName: user.name,
          amount: totalAvailableAmount,
          method: "Saldo de Referidos",
          methodName: "Comisiones de Referidos",
          date: transferDate,
          status: "completed",
        })

        localStorage.setItem("transactionHistory", JSON.stringify(transactionHistory))
      }
    } catch (error) {
      console.error("Error al actualizar el saldo:", error)
    }

    // Guardar los datos actualizados en localStorage
    saveReferralDataToLocalStorage(user.id, updatedReferralItems, updatedWithdrawalItems)

    // Notificar al usuario
    setSuccessMessage(`$${totalAvailableAmount.toFixed(2)} han sido transferidos exitosamente a tu saldo.`)
    setShowSuccessAlert(true)

    // Actualizar totales
    calculateTotals(updatedReferralItems, updatedWithdrawalItems)

    setProcessingAction(false)
  }

  // Calculate days remaining until available
  const getDaysRemaining = (depositDate: string) => {
    const deposit = new Date(depositDate)
    const current = new Date()
    const daysPassed = Math.floor((current.getTime() - deposit.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(14 - daysPassed, 0)
  }

  // Función para forzar la actualización cuando se detecta un nuevo referido
  // Eliminar la función forceUpdateForNewReferral ya que no se utiliza directamente
  // const forceUpdateForNewReferral = useCallback(
  //   (referralId) => {
  //     if (!isClient || !user) return

  //     console.log(`Forzando actualización para nuevo referido: ${referralId}`)

  //     // Marcar como nuevo referido
  //     localStorage.setItem(`newReferral_${referralId}`, "true")

  //     // Activar bandera general de nuevo referido
  //     localStorage.setItem("newReferralAdded", "true")

  //     // Limpiar datos existentes
  //     clearExistingReferralData()

  //     // Recargar datos después de un pequeño retraso
  //     setTimeout(() => {
  //       loadReferralData(user)
  //     }, 100)
  //   },
  //   [isClient, user, clearExistingReferralData, loadReferralData],
  // )

  // Función para verificar y actualizar los referidos en tiempo real
  const checkAndUpdateReferrals = useCallback(() => {
    if (!isClient || !user) return

    console.log("Verificando actualizaciones de referidos en tiempo real...")

    try {
      // Obtener la lista de usuarios registrados
      const registeredUsers = JSON.parse(localStorage.getItem("registeredUsers") || "[]")

      // Buscar todos los usuarios que tienen como referredBy el código de referido del usuario actual
      const userReferrals = registeredUsers.filter((u) => u.referredBy === user.referralCode)

      // Verificar si hay nuevos referidos que no estén en la lista actual
      const currentReferralIds = referralItems.map((item) => item.referredUser.id)
      const newReferrals = userReferrals.filter((u) => !currentReferralIds.includes(u.id))

      if (newReferrals.length > 0) {
        console.log(`Se encontraron ${newReferrals.length} nuevos referidos no registrados en la interfaz`)

        // Marcar los nuevos referidos
        newReferrals.forEach((referral) => {
          localStorage.setItem(`newReferral_${referral.id}`, "true")
        })

        // Activar bandera general de nuevo referido
        localStorage.setItem("newReferralAdded", "true")

        // Forzar limpieza y recarga de datos
        clearExistingReferralData()

        // Recargar datos después de un pequeño retraso
        setTimeout(() => {
          loadReferralData(user)
        }, 100)

        return true // Indica que se encontraron y procesaron nuevos referidos
      }

      return false // No se encontraron nuevos referidos
    } catch (error) {
      console.error("Error al verificar nuevos referidos:", error)
      return false
    }
  }, [isClient, user, referralItems, clearExistingReferralData, loadReferralData])

  // Loading state
  const [hasCheckedReferrals, setHasCheckedReferrals] = useState(false)

  useEffect(() => {
    if (user && !hasCheckedReferrals) {
      checkAndUpdateReferrals()
      setHasCheckedReferrals(true)
    }
  }, [user, checkAndUpdateReferrals, hasCheckedReferrals])

  // Verificar periódicamente si hay nuevos referidos
  useEffect(() => {
    if (!user) return

    // Configurar intervalo para verificar cada 5 segundos
    const interval = setInterval(() => {
      checkAndUpdateReferrals()
    }, 5000)

    return () => clearInterval(interval)
  }, [user, checkAndUpdateReferrals])

  // Verificar si hay actualizaciones de estado de retiros
  useEffect(() => {
    if (!user || !isClient) return

    const checkWithdrawalStatusUpdates = () => {
      try {
        // Obtener los retiros pendientes
        const pendingWithdrawals = JSON.parse(localStorage.getItem("pendingWithdrawals") || "[]")

        // Verificar si alguno de nuestros retiros ha sido actualizado
        const updatedWithdrawalItems = [...withdrawalItems]
        let hasUpdates = false

        for (let i = 0; i < updatedWithdrawalItems.length; i++) {
          const item = updatedWithdrawalItems[i]

          if (item.type === "withdrawal" && item.status === "processing") {
            // Buscar este retiro en los pendingWithdrawals
            const pendingWithdrawal = pendingWithdrawals.find((w: any) => w.id === item.id)

            if (pendingWithdrawal) {
              // Si el estado ha cambiado, actualizar
              if (pendingWithdrawal.status === "approved" || pendingWithdrawal.status === "rejected") {
                item.status = pendingWithdrawal.status === "approved" ? "completed" : "failed"
                hasUpdates = true
              }
            }
          }
        }

        if (hasUpdates) {
          setWithdrawalItems(updatedWithdrawalItems)
          saveReferralDataToLocalStorage(user.id, referralItems, updatedWithdrawalItems)
        }
      } catch (error) {
        console.error("Error al verificar actualizaciones de estado de retiros:", error)
      }
    }

    // Verificar cada 10 segundos
    const interval = setInterval(checkWithdrawalStatusUpdates, 10000)

    return () => clearInterval(interval)
  }, [user, isClient, withdrawalItems, referralItems, saveReferralDataToLocalStorage])

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

  // Nuevo efecto para calcular la comisión de referidos
  useEffect(() => {
    if (isClient && user) {
      try {
        const referralData = JSON.parse(localStorage.getItem(`referralData_${user.id}`) || "{}")
        const registeredUsers = JSON.parse(localStorage.getItem("registeredUsers") || "[]")

        referralData.referralItems?.forEach((referral: ReferralItem) => {
          const referredUser = registeredUsers.find((u: any) => u.id === referral.referredUser.id)

          if (referredUser && referredUser.depositHistory?.length > 0) {
            const lastDeposit = referredUser.depositHistory[referredUser.depositHistory.length - 1]

            if (!referral.lastDepositDate || new Date(lastDeposit.date) > new Date(referral.lastDepositDate)) {
              const commissionAmount = lastDeposit.amount * 0.02 // Calcular el 2% de comisión

              referral.amount += commissionAmount
              referral.lastDepositDate = lastDeposit.date
              referral.status = "available"

              user.referralEarnings = (user.referralEarnings || 0) + commissionAmount

              localStorage.setItem(`referralData_${user.id}`, JSON.stringify(referralData))
              localStorage.setItem("user", JSON.stringify(user))
            }
          }
        })

        setReferralItems(referralData.referralItems || [])
      } catch (error) {
        console.error("Error al calcular la comisión de referidos:", error)
      }
    }
  }, [user, isClient])

  useEffect(() => {
    if (isClient && user) {
      try {
        const referralData = JSON.parse(localStorage.getItem(`referralData_${user.id}`) || "{}")
        if (referralData.referralItems) {
          setReferralItems(referralData.referralItems)
        }

        const totalAvailable =
          referralData.referralItems?.reduce((sum: number, item: ReferralItem) => {
            return item.status === "available" ? sum + item.amount : sum
          }, 0) || 0

        const totalPending =
          referralData.referralItems?.reduce((sum: number, item: ReferralItem) => {
            return item.status === "pending" ? sum + item.amount : sum
          }, 0) || 0

        setTotalAvailableAmount(totalAvailable)
        setTotalPendingAmount(totalPending)
      } catch (error) {
        console.error("Error al cargar los datos de referidos:", error)
      }
    }
  }, [user])

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 rounded-full bg-primary/20 mb-4"></div>
          <div className="h-4 w-24 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  // If no user, don't render
  if (!user) return null

  return (
    <div className="space-y-8">
      {/* Success alert */}
      {showSuccessAlert && (
        <Alert className="bg-green-50 border-green-200 mb-4">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Saldo disponible */}
      <div className="bg-blue-900 text-white p-3 rounded-lg flex items-center justify-between">
        <div className="flex items-center">
          <DollarSign className="h-5 w-5 mr-2" />
          <span className="font-medium">Saldo disponible</span>
        </div>
        <span className="text-xl font-bold">${user?.balance?.toFixed(2) || "0.00"}</span>
      </div>
      {/* Referral link section */}
      <Card className="border rounded-lg">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold">Tu Enlace de Referido</h2>
            </div>
            <p className="text-muted-foreground">Comparte este enlace con tus amigos para ganar comisiones</p>

            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={`${window.location.origin}/register?ref=${user?.referralCode}`}
                readOnly
                className="flex-1 bg-white"
              />
              <div className="flex gap-2">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={copyReferralLink}>
                  <Copy className="mr-2 h-4 w-4" />
                  {copied ? "¡Copiado!" : "Copiar"}
                </Button>
                <Button variant="outline" onClick={shareReferralLink}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Compartir
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg flex gap-3">
              <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-blue-600 font-medium">Tu código de referido: {user?.referralCode}</p>
                <p className="text-blue-600 text-sm mt-1">
                  Comparte este enlace o código con tus amigos. Cuando se registren y realicen depósitos, ganarás un 2%
                  de cada depósito que hagan.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Earnings summary section */}
      <div className="space-y-6">
        {/* Earnings cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="overflow-hidden border rounded-lg">
            <CardContent className="p-4">
              <div className="flex items-start">
                <div className="mr-3 mt-1">
                  <div className="bg-amber-100 p-2 rounded-full">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium text-base">Ganancias en Espera</h3>
                    <span className="text-xl font-bold">${totalPendingAmount.toFixed(2)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Disponibles después de 14 días desde la generación
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border rounded-lg">
            <CardContent className="p-4">
              <div className="flex items-start">
                <div className="mr-3 mt-1">
                  <div className="bg-green-100 p-2 rounded-full">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium text-base">Ganancias Disponibles</h3>
                    <span className="text-xl font-bold">${totalAvailableAmount.toFixed(2)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Listas para retirar o transferir a tu saldo</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border rounded-lg">
            <CardContent className="p-4">
              <div className="flex items-start">
                <div className="mr-3 mt-1">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium text-base">Ganancias por Referidos este mes</h3>
                    <span className="text-xl font-bold">${monthlyEarnings.toFixed(2)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Total acumulado en el mes actual</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress towards minimum withdrawal */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">Progreso hacia retiro mínimo (${MINIMUM_WITHDRAWAL_AMOUNT})</h3>
            <span className="text-sm">
              ${totalAvailableAmount.toFixed(2)} / ${MINIMUM_WITHDRAWAL_AMOUNT.toFixed(2)}
            </span>
          </div>
          <Progress value={withdrawalProgress} className="h-2 bg-gray-100" />
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            className={`${canWithdraw ? "bg-blue-500 hover:bg-blue-600" : "bg-gray-300 cursor-not-allowed"} text-white w-full h-12`}
            onClick={handleWithdrawal}
            disabled={!canWithdraw || processingAction}
          >
            {!canWithdraw ? (
              <div className="flex items-center">
                <Lock className="mr-2 h-5 w-5" />
                <span>Retirar Ganancias</span>
              </div>
            ) : (
              <div className="flex items-center">
                <DollarSign className="mr-2 h-5 w-5" />
                <span>{processingAction ? "Procesando..." : "Retirar Ganancias"}</span>
              </div>
            )}
          </Button>

          <Button
            variant="outline"
            className={`border-gray-200 ${canWithdraw ? "hover:bg-gray-50" : "opacity-50 cursor-not-allowed"} w-full h-12 justify-between`}
            onClick={() => {
              localStorage.setItem("userInitiatedTransfer", "true") // Establecer bandera
              handleTransferToBalance()
            }}
            disabled={!canWithdraw || processingAction}
          >
            {!canWithdraw ? (
              <div className="flex items-center">
                <Lock className="mr-2 h-5 w-5" />
                <span>Transferir a Saldo</span>
              </div>
            ) : (
              <>
                <span>{processingAction ? "Procesando..." : "Transferir a Saldo"}</span>
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </Button>
        </div>

        {/* Referral statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="overflow-hidden border rounded-lg">
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="bg-gray-100 p-3 rounded-full mr-4">
                  <Users className="h-6 w-6 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Referidos</p>
                  <p className="text-2xl font-bold">{totalReferrals}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border rounded-lg">
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="bg-green-50 p-3 rounded-full mr-4">
                  <Users className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Referidos Activos</p>
                  <p className="text-2xl font-bold">{activeReferrals}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border rounded-lg">
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="bg-amber-50 p-3 rounded-full mr-4">
                  <TrendingUp className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Referidos Pendientes</p>
                  <p className="text-2xl font-bold">{pendingReferrals}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs for different sections */}
      <Tabs defaultValue="referrals">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="referrals">Mis Referidos</TabsTrigger>
          <TabsTrigger value="earnings">Ganancias</TabsTrigger>
          <TabsTrigger value="how-it-works">Cómo Funciona</TabsTrigger>
        </TabsList>

        {/* Referrals Tab */}
        <TabsContent value="referrals" className="space-y-4 mt-4">
          {referralItems.length > 0 ? (
            <div className="space-y-4">
              {/* Ordenar por fecha de unión, más antiguos primero */}
              {referralItems
                .sort((a, b) => new Date(a.joinDate).getTime() - new Date(b.joinDate).getTime())
                .map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">{item.referredUser.name}</h3>
                        </div>
                        <div className="text-right">
                          {item.amount > 0 ? (
                            <>
                              <p className="font-medium">${item.amount.toFixed(2)}</p>
                              <span
                                className={`text-xs px-2 py-1 rounded-full ${
                                  item.status === "available"
                                    ? "bg-green-100 text-green-800"
                                    : item.status === "pending"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {item.status === "available"
                                  ? "Disponible"
                                  : item.status === "pending"
                                    ? `En espera (${getDaysRemaining(item.depositDate)} días)`
                                    : "Retirado"}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800">
                              Sin depósitos
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {item.amount > 0 ? (
                          <>
                            Fecha de depósito: {formatDate(item.depositDate)}
                            {item.status === "available" && ` • Disponible desde: ${formatDate(item.availableDate)}`}
                          </>
                        ) : (
                          "Esperando primer depósito para generar comisión"
                        )}
                      </p>
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No tienes referidos aún</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Comparte tu enlace de referido para empezar a ganar comisiones.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  forceCleanAllReferralData()
                }}
              >
                Reiniciar datos de referidos
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Earnings Tab */}
        <TabsContent value="earnings" className="space-y-4 mt-4">
          <h3 className="font-medium text-lg mb-2">Historial de Retiros</h3>

          {withdrawalItems.length > 0 ? (
            <div className="space-y-4">
              {withdrawalItems
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">
                            {item.type === "withdrawal" ? "Retiro de" : "Transferencia de"} ${item.amount.toFixed(2)}
                            {item.method && ` (${item.method})`}
                          </h3>
                          <p className="text-sm text-muted-foreground">{formatDate(item.date)}</p>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            item.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : item.status === "processing"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {item.status === "completed"
                            ? "Completado"
                            : item.status === "processing"
                              ? "Procesando"
                              : "Fallido"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <DollarSign className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No tienes retiros aún</h3>
              <p className="mt-2 text-sm text-muted-foreground">Tus retiros aparecerán aquí cuando los solicites.</p>
            </div>
          )}
        </TabsContent>

        {/* How It Works Tab */}
        <TabsContent value="how-it-works" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>¿Cómo funciona el programa de referidos?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="bg-primary/10 rounded-full p-3 h-fit">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">1. Invita a tus amigos</h3>
                  <p className="text-sm text-muted-foreground">
                    Comparte tu enlace único de referido con amigos y conocidos.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="bg-primary/10 rounded-full p-3 h-fit">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">2. Gana comisiones</h3>
                  <p className="text-sm text-muted-foreground">
                    Recibe un 2% de comisión por cada depósito que realicen tus referidos.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="bg-primary/10 rounded-full p-3 h-fit">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">3. Espera el período de maduración</h3>
                  <p className="text-sm text-muted-foreground">
                    Las comisiones permanecen en espera durante 14 días antes de estar disponibles para retiro.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="bg-primary/10 rounded-full p-3 h-fit">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">4. Retira tus ganancias</h3>
                  <p className="text-sm text-muted-foreground">
                    Una vez alcances el mínimo de ${MINIMUM_WITHDRAWAL_AMOUNT}, podrás retirar tus ganancias o
                    transferirlas a tu saldo.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preguntas Frecuentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium flex items-center">
                  <HelpCircle className="h-4 w-4 mr-2 text-muted-foreground" />
                  ¿Cuánto tiempo tardan en estar disponibles mis comisiones?
                </h3>
                <p className="text-sm text-muted-foreground mt-1 ml-6">
                  Las comisiones tienen un período de espera de 14 días antes de estar disponibles para retiro.
                </p>
              </div>

              <div>
                <h3 className="font-medium flex items-center">
                  <HelpCircle className="h-4 w-4 mr-2 text-muted-foreground" />
                  ¿Hay un límite de referidos?
                </h3>
                <p className="text-sm text-muted-foreground mt-1 ml-6">
                  No, puedes invitar a tantas personas como quieras. No hay límite en tus ganancias.
                </p>
              </div>

              <div>
                <h3 className="font-medium flex items-center">
                  <HelpCircle className="h-4 w-4 mr-2 text-muted-foreground" />
                  ¿Cómo recibo mis ganancias?
                </h3>
                <p className="text-sm text-muted-foreground mt-1 ml-6">
                  Puedes retirar tus ganancias a tu billetera o transferirlas a tu saldo de la plataforma.
                </p>
              </div>

              <div>
                <h3 className="font-medium flex items-center">
                  <HelpCircle className="h-4 w-4 mr-2 text-muted-foreground" />
                  ¿Qué diferencia hay entre retirar y transferir a saldo?
                </h3>
                <p className="text-sm text-muted-foreground mt-1 ml-6">
                  Al retirar, el dinero se enviará a tu método de pago preferido y debe ser aprobado por un
                  administrador. Al transferir a saldo, el dinero se añade inmediatamente a tu saldo disponible en la
                  plataforma.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Withdrawal Modal */}
      {showWithdrawalModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {withdrawalStep === 1 ? "Retirar Ganancias" : "Confirmar Retiro"}
              </h2>

              {withdrawalStep === 1 ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Monto a retirar:</span>
                      <span className="font-bold">${totalAvailableAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Selecciona la criptomoneda</label>
                    <div className="space-y-2">
                      <div
                        className={`flex items-center gap-3 p-3 border rounded-md cursor-pointer ${cryptoMethod === "bitcoin" ? "border-blue-500 bg-blue-50" : ""}`}
                        onClick={() => handleCryptoMethodChange("bitcoin")}
                      >
                        <div className="w-5 h-5 rounded-full border flex items-center justify-center">
                          {cryptoMethod === "bitcoin" && <div className="w-3 h-3 rounded-full bg-blue-500"></div>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Bitcoin className="h-5 w-5 text-orange-500" />
                          <span>Bitcoin (BTC)</span>
                        </div>
                      </div>

                      <div
                        className={`flex items-center gap-3 p-3 border rounded-md cursor-pointer ${cryptoMethod === "ethereum" ? "border-blue-500 bg-blue-50" : ""}`}
                        onClick={() => handleCryptoMethodChange("ethereum")}
                      >
                        <div className="w-5 h-5 rounded-full border flex items-center justify-center">
                          {cryptoMethod === "ethereum" && <div className="w-3 h-3 rounded-full bg-blue-500"></div>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Coins className="h-5 w-5 text-purple-500" />
                          <span>Ethereum (ETH)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="cryptoAddress" className="text-sm font-medium">
                      Dirección de {cryptoMethod === "bitcoin" ? "Bitcoin" : "Ethereum"}
                    </label>
                    <Input
                      id="cryptoAddress"
                      placeholder={`Ingresa tu dirección de ${cryptoMethod === "bitcoin" ? "Bitcoin" : "Ethereum"}`}
                      value={cryptoAddress}
                      onChange={handleCryptoAddressChange}
                    />
                  </div>

                  <div className="bg-amber-50 p-3 rounded-md text-sm text-amber-700">
                    <div className="flex gap-2">
                      <Info className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <p>
                          Asegúrate de ingresar la dirección correcta. Las transacciones en criptomonedas son
                          irreversibles.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Monto a retirar:</span>
                      <span className="font-bold">${totalAvailableAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Método de retiro:</span>
                      <span>{cryptoMethod === "bitcoin" ? "Bitcoin (BTC)" : "Ethereum (ETH)"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Comisión ({withdrawalFee}%):</span>
                      <span className="text-red-500">
                        -${((totalAvailableAmount * withdrawalFee) / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="border-t pt-2 flex justify-between">
                      <span className="font-medium">Total a recibir:</span>
                      <span className="font-bold">
                        ${(totalAvailableAmount * (1 - withdrawalFee / 100)).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="border p-3 rounded-lg">
                    <h3 className="font-medium mb-2">
                      Dirección de {cryptoMethod === "bitcoin" ? "Bitcoin" : "Ethereum"}
                    </h3>
                    <p className="text-sm bg-gray-50 p-2 rounded break-all">{cryptoAddress}</p>
                  </div>

                  <div className="bg-amber-50 p-3 rounded-md text-sm text-amber-700">
                    <div className="flex gap-2">
                      <Info className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Información importante:</p>
                        <ul className="list-disc pl-4 mt-1 space-y-1">
                          <li>El tiempo de procesamiento es de 1-3 días hábiles.</li>
                          <li>Los retiros están sujetos a verificación de seguridad.</li>
                          <li>Asegúrate de que los datos de la cartera sean correctos.</li>
                          <li>
                            La comisión de retiro es de {withdrawalFee}% según tu nivel VIP{" "}
                            {VIP_WITHDRAWAL_FEES.find((fee) => fee.level === userVipLevel)?.name || "Básico"}.
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <Button variant="outline" className="flex-1" onClick={handleCancelWithdrawal}>
                  Cancelar
                </Button>

                {withdrawalStep === 1 ? (
                  <Button className="flex-1 bg-blue-600" onClick={handleContinueWithdrawal} disabled={!cryptoAddress}>
                    Continuar
                  </Button>
                ) : (
                  <Button className="flex-1 bg-blue-600" onClick={handleConfirmWithdrawal}>
                    Confirmar Retiro
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
