"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { Filter, Search, ArrowUpRight, ArrowDownRight, Download, AlertCircle, CreditCard } from "lucide-react"
import {
  getPendingDeposits,
  getPendingWithdrawals,
  getTransactionHistory,
  approveDeposit,
  rejectDeposit,
  approveWithdrawal,
  rejectWithdrawal,
} from "@/app/actions/transactions"

interface UserData {
  id: string
  name: string
  email: string
  role: string
}

export default function TransaccionesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("todos")
  const [statusFilter, setStatusFilter] = useState("todos")
  const [dateFilter, setDateFilter] = useState("todos")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([])
  const [pendingDeposits, setPendingDeposits] = useState<any[]>([])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load pending deposits
      const depositsResult = await getPendingDeposits()
      if (depositsResult.success) {
        setPendingDeposits(depositsResult.data)
      }

      // Load pending withdrawals
      const withdrawalsResult = await getPendingWithdrawals()
      if (withdrawalsResult.success) {
        setPendingWithdrawals(withdrawalsResult.data)
      }

      // Load transaction history
      const historyResult = await getTransactionHistory()
      if (historyResult.success) {
        setTransactions(historyResult.data)
      }

      setLoading(false)
    } catch (err) {
      console.error("[v0] Error loading data:", err)
      toast({
        title: "Error",
        description: "Error al cargar los datos",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

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
    loadData()
  }, [router])

  const handleApproveWithdrawal = async (withdrawalId: string) => {
    const result = await approveWithdrawal(withdrawalId)
    if (result.success) {
      toast({
        title: "Éxito",
        description: result.message,
      })
      loadData()
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      })
    }
  }

  const handleRejectWithdrawal = async (withdrawalId: string) => {
    const result = await rejectWithdrawal(withdrawalId)
    if (result.success) {
      toast({
        title: "Éxito",
        description: result.message,
      })
      loadData()
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      })
    }
  }

  const handleApproveDeposit = async (depositId: string) => {
    const result = await approveDeposit(depositId)
    if (result.success) {
      toast({
        title: "Éxito",
        description: result.message,
      })
      loadData()
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      })
    }
  }

  const handleRejectDeposit = async (depositId: string) => {
    const result = await rejectDeposit(depositId)
    if (result.success) {
      toast({
        title: "Éxito",
        description: result.message,
      })
      loadData()
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      })
    }
  }

  // Get unique transaction types for filter
  const getUniqueTypes = () => {
    const uniqueTypes = new Set<string>()
    transactions.forEach((transaction) => {
      if (transaction.type) {
        uniqueTypes.add(transaction.type)
      }
    })
    return Array.from(uniqueTypes)
  }

  // Get unique statuses for filter
  const getUniqueStatuses = () => {
    const uniqueStatuses = new Set<string>()
    transactions.forEach((transaction) => {
      if (transaction.status) {
        uniqueStatuses.add(transaction.status)
      }
    })
    return Array.from(uniqueStatuses)
  }

  // Get filtered transactions
  const getFilteredTransactions = () => {
    return transactions.filter((transaction) => {
      // Only include Retiro or Depósito transactions
      if (transaction.type !== "deposit" && transaction.type !== "withdrawal") {
        return false
      }

      // Filter by search term
      if (
        searchTerm &&
        !(
          (transaction.user_name && transaction.user_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (transaction.user_id && transaction.user_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (transaction.id && transaction.id.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      ) {
        return false
      }

      // Filter by type
      if (typeFilter !== "todos" && transaction.type !== typeFilter) {
        return false
      }

      // Filter by status
      if (statusFilter !== "todos" && transaction.status !== statusFilter) {
        return false
      }

      // Filter by date
      if (dateFilter === "personalizado") {
        const transactionDate = new Date(transaction.created_at)

        if (startDate) {
          const start = new Date(startDate)
          start.setHours(0, 0, 0, 0)
          if (transactionDate < start) return false
        }

        if (endDate) {
          const end = new Date(endDate)
          end.setHours(23, 59, 59, 999)
          if (transactionDate > end) return false
        }
      } else if (dateFilter === "hoy") {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const transactionDate = new Date(transaction.created_at)
        if (transactionDate < today) return false
      } else if (dateFilter === "ayer") {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const transactionDate = new Date(transaction.created_at)
        if (transactionDate < yesterday || transactionDate >= today) return false
      } else if (dateFilter === "semana") {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 7)
        const transactionDate = new Date(transaction.created_at)
        if (transactionDate < weekAgo) return false
      } else if (dateFilter === "mes") {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const monthAgo = new Date(today)
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        const transactionDate = new Date(transaction.created_at)
        if (transactionDate < monthAgo) return false
      }

      return true
    })
  }

  // Calculate totals
  const calculateTotals = () => {
    const filteredTransactions = getFilteredTransactions()

    const deposits = filteredTransactions
      .filter((t) => t.type === "deposit" && t.status === "approved")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0)

    const withdrawals = filteredTransactions
      .filter((t) => t.type === "withdrawal" && t.status === "approved")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0)

    return { deposits, withdrawals }
  }

  // Format transaction status
  const formatStatus = (status: string) => {
    switch (status) {
      case "approved":
        return "Aprobado"
      case "rejected":
        return "Rechazado"
      case "pending":
        return "Pendiente"
      default:
        return status
    }
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500"
      case "rejected":
        return "bg-red-500"
      default:
        return "bg-yellow-500"
    }
  }

  // Get transaction icon
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return <ArrowUpRight className="h-4 w-4 text-green-600" />
      case "withdrawal":
        return <ArrowDownRight className="h-4 w-4 text-red-600" />
      default:
        return <CreditCard className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Cargando...</p>
      </div>
    )
  }

  const filteredTransactions = getFilteredTransactions()
  const totals = calculateTotals()

  return (
    <div className="container mx-auto px-4 py-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Transacciones</h1>
          <p className="text-muted-foreground">Administra todas las transacciones financieras del sistema</p>
        </div>

        <Button variant="outline" className="flex items-center gap-2 bg-transparent">
          <Download className="h-4 w-4" />
          <span>Exportar a CSV</span>
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-full">
                <ArrowUpRight className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Depósitos</p>
                <p className="text-2xl font-bold">${totals.deposits.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-red-100 p-3 rounded-full">
                <ArrowDownRight className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Retiros</p>
                <p className="text-2xl font-bold">${totals.withdrawals.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Retiros Pendientes */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowDownRight className="h-5 w-5 text-red-600" />
            Retiros Pendientes ({pendingWithdrawals.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingWithdrawals.length > 0 ? (
                  pendingWithdrawals.map((withdrawal) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell className="font-medium">{withdrawal.id.slice(0, 8)}...</TableCell>
                      <TableCell>{withdrawal.user_name}</TableCell>
                      <TableCell>${Number(withdrawal.amount).toFixed(2)}</TableCell>
                      <TableCell>{withdrawal.method_name}</TableCell>
                      <TableCell>{new Date(withdrawal.created_at).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApproveWithdrawal(withdrawal.id)}
                          >
                            Aprobar
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleRejectWithdrawal(withdrawal.id)}>
                            Rechazar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      No hay retiros pendientes
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Depósitos Pendientes */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-green-600" />
            Depósitos Pendientes ({pendingDeposits.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingDeposits.length > 0 ? (
                  pendingDeposits.map((deposit) => (
                    <TableRow key={deposit.id}>
                      <TableCell className="font-medium">{deposit.id.slice(0, 8)}...</TableCell>
                      <TableCell>{deposit.user_name}</TableCell>
                      <TableCell>${Number(deposit.amount).toFixed(2)}</TableCell>
                      <TableCell>{deposit.method_name}</TableCell>
                      <TableCell>{new Date(deposit.created_at).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApproveDeposit(deposit.id)}
                          >
                            Aprobar
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleRejectDeposit(deposit.id)}>
                            Rechazar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      No hay depósitos pendientes
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros y Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por usuario, ID..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Tipo</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="todos">Todos</option>
                  <option value="deposit">Depósitos</option>
                  <option value="withdrawal">Retiros</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Estado</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="todos">Todos</option>
                  <option value="approved">Aprobados</option>
                  <option value="rejected">Rechazados</option>
                  <option value="pending">Pendientes</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Fecha</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                >
                  <option value="todos">Todas</option>
                  <option value="hoy">Hoy</option>
                  <option value="ayer">Ayer</option>
                  <option value="semana">Últimos 7 días</option>
                  <option value="mes">Último mes</option>
                  <option value="personalizado">Personalizado</option>
                </select>
              </div>
            </div>

            {dateFilter === "personalizado" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Historial */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Transacciones</CardTitle>
          <CardDescription>Mostrando {filteredTransactions.length} transacciones</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTransactionIcon(transaction.type)}
                        <span className="capitalize">{transaction.type === "deposit" ? "Depósito" : "Retiro"}</span>
                      </div>
                    </TableCell>
                    <TableCell>{transaction.user_name}</TableCell>
                    <TableCell>${Number(transaction.amount).toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(transaction.status)}`}></div>
                        {formatStatus(transaction.status)}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(transaction.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    No hay transacciones
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Information Alert */}
      <Alert className="mt-8 bg-blue-50 border-blue-200">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700">
          Las transacciones incluyen depósitos, retiros. Puedes exportar esta información a un archivo CSV para análisis
          adicional o para mantener registros históricos.
        </AlertDescription>
      </Alert>
    </div>
  )
}
