"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, Clock, X, TrendingUp, Wallet } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { getUserBets, cancelBet, getScheduledProcessingTime, type Bet } from "@/app/actions/bets"
import { useToast } from "@/hooks/use-toast"

interface User {
  id: string
  name: string
  email: string
  balance: number
  [key: string]: any
}

export default function PurchasesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [transactions, setTransactions] = useState<Bet[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTransaction, setSelectedTransaction] = useState<Bet | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [openDialog, setOpenDialog] = useState(false)
  const [scheduledDateTime, setScheduledDateTime] = useState<Date | null>(null)

  const loadBets = async () => {
    const result = await getUserBets()
    if (result.success && result.data) {
      setTransactions(result.data)
    }
  }

  const loadScheduledTime = async () => {
    const result = await getScheduledProcessingTime()
    if (result.success && result.data) {
      const dateTime = new Date(`${result.data.scheduled_date}T${result.data.scheduled_time}`)
      setScheduledDateTime(dateTime)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        const userData = localStorage.getItem("user")
        if (!userData) {
          router.push("/login")
          return
        }

        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)

        await Promise.all([loadBets(), loadScheduledTime()])

        setLoading(false)
      } catch (err) {
        console.error("Error al cargar datos:", err)
        router.push("/login")
      }
    }

    loadData()
  }, [router])

  const isCancelable = (dateString: string, isProcessed: boolean) => {
    if (isProcessed) {
      return false
    }

    const purchaseDate = new Date(dateString)
    const now = new Date()
    const hoursDiff = (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60)

    if (scheduledDateTime) {
      if (scheduledDateTime <= now) {
        return false
      }

      const minutesUntilProcessing = (scheduledDateTime.getTime() - now.getTime()) / (1000 * 60)

      if (minutesUntilProcessing < 5) {
        return false
      }
    }

    return hoursDiff <= 24
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getTimeRemaining = (dateString: string, isProcessed: boolean) => {
    if (isProcessed) {
      return "Expirado"
    }

    const purchaseDate = new Date(dateString)
    const expiryDate = new Date(purchaseDate.getTime() + 24 * 60 * 60 * 1000)
    const now = new Date()

    if (scheduledDateTime) {
      if (scheduledDateTime < expiryDate) {
        if (now > scheduledDateTime) return "Expirado"

        const diffMs = scheduledDateTime.getTime() - now.getTime()
        const diffMins = Math.floor(diffMs / (1000 * 60))

        if (diffMins < 5) {
          return "Expirado (cierre próximo)"
        }

        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
        const remainingMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

        return `${diffHrs}h ${remainingMins}m (Cierre en ${diffMins}m)`
      }
    }

    if (now > expiryDate) return "Expirado"

    const diffMs = expiryDate.getTime() - now.getTime()
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

    return `${diffHrs}h ${diffMins}m`
  }

  const handleCancelPurchase = async (transaction: Bet) => {
    setIsProcessing(true)

    try {
      const result = await cancelBet(transaction.id)

      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Error al cancelar",
          description: result.error || "No se pudo cancelar la apuesta",
        })
        setIsProcessing(false)
        return
      }

      if (user && result.refundAmount) {
        const updatedUser = { ...user }
        updatedUser.balance += result.refundAmount
        localStorage.setItem("user", JSON.stringify(updatedUser))
        setUser(updatedUser)

        const registeredUsers = JSON.parse(localStorage.getItem("registeredUsers") || "[]")
        const userIndex = registeredUsers.findIndex((u: User) => u.id === user.id)
        if (userIndex !== -1) {
          registeredUsers[userIndex].balance = updatedUser.balance
          localStorage.setItem("registeredUsers", JSON.stringify(registeredUsers))
        }
      }

      toast({
        title: "Apuesta cancelada",
        description: `$${result.refundAmount?.toFixed(2)} han sido devueltos a tu saldo.`,
      })

      await loadBets()
      setOpenDialog(false)
    } catch (err) {
      console.error("Error al cancelar la compra:", err)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error al cancelar la apuesta",
      })
    }

    setIsProcessing(false)
  }

  useEffect(() => {
    const interval = setInterval(() => {
      loadScheduledTime()
    }, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const calculateWinnings = (bet: Bet) => {
    const amount = Number(bet.amount)
    const interestRate = Number(bet.interest_rate)
    const interest = amount * (interestRate / 100)
    return amount + interest
  }

  const isBetCompleted = (bet: Bet) => {
    return bet.status === "completed" || bet.is_processed
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Cargando...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 pb-20">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href="/markets">
            <Button variant="ghost" className="flex items-center gap-2 p-0">
              <ChevronLeft className="h-4 w-4" />
              <span>Volver</span>
            </Button>
          </Link>
          <h1 className="text-2xl font-bold mt-4">Mis Apuestas</h1>
          <p className="text-muted-foreground">Gestiona tus apuestas recientes y cancelaciones</p>
        </div>

        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              <div>
                <p className="text-xs">Saldo disponible</p>
                <p className="text-lg font-bold">${user?.balance.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Apuestas Recientes</CardTitle>
          <CardDescription>
            Puedes cancelar apuestas dentro de las 24 horas siguientes a la transacción o hasta que se cierre el período
            de apuestas
            {scheduledDateTime && (
              <span className="font-medium ml-1">
                (programado para {scheduledDateTime.toLocaleDateString()} a las {scheduledDateTime.toLocaleTimeString()}
                )
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Criptomoneda</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tiempo para cancelar</TableHead>
                    <TableHead>Estado/Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => {
                    const canCancel = isCancelable(transaction.created_at, transaction.is_processed)
                    const direction = transaction.direction === "a_favor" ? "A favor" : "En contra"
                    const isCompleted = isBetCompleted(transaction)
                    const winnings = calculateWinnings(transaction)

                    return (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">{transaction.asset}</TableCell>
                        <TableCell>
                          <Badge variant={direction === "A favor" ? "default" : "destructive"}>{direction}</Badge>
                        </TableCell>
                        <TableCell>{Number(transaction.shares).toFixed(8)}</TableCell>
                        <TableCell>${Number(transaction.price).toFixed(2)}</TableCell>
                        <TableCell>${Number(transaction.amount).toFixed(2)}</TableCell>
                        <TableCell>{formatDate(transaction.created_at)}</TableCell>
                        <TableCell>
                          {canCancel ? (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700">
                              <Clock className="h-3 w-3 mr-1" />
                              {getTimeRemaining(transaction.created_at, transaction.is_processed)}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-100 text-gray-500">
                              Expirado
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {isCompleted ? (
                            <div className="flex items-center gap-2">
                              <Badge variant="default" className="bg-green-600 text-white">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Ganancia: ${winnings.toFixed(2)}
                              </Badge>
                            </div>
                          ) : canCancel ? (
                            <Dialog
                              open={openDialog && selectedTransaction?.id === transaction.id}
                              onOpenChange={(open) => {
                                setOpenDialog(open)
                                if (!open) setSelectedTransaction(null)
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => setSelectedTransaction(transaction)}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Cancelar
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Confirmar Cancelación</DialogTitle>
                                  <DialogDescription>
                                    ¿Estás seguro de que deseas cancelar esta apuesta? El monto de $
                                    {Number(transaction.amount).toFixed(2)} será devuelto a tu saldo disponible.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="py-4">
                                  <div className="bg-muted p-3 rounded-md space-y-2">
                                    <div className="flex justify-between">
                                      <span className="text-sm text-muted-foreground">Criptomoneda:</span>
                                      <span className="font-medium">{transaction.asset}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-sm text-muted-foreground">Dirección:</span>
                                      <span className="font-medium">{direction}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-sm text-muted-foreground">Cantidad:</span>
                                      <span className="font-medium">{Number(transaction.shares).toFixed(8)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-sm text-muted-foreground">Monto:</span>
                                      <span className="font-medium">${Number(transaction.amount).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-sm text-muted-foreground">Fecha de apuesta:</span>
                                      <span className="font-medium">{formatDate(transaction.created_at)}</span>
                                    </div>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setOpenDialog(false)}>
                                    Cancelar
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() => handleCancelPurchase(transaction)}
                                    disabled={isProcessing}
                                  >
                                    {isProcessing ? "Procesando..." : "Confirmar Cancelación"}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          ) : (
                            <Badge variant="outline" className="bg-gray-100 text-gray-500">
                              Finalizada
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <div className="bg-muted p-4 rounded-full">
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-lg font-medium mb-2">No tienes apuestas recientes</h3>
              <p className="text-muted-foreground mb-4">
                Cuando realices apuestas en criptomonedas, aparecerán aquí para que puedas gestionarlas.
              </p>
              <Link href="/markets">
                <Button>Explorar Mercado</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
