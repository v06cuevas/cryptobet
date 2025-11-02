"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { LogOut, Search, Users, DollarSign, Settings, User, Wallet, Send } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"

interface UserData {
  id: string
  name: string
  email: string
  role: string
  balance: number
  registeredAt?: string
  status?: string
  vipLevel?: number
}

export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [users, setUsers] = useState<UserData[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([])
  const [pendingDeposits, setPendingDeposits] = useState<any[]>([])
  const [transactionHistory, setTransactionHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("users")
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  const [pendingReferralWithdrawals, setPendingReferralWithdrawals] = useState<any[]>([])
  const [messageSubject, setMessageSubject] = useState("")
  const [messageContent, setMessageContent] = useState("")
  const [isSendingMessage, setIsSendingMessage] = useState(false)

  useEffect(() => {
    // Check if user is logged in and is admin
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/login")
      return
    }

    const parsedUser = JSON.parse(userData)
    if (parsedUser.role !== "admin") {
      router.push("/profile")
      return
    }

    setUser(parsedUser)

    const fetchUsers = async () => {
      try {
        const supabase = createClient()
        const { data: profiles, error } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false })

        if (error) {
          console.error("Error fetching users:", error)
          setUsers([])
        } else {
          // Map profiles to UserData format
          const mappedUsers: UserData[] = (profiles || []).map((profile) => ({
            id: profile.id,
            name: profile.name || "Sin nombre",
            email: profile.email || "Sin email",
            role: profile.role || "user",
            balance: Number(profile.balance) || 0,
            registeredAt: profile.created_at,
            status: profile.status || "En espera",
            vipLevel: profile.vip_level || 0,
          }))
          setUsers(mappedUsers)
        }
      } catch (error) {
        console.error("Error loading users:", error)
        setUsers([])
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [router])

  // Separate useEffect for loading transactions data
  useEffect(() => {
    // Cargar retiros pendientes
    try {
      const withdrawals = JSON.parse(localStorage.getItem("pendingWithdrawals") || "[]")
      setPendingWithdrawals(withdrawals.filter((w: any) => w.status === "pending"))
    } catch (error) {
      console.error("Error al cargar retiros pendientes:", error)
      setPendingWithdrawals([])
    }

    // Cargar transferencias pendientes
    try {
      const transfers = JSON.parse(localStorage.getItem("pendingTransfers") || "[]")
      setPendingWithdrawals((prev) => [...prev, ...transfers.filter((t: any) => t.status === "pending")])
    } catch (error) {
      console.error("Error al cargar transferencias pendientes:", error)
    }

    // Cargar depósitos pendientes
    try {
      const deposits = JSON.parse(localStorage.getItem("pendingDeposits") || "[]")
      setPendingDeposits(deposits.filter((d: any) => d.status === "pending"))
    } catch (error) {
      console.error("Error al cargar depósitos pendientes:", error)
      setPendingDeposits([])
    }

    // Cargar historial de transacciones
    try {
      const history = JSON.parse(localStorage.getItem("transactionHistory") || "[]")
      setTransactionHistory(history)
    } catch (error) {
      console.error("Error al cargar historial de transacciones:", error)
      setTransactionHistory([])
    }
  }, [])

  // Cargar retiros de referidos pendientes
  useEffect(() => {
    try {
      // Intentar cargar los retiros de referidos pendientes
      const referralWithdrawals = JSON.parse(localStorage.getItem("pendingReferralWithdrawals") || "[]")
      setPendingReferralWithdrawals(referralWithdrawals.filter((w: any) => w.status === "pending"))
    } catch (error) {
      console.error("Error al cargar retiros de referidos pendientes:", error)
      setPendingReferralWithdrawals([])
    }
  }, [])

  const handleSendBroadcastMessage = () => {
    if (!messageSubject.trim() || !messageContent.trim()) {
      alert("Por favor completa todos los campos")
      return
    }

    setIsSendingMessage(true)

    try {
      const message = {
        id: `msg_${Date.now()}`,
        subject: messageSubject,
        content: messageContent,
        date: new Date().toISOString(),
        from: "Administrador",
        read: false,
      }

      // Send message to all users
      const registeredUsers = JSON.parse(localStorage.getItem("registeredUsers") || "[]")

      registeredUsers.forEach((user: any) => {
        // Get existing messages for this user
        const userMessages = JSON.parse(localStorage.getItem(`userMessages_${user.id}`) || "[]")

        // Add new message
        userMessages.unshift(message)

        // Save back to localStorage
        localStorage.setItem(`userMessages_${user.id}`, JSON.stringify(userMessages))

        // Set notification flag
        localStorage.setItem(`hasUnreadMessages_${user.id}`, "true")
      })

      // Clear form
      setMessageSubject("")
      setMessageContent("")

      alert(`Mensaje enviado exitosamente a ${registeredUsers.length} usuarios`)
    } catch (error) {
      console.error("Error al enviar mensaje:", error)
      alert("Error al enviar el mensaje")
    } finally {
      setIsSendingMessage(false)
    }
  }

  // Modificar la función handleApproveWithdrawal para que actualice el estado del retiro pendiente en lugar de crear uno nuevo
  // y elimine la notificación de retiro pendiente

  // Simplificar la función handleApproveWithdrawal eliminando código redundante
  const handleApproveWithdrawal = (withdrawalId: string, userId: string) => {
    try {
      // Update withdrawal status in pendingWithdrawals
      const withdrawals = JSON.parse(localStorage.getItem("pendingWithdrawals") || "[]")
      const withdrawalIndex = withdrawals.findIndex((w: any) => w.id === withdrawalId)

      if (withdrawalIndex !== -1) {
        const withdrawal = withdrawals[withdrawalIndex]
        withdrawal.status = "approved"

        // Update in localStorage
        localStorage.setItem("pendingWithdrawals", JSON.stringify(withdrawals))

        // Add to history
        const history = JSON.parse(localStorage.getItem("transactionHistory") || "[]")
        history.push({
          id: withdrawal.id, // Mantener el mismo ID
          type: "Retiro",
          userId: withdrawal.userId,
          userName: withdrawal.userName,
          amount: withdrawal.amount,
          method: withdrawal.method,
          methodName: withdrawal.methodName,
          cryptoAddress: withdrawal.cryptoAddress,
          cryptoType: withdrawal.cryptoType,
          date: new Date().toISOString(),
          status: "approved",
        })
        localStorage.setItem("transactionHistory", JSON.stringify(history))

        // Actualizar la lista de retiros pendientes
        try {
          const pendingWithdrawalsList = JSON.parse(localStorage.getItem("pendingWithdrawalsList") || "[]")
          const pendingIndex = pendingWithdrawalsList.findIndex((w: any) => w.id === withdrawalId)

          if (pendingIndex !== -1) {
            const originalMethod = pendingWithdrawalsList[pendingIndex].method
            const originalMethodName = pendingWithdrawalsList[pendingIndex].methodName
            const originalCryptoAddress = pendingWithdrawalsList[pendingIndex].cryptoAddress
            const originalCryptoType = pendingWithdrawalsList[pendingIndex].cryptoType

            pendingWithdrawalsList[pendingIndex].status = "approved"
            pendingWithdrawalsList[pendingIndex].completedDate = new Date().toLocaleDateString()

            localStorage.setItem("pendingWithdrawalsList", JSON.stringify(pendingWithdrawalsList))
            localStorage.setItem("withdrawalId", withdrawalId)
            localStorage.setItem("withdrawalAmount", withdrawal.amount.toString())
            localStorage.setItem("withdrawalMethod", originalMethod || withdrawal.method)

            const methodName =
              originalMethodName ||
              withdrawal.methodName ||
              (originalMethod === "bank"
                ? "Transferencia bancaria"
                : originalMethod === "card"
                  ? "Tarjeta"
                  : originalMethod === "crypto"
                    ? "Criptomoneda"
                    : "PayPal")

            localStorage.setItem("withdrawalMethodName", methodName)
            localStorage.setItem("withdrawalCryptoAddress", originalCryptoAddress || withdrawal.cryptoAddress || "")
            localStorage.setItem("withdrawalCryptoType", originalCryptoType || withdrawal.cryptoType || "")
            localStorage.setItem("withdrawalApproved", "true")
            localStorage.setItem("pendingWithdrawalVerification", "true")
            localStorage.setItem("hasUnreadNotifications", "true")
          }
        } catch (error) {
          console.error("Error al actualizar lista de retiros pendientes:", error)
        }

        // Update states
        setPendingWithdrawals(withdrawals.filter((w: any) => w.status === "pending"))
        setTransactionHistory(history)

        alert("Withdrawal approved successfully")
      }
    } catch (error) {
      console.error("Error approving withdrawal:", error)
      alert("Error approving withdrawal")
    }
  }

  const handleRejectWithdrawal = (withdrawalId: string, userId: string) => {
    try {
      // Actualizar estado del retiro
      const withdrawals = JSON.parse(localStorage.getItem("pendingWithdrawals") || "[]")
      const withdrawalIndex = withdrawals.findIndex((w: any) => w.id === withdrawalId)

      if (withdrawalIndex !== -1) {
        const withdrawal = withdrawals[withdrawalIndex]
        withdrawal.status = "rejected"

        // Actualizar en localStorage
        localStorage.setItem("pendingWithdrawals", JSON.stringify(withdrawals))

        // Añadir al historial
        const history = JSON.parse(localStorage.getItem("transactionHistory") || "[]")
        history.push({
          id: withdrawal.id,
          type: "Retiro",
          userId: withdrawal.userId,
          userName: withdrawal.userName,
          amount: withdrawal.amount,
          date: new Date().toISOString(),
          status: "rejected",
        })
        localStorage.setItem("transactionHistory", JSON.stringify(history))

        // Devolver el saldo al usuario ya que el retiro fue rechazado
        const registeredUsers = JSON.parse(localStorage.getItem("registeredUsers") || "[]")
        const userIndex = registeredUsers.findIndex((u: any) => u.id === userId)

        if (userIndex !== -1) {
          registeredUsers[userIndex].balance += withdrawal.amount
          localStorage.setItem("registeredUsers", JSON.stringify(registeredUsers))

          // También actualizar el saldo en el objeto de usuario si está conectado
          const currentUserData = localStorage.getItem("user")
          if (currentUserData) {
            const currentUser = JSON.parse(currentUserData)
            if (currentUser.id === userId) {
              currentUser.balance += withdrawal.amount
              localStorage.setItem("user", JSON.stringify(currentUser))
            }
          }

          // Notificar al usuario que su retiro fue rechazado
          localStorage.setItem(`withdrawalRejected_${userId}`, "true")

          // Eliminar el retiro de la lista de retiros pendientes
          try {
            const pendingWithdrawalsList = JSON.parse(localStorage.getItem("pendingWithdrawalsList") || "[]")
            // Encontrar el índice del retiro rechazado
            const withdrawalIndex = pendingWithdrawalsList.findIndex(
              (w: any) => w.amount.toString() === withdrawal.amount.toString(),
            )
            if (withdrawalIndex !== -1) {
              // Eliminar el retiro de la lista
              pendingWithdrawalsList.splice(withdrawalIndex, 1)
              // Guardar la lista actualizada
              localStorage.setItem("pendingWithdrawalsList", JSON.stringify(pendingWithdrawalsList))
            }
          } catch (error) {
            console.error("Error al actualizar lista de retiros pendientes:", error)
          }
        }

        // Actualizar estados
        setPendingWithdrawals(withdrawals.filter((w: any) => w.status === "pending"))
        setTransactionHistory(history)

        alert("Retiro rechazado correctamente")
      }
    } catch (error) {
      console.error("Error al rechazar retiro:", error)
      alert("Error al rechazar el retiro")
    }
  }

  const handleApproveDeposit = (depositId: string, userId: string) => {
    try {
      const deposits = JSON.parse(localStorage.getItem("pendingDeposits") || "[]")
      const depositIndex = deposits.findIndex((d: any) => d.id === depositId)
      if (depositIndex !== -1) {
        const deposit = deposits[depositIndex]
        deposit.status = "approved"
        localStorage.setItem("pendingDeposits", JSON.stringify(deposits))

        const history = JSON.parse(localStorage.getItem("transactionHistory") || "[]")
        history.push({
          id: deposit.id,
          type: "Depósito",
          userId: deposit.userId,
          userName: deposit.userName,
          amount: deposit.amount,
          method: deposit.method,
          methodName: deposit.methodName,
          date: new Date().toISOString(),
          status: "approved",
        })
        localStorage.setItem("transactionHistory", JSON.stringify(history))

        const registeredUsers = JSON.parse(localStorage.getItem("registeredUsers") || "[]")
        const userIndex = registeredUsers.findIndex((u: any) => u.id === userId)
        if (userIndex !== -1) {
          registeredUsers[userIndex].balance += deposit.amount

          // Calcular comisión de referido si aplica
          if (registeredUsers[userIndex].referredBy) {
            const referrerCode = registeredUsers[userIndex].referredBy
            const referrerIndex = registeredUsers.findIndex((u: any) => u.referralCode === referrerCode)
            if (referrerIndex !== -1) {
              const commission = deposit.amount * 0.02 // 2% de comisión
              registeredUsers[referrerIndex].referralEarnings =
                (registeredUsers[referrerIndex].referralEarnings || 0) + commission

              // Actualizar datos de referidos
              const referrerData = JSON.parse(
                localStorage.getItem(`referralData_${registeredUsers[referrerIndex].id}`) || '{"referralItems":[]}',
              )
              const referralItemIndex = referrerData.referralItems.findIndex(
                (item: any) => item.referredUser.id === userId,
              )
              if (referralItemIndex !== -1) {
                referrerData.referralItems[referralItemIndex].amount += commission
                referrerData.referralItems[referralItemIndex].status = "available"
              } else {
                referrerData.referralItems.push({
                  id: `ref_${userId}`,
                  referredUser: {
                    id: userId,
                    name: registeredUsers[userIndex].name,
                    email: registeredUsers[userIndex].email,
                  },
                  amount: commission,
                  status: "available",
                  date: new Date().toISOString(),
                  depositDate: new Date().toISOString(),
                  availableDate: new Date().toISOString(),
                })
              }
              localStorage.setItem(`referralData_${registeredUsers[referrerIndex].id}`, JSON.stringify(referrerData))
            }
          }

          registeredUsers[userIndex].depositPending = false
          registeredUsers[userIndex].depositApproved = true
          registeredUsers[userIndex].depositApprovedDate = new Date().toLocaleDateString()
          if (!registeredUsers[userIndex].depositHistory) {
            registeredUsers[userIndex].depositHistory = []
          }
          registeredUsers[userIndex].depositHistory.push({
            id: deposit.id,
            amount: deposit.amount,
            method: deposit.method,
            methodName: deposit.methodName || deposit.method,
            date: new Date().toISOString(),
            status: "approved",
            approvedDate: new Date().toLocaleDateString(),
          })
          localStorage.setItem("registeredUsers", JSON.stringify(registeredUsers))
        }

        setPendingDeposits(deposits.filter((d: any) => d.status === "pending"))
        setTransactionHistory(history)
        alert("Depósito aprobado correctamente")
      }
    } catch (error) {
      console.error("Error al aprobar depósito:", error)
      alert("Error al aprobar el depósito")
    }
  }

  const handleRejectDeposit = (depositId: string, userId: string) => {
    try {
      // Actualizar estado del depósito
      const deposits = JSON.parse(localStorage.getItem("pendingDeposits") || "[]")
      const depositIndex = deposits.findIndex((d: any) => d.id === depositId)

      if (depositIndex !== -1) {
        const deposit = deposits[depositIndex]
        deposit.status = "rejected"

        // Actualizar en localStorage
        localStorage.setItem("pendingDeposits", JSON.stringify(deposits))

        // Añadir al historial
        const history = JSON.parse(localStorage.getItem("transactionHistory") || "[]")
        history.push({
          id: deposit.id,
          type: "Depósito",
          userId: deposit.userId,
          userName: deposit.userName,
          amount: deposit.amount,
          date: new Date().toISOString(),
          status: "rejected",
        })
        localStorage.setItem("transactionHistory", JSON.stringify(history))

        // Notificar al usuario que su depósito fue rechazado
        localStorage.setItem(`depositRejected_${userId}`, "true")

        // Actualizar estados
        setPendingDeposits(deposits.filter((d: any) => d.status === "pending"))
        setTransactionHistory(history)

        alert("Depósito rechazado correctamente")
      }
    } catch (error) {
      console.error("Error al rechazar depósito:", error)
      alert("Error al rechazar el depósito")
    }
  }

  // Modificar la función handleApproveReferralWithdrawal para mostrar el monto después de la comisión
  const handleApproveReferralWithdrawal = (withdrawalId: string, userId: string) => {
    try {
      // Actualizar estado del retiro
      const withdrawals = JSON.parse(localStorage.getItem("pendingReferralWithdrawals") || "[]")
      const withdrawalIndex = withdrawals.findIndex((w: any) => w.id === withdrawalId)

      if (withdrawalIndex !== -1) {
        const withdrawal = withdrawals[withdrawalIndex]
        withdrawal.status = "approved"

        // Calcular el monto después de la comisión si no está ya calculado
        const amountAfterFee = withdrawal.amountAfterFee || withdrawal.amount * (1 - (withdrawal.fee || 5) / 100)

        // Actualizar en localStorage
        localStorage.setItem("pendingReferralWithdrawals", JSON.stringify(withdrawals))

        // Añadir al historial
        const history = JSON.parse(localStorage.getItem("transactionHistory") || "[]")
        history.push({
          id: withdrawal.id,
          type: "Retiro de Referidos",
          userId: withdrawal.userId,
          userName: withdrawal.userName,
          amount: withdrawal.amount,
          amountAfterFee: amountAfterFee,
          fee: withdrawal.fee || 5,
          method: "crypto",
          methodName: withdrawal.cryptoType === "bitcoin" ? "Bitcoin (BTC)" : "Ethereum (ETH)",
          cryptoAddress: withdrawal.cryptoAddress,
          cryptoType: withdrawal.cryptoType,
          date: new Date().toISOString(),
          status: "approved",
          vipLevel: withdrawal.vipLevel || 0,
        })
        localStorage.setItem("transactionHistory", JSON.stringify(history))

        // Actualizar el estado de retiro en los datos de referidos del usuario
        try {
          const referralData = JSON.parse(localStorage.getItem(`referralData_${userId}`) || "{}")

          if (referralData.withdrawalItems) {
            const withdrawalItemIndex = referralData.withdrawalItems.findIndex((item: any) => item.id === withdrawalId)

            if (withdrawalItemIndex !== -1) {
              referralData.withdrawalItems[withdrawalItemIndex].status = "completed"
              referralData.withdrawalItems[withdrawalItemIndex].amountAfterFee = amountAfterFee
              localStorage.setItem(`referralData_${userId}`, JSON.stringify(referralData))
            }
          }
        } catch (error) {
          console.error("Error al actualizar datos de referidos:", error)
        }

        // Notificar al usuario que su retiro fue aprobado
        localStorage.setItem(`referralWithdrawalApproved_${userId}`, "true")
        localStorage.setItem("hasUnreadNotifications", "true")

        // Actualizar estados
        setPendingReferralWithdrawals(withdrawals.filter((w: any) => w.status === "pending"))
        setTransactionHistory(history)

        alert("Retiro de referidos aprobado correctamente")
      }
    } catch (error) {
      console.error("Error al aprobar retiro de referidos:", error)
      alert("Error al aprobar el retiro de referidos")
    }
  }

  const handleRejectReferralWithdrawal = (withdrawalId: string, userId: string) => {
    try {
      // Actualizar estado del retiro
      const withdrawals = JSON.parse(localStorage.getItem("pendingReferralWithdrawals") || "[]")
      const withdrawalIndex = withdrawals.findIndex((w: any) => w.id === withdrawalId)

      if (withdrawalIndex !== -1) {
        const withdrawal = withdrawals[withdrawalIndex]
        withdrawal.status = "rejected"

        // Actualizar en localStorage
        localStorage.setItem("pendingReferralWithdrawals", JSON.stringify(withdrawals))

        // Añadir al historial
        const history = JSON.parse(localStorage.getItem("transactionHistory") || "[]")
        history.push({
          id: withdrawal.id,
          type: "Retiro de Referidos",
          userId: withdrawal.userId,
          userName: withdrawal.userName,
          amount: withdrawal.amount,
          date: new Date().toISOString(),
          status: "rejected",
        })
        localStorage.setItem("transactionHistory", JSON.stringify(history))

        // Devolver el saldo de referidos al usuario
        try {
          const referralData = JSON.parse(localStorage.getItem(`referralData_${userId}`) || "{}")

          if (referralData) {
            // Devolver el monto al saldo disponible
            referralData.availableAmount = (referralData.availableAmount || 0) + withdrawal.amount

            // Actualizar el estado del retiro si existe
            if (referralData.withdrawalItems) {
              const withdrawalItemIndex = referralData.withdrawalItems.findIndex(
                (item: any) => item.id === withdrawalId,
              )

              if (withdrawalItemIndex !== -1) {
                referralData.withdrawalItems[withdrawalItemIndex].status = "rejected"
              }
            }
          }

          localStorage.setItem(`referralData_${userId}`, JSON.stringify(referralData))
        } catch (error) {
          console.error("Error al actualizar datos de referidos:", error)
        }

        // Notificar al usuario que su retiro fue rechazado
        localStorage.setItem(`referralWithdrawalRejected_${userId}`, "true")
        localStorage.setItem("hasUnreadNotifications", "true")

        // Actualizar estados
        setPendingReferralWithdrawals(withdrawals.filter((w: any) => w.status === "pending"))
        setTransactionHistory(history)

        alert("Retiro de referidos rechazado correctamente")
      }
    } catch (error) {
      console.error("Error al rechazar retiro de referidos:", error)
      alert("Error al rechazar el retiro de referidos")
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("user")
    router.push("/login")
  }

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedAddress(text)
      setTimeout(() => setCopiedAddress(null), 2000) // Reset after 2 seconds
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Cargando...</p>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Admin header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Panel de Administración</h1>
          <p className="text-muted-foreground">Gestión de usuarios y configuración del sistema</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1">
              Admin
            </Badge>
            <span className="font-medium">{user.name}</span>
          </div>
          <Button variant="destructive" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Salir
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Usuarios</p>
              <p className="text-2xl font-bold">{users.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Balance Total</p>
              <p className="text-2xl font-bold">${users.reduce((sum, user) => sum + user.balance, 0).toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Settings className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Configuración</p>
              <p className="text-2xl font-bold">Sistema</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="withdrawals">Retiros Pendientes</TabsTrigger>
          <TabsTrigger value="referralWithdrawals">Retiros Referidos</TabsTrigger>
          <TabsTrigger value="messages">Mensajes</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          {/* Users table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Gestión de Usuarios
                </CardTitle>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar usuarios..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Fecha Registro</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.id}</TableCell>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            {user.registeredAt
                              ? new Date(user.registeredAt).toLocaleDateString()
                              : new Date().toLocaleDateString()}
                          </TableCell>
                          <TableCell>${user.balance.toFixed(2)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  user.status === "Verificado"
                                    ? "bg-green-500"
                                    : user.status === "Suspendido"
                                      ? "bg-red-500"
                                      : "bg-yellow-500"
                                }`}
                              ></div>
                              <span>{user.status || "En espera"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Link href={`/admin/${user.id}`}>
                              <Button size="sm" variant="outline">
                                Editar
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4">
                          No se encontraron usuarios
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals">
          {/* Withdrawals table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Retiros Pendientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Criptomoneda</TableHead>
                      <TableHead>Dirección de Cartera</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingWithdrawals.length > 0 ? (
                      pendingWithdrawals.map((withdrawal) => (
                        <TableRow key={withdrawal.id}>
                          <TableCell className="font-medium">{withdrawal.id}</TableCell>
                          <TableCell>{withdrawal.userName}</TableCell>
                          <TableCell>{withdrawal.userEmail}</TableCell>
                          <TableCell>${withdrawal.amount.toFixed(2)}</TableCell>
                          <TableCell>{withdrawal.cryptoType}</TableCell>
                          <TableCell>{withdrawal.cryptoAddress}</TableCell>
                          <TableCell>{new Date(withdrawal.date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApproveWithdrawal(withdrawal.id, withdrawal.userId)}
                            >
                              Aprobar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectWithdrawal(withdrawal.id, withdrawal.userId)}
                              className="ml-2"
                            >
                              Rechazar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-4">
                          No se encontraron retiros pendientes
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referralWithdrawals">
          {/* Referral Withdrawals table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Retiros de Referidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Monto Después de Comisión</TableHead>
                      <TableHead>Comisión</TableHead>
                      <TableHead>Criptomoneda</TableHead>
                      <TableHead>Dirección de Cartera</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingReferralWithdrawals.length > 0 ? (
                      pendingReferralWithdrawals.map((withdrawal) => (
                        <TableRow key={withdrawal.id}>
                          <TableCell className="font-medium">{withdrawal.id}</TableCell>
                          <TableCell>{withdrawal.userName}</TableCell>
                          <TableCell>{withdrawal.userEmail}</TableCell>
                          <TableCell>${withdrawal.amount.toFixed(2)}</TableCell>
                          <TableCell>${withdrawal.amountAfterFee.toFixed(2)}</TableCell>
                          <TableCell>{withdrawal.fee}%</TableCell>
                          <TableCell>{withdrawal.cryptoType}</TableCell>
                          <TableCell>{withdrawal.cryptoAddress}</TableCell>
                          <TableCell>{new Date(withdrawal.date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApproveReferralWithdrawal(withdrawal.id, withdrawal.userId)}
                            >
                              Aprobar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectReferralWithdrawal(withdrawal.id, withdrawal.userId)}
                              className="ml-2"
                            >
                              Rechazar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-4">
                          No se encontraron retiros de referidos pendientes
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Enviar Mensaje a Todos los Usuarios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Asunto</Label>
                  <Input
                    id="subject"
                    placeholder="Asunto del mensaje"
                    value={messageSubject}
                    onChange={(e) => setMessageSubject(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Contenido</Label>
                  <Textarea
                    id="content"
                    placeholder="Escribe tu mensaje aquí..."
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    rows={8}
                    className="resize-none"
                  />
                </div>
                <Button
                  onClick={handleSendBroadcastMessage}
                  disabled={isSendingMessage || !messageSubject.trim() || !messageContent.trim()}
                  className="w-full"
                  size="lg"
                >
                  {isSendingMessage ? "Enviando..." : "Enviar Mensaje a Todos"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
