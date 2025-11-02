"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Filter, TrendingUp, CheckCircle, XCircle, AlertCircle, Clock, Calendar } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  getAllBetsForAdmin,
  getAllUsers,
  getBetProcessingSchedule,
  updateBetProcessingSchedule,
  processBetResults,
} from "@/app/actions/bet-results"

interface UserData {
  id: string
  name: string
  email: string
  role: string
}

export default function ApuestasPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<any[]>([])
  const [userBets, setUserBets] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [betFilterDirection, setBetFilterDirection] = useState<string>("todas")
  const [betFilterAsset, setBetFilterAsset] = useState<string>("todos")
  const [betFilterUser, setBetFilterUser] = useState<string>("todos")
  const [betFilterStatus, setBetFilterStatus] = useState<string>("todos")

  // Estados para la gestión de resultados
  const [winningDirection, setWinningDirection] = useState<string>("a_favor")
  const [scheduledTime, setScheduledTime] = useState<string>("")
  const [scheduledDate, setScheduledDate] = useState<string>("")
  const [showResultsPreview, setShowResultsPreview] = useState(false)
  const [processingResults, setProcessingResults] = useState(false)
  const [resultsSuccess, setResultsSuccess] = useState(false)
  const [resultsError, setResultsError] = useState("")
  const [timeRemaining, setTimeRemaining] = useState<string>("")
  const [tempWinningDirection, setTempWinningDirection] = useState<string>("a_favor")
  const [tempScheduledTime, setTempScheduledTime] = useState<string>("")
  const [tempScheduledDate, setTempScheduledDate] = useState<string>("")

  useEffect(() => {
    const loadData = async () => {
      console.log("[v0] Loading data from database...")

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

      // Load users from database
      const usersResult = await getAllUsers()
      if (usersResult.success && usersResult.data) {
        setUsers(usersResult.data)
        console.log("[v0] Loaded users from database:", usersResult.data.length)
      }

      // Load bets from database
      const betsResult = await getAllBetsForAdmin()
      if (betsResult.success && betsResult.data) {
        setUserBets(betsResult.data)
        console.log("[v0] Loaded bets from database:", betsResult.data.length)
      }

      // Load bet processing schedule from database
      const scheduleResult = await getBetProcessingSchedule()
      if (scheduleResult.success && scheduleResult.data) {
        const schedule = scheduleResult.data
        setScheduledDate(schedule.scheduled_date)
        setScheduledTime(schedule.scheduled_time)
        setWinningDirection(schedule.winning_direction || "a_favor")
        setTempScheduledDate(schedule.scheduled_date)
        setTempScheduledTime(schedule.scheduled_time)
        setTempWinningDirection(schedule.winning_direction || "a_favor")
        console.log("[v0] Loaded schedule from database:", schedule)
      } else {
        // Set default values if no schedule exists
        const now = new Date()
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const localDate = tomorrow.toISOString().split("T")[0]

        setScheduledDate(localDate)
        setScheduledTime("02:00")
        setTempScheduledDate(localDate)
        setTempScheduledTime("02:00")
        console.log("[v0] No schedule found, using defaults")
      }

      setLoading(false)
    }

    loadData()
  }, [router])

  // Get unique users for filter
  const getUniqueUsers = () => {
    const uniqueUsers = new Set<string>()
    userBets.forEach((bet) => {
      if (bet.userId) {
        uniqueUsers.add(bet.userId)
      }
    })
    return Array.from(uniqueUsers)
  }

  // Get unique assets for filter
  const getUniqueAssets = () => {
    const uniqueAssets = new Set<string>()
    userBets.forEach((bet) => {
      if (bet.symbol || bet.asset) {
        uniqueAssets.add(bet.symbol || bet.asset)
      }
    })
    return Array.from(uniqueAssets)
  }

  // Get unique statuses for filter
  const getUniqueStatuses = () => {
    const uniqueStatuses = new Set<string>()
    userBets.forEach((bet) => {
      if (bet.status) {
        uniqueStatuses.add(bet.status)
      } else {
        uniqueStatuses.add("PENDIENTE")
      }
    })
    return Array.from(uniqueStatuses)
  }

  // Get filtered bets
  const getFilteredBets = () => {
    return userBets.filter((bet) => {
      if (bet.status === "completed" || bet.is_processed === true) {
        return false
      }

      // Filter by search term
      if (
        searchTerm &&
        !(
          (bet.userName && bet.userName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (bet.userId && bet.userId.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (bet.id && bet.id.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      ) {
        return false
      }

      // Filter by direction
      if (betFilterDirection !== "todas" && bet.direction !== betFilterDirection) {
        return false
      }

      // Filter by asset
      if (betFilterAsset !== "todos" && (bet.symbol || bet.asset) !== betFilterAsset) {
        return false
      }

      // Filter by user
      if (betFilterUser !== "todos" && bet.userId !== betFilterUser) {
        return false
      }

      // Filter by status
      if (betFilterStatus !== "todos" && bet.status !== betFilterStatus) {
        return false
      }

      return true
    })
  }

  // Funciones para la gestión de resultados
  const getWinningAndLosingBets = () => {
    // Filter only active bets (not completed, not lost, not canceled, not processed)
    const activeBets = userBets.filter(
      (bet) =>
        bet.status !== "COMPLETADA" &&
        bet.status !== "PERDIDA" &&
        bet.status !== "CANCELADA" &&
        bet.status !== "completed" &&
        bet.status !== "cancelled" &&
        !bet.is_processed &&
        bet.id &&
        bet.userId &&
        bet.direction &&
        bet.amount,
    )

    const winningBets = activeBets.filter((bet) => bet.direction === winningDirection)
    const losingBets = activeBets.filter((bet) => bet.direction !== winningDirection)

    return { winningBets, losingBets }
  }

  // Añadir una función para calcular el interés diario basado en el nivel VIP
  const getDailyInterestRate = (userId: string, vipLevel?: number) => {
    // Use the vipLevel from the bet data if available
    let level = vipLevel

    // If not available, try to find it from the users list
    if (level === undefined) {
      const userInfo = users.find((u) => u.id === userId)
      level = userInfo?.vip_level || 0
    }

    // Tasas de interés diario según el nivel VIP
    const interestRates = [1.7, 1.87, 2.04, 2.21, 2.38, 2.55, 2.72, 2.89, 3.06, 3.23, 3.4]

    // Asegurarse de que el índice esté dentro de los límites del array
    const safeVipLevel = Math.min(Math.max(0, level || 0), interestRates.length - 1)

    return interestRates[safeVipLevel]
  }

  // Función para calcular el total estimado de una apuesta
  const calculateTotalEstimated = (bet: any) => {
    // Obtener el monto apostado
    const betAmount = Number.parseFloat(bet.amount || bet.shares * bet.price || 0)

    // Calcular el interés diario basado en el nivel VIP del usuario
    const dailyInterestRate = getDailyInterestRate(bet.userId, bet.vipLevel)
    const dailyInterest = betAmount * (dailyInterestRate / 100)

    // Calcular el total estimado (monto apostado + interés diario)
    return betAmount + dailyInterest
  }

  const processResults = async () => {
    setProcessingResults(true)
    setResultsSuccess(false)
    setResultsError("")

    console.log("[v0] Processing results with winning direction:", winningDirection)

    try {
      const { winningBets, losingBets } = getWinningAndLosingBets()

      // Verify if there are bets to process
      if (winningBets.length === 0 && losingBets.length === 0) {
        setResultsError("No hay apuestas activas para procesar. Los usuarios deben realizar nuevas apuestas.")
        setProcessingResults(false)
        return
      }

      // Call server action to process results
      const result = await processBetResults(winningDirection)

      if (!result.success) {
        setResultsError(result.error || "Error al procesar los resultados")
        toast({
          title: "Error",
          description: result.error || "Error al procesar los resultados",
          variant: "destructive",
        })
        setProcessingResults(false)
        return
      }

      // Show success message
      setResultsSuccess(true)
      toast({
        title: "Resultados procesados",
        description: `Se procesaron ${result.data?.totalProcessed} apuestas correctamente`,
      })

      // Reload data from database
      const betsResult = await getAllBetsForAdmin()
      if (betsResult.success && betsResult.data) {
        setUserBets(betsResult.data)
      }

      // Update schedule for next day
      const nextDate = new Date(scheduledDate)
      nextDate.setDate(nextDate.getDate() + 1)
      const nextDateStr = nextDate.toISOString().split("T")[0]

      setScheduledDate(nextDateStr)
      setTempScheduledDate(nextDateStr)

      // Clear success message after 5 seconds
      setTimeout(() => {
        setResultsSuccess(false)
      }, 5000)
    } catch (err) {
      console.error("[v0] Error processing results:", err)
      setResultsError("Ocurrió un error al procesar los resultados. Por favor, inténtalo de nuevo.")
      toast({
        title: "Error",
        description: "Ocurrió un error al procesar los resultados",
        variant: "destructive",
      })
    }

    setProcessingResults(false)
  }

  const saveScheduledTime = async () => {
    try {
      console.log("[v0] Saving schedule to database...")

      const result = await updateBetProcessingSchedule(tempScheduledDate, tempScheduledTime, tempWinningDirection)

      if (!result.success) {
        toast({
          title: "Error",
          description: result.error || "Error al guardar la programación",
          variant: "destructive",
        })
        return
      }

      // Update local state
      setScheduledDate(tempScheduledDate)
      setScheduledTime(tempScheduledTime)
      setWinningDirection(tempWinningDirection)

      toast({
        title: "Programación guardada",
        description: `Programación confirmada para ${tempScheduledDate} a las ${tempScheduledTime}`,
      })

      console.log("[v0] Schedule saved successfully")
    } catch (err) {
      console.error("[v0] Error saving schedule:", err)
      toast({
        title: "Error",
        description: "Error al guardar la programación",
        variant: "destructive",
      })
    }
  }

  const setDefaultTime = () => {
    setTempScheduledTime("02:00")
    toast({
      title: "Hora actualizada",
      description: "Hora actualizada a las 2:00 AM (presione Confirmar programación para aplicar)",
    })
  }

  // Actualizar el tiempo restante y verificar si la hora programada ha cambiado
  useEffect(() => {
    // Function to calculate the remaining time until the scheduled time
    const calculateTimeRemaining = () => {
      const now = new Date()
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`)

      // If the scheduled date has already passed, show "Programado"
      if (scheduledDateTime <= now) {
        return "Programado"
      }

      // Calculate the difference in milliseconds
      const diffMs = scheduledDateTime.getTime() - now.getTime()

      // Convert to hours, minutes and seconds
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
      const diffSecs = Math.floor((diffMs % (1000 * 60)) / 1000)

      return `${diffHrs}h ${diffMins}m ${diffSecs}s`
    }

    // Update the remaining time every second
    const timer = setInterval(() => {
      const remaining = calculateTimeRemaining()
      setTimeRemaining(remaining)

      // Check if the time has reached zero or has passed
      const now = new Date()
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`)

      // If the scheduled time has arrived and the results haven't been processed yet
      if (scheduledDateTime <= now && !resultsSuccess && !processingResults && userBets.length > 0) {
        // Automatically process the results
        processResults()
      }
    }, 1000)

    // Clear the interval when the component unmounts
    return () => clearInterval(timer)
  }, [scheduledDate, scheduledTime, resultsSuccess, processingResults, userBets.length])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Cargando...</p>
      </div>
    )
  }

  const filteredBets = getFilteredBets()

  return (
    <div className="container mx-auto px-4 py-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Apuestas</h1>
          <p className="text-muted-foreground">Administra todas las apuestas de los usuarios en el sistema</p>
        </div>
      </div>

      {/* Statistics Cards - Styled like in the image */}
      <div className="space-y-4 mb-8">
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-full mr-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-blue-600 font-medium">Apuestas Completadas</p>
              <p className="text-3xl font-bold">
                {userBets.filter((bet) => bet.status === "COMPLETADA" || bet.status === "completed").length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center">
            <div className="bg-red-100 p-3 rounded-full mr-4">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-blue-600 font-medium">Apuestas Perdidas</p>
              <p className="text-3xl font-bold">
                {userBets.filter((bet) => bet.status === "PERDIDA" || bet.status === "cancelled").length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Gestión de Apuestas - Styled like in the image */}
      <Card className="mb-8 border rounded-lg">
        <CardContent className="p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Gestión de Apuestas
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium mb-1 block">Dirección de Apuesta</label>
              <select
                className="w-full p-2 border rounded-md"
                value={betFilterDirection}
                onChange={(e) => setBetFilterDirection(e.target.value)}
              >
                <option value="todas">Todas las direcciones</option>
                <option value="a_favor">A favor</option>
                <option value="en_contra">En contra</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Activo</label>
              <select
                className="w-full p-2 border rounded-md"
                value={betFilterAsset}
                onChange={(e) => setBetFilterAsset(e.target.value)}
              >
                <option value="todos">Todos los activos</option>
                {getUniqueAssets().map((asset) => (
                  <option key={asset} value={asset}>
                    {asset}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Usuario</label>
              <select
                className="w-full p-2 border rounded-md"
                value={betFilterUser}
                onChange={(e) => setBetFilterUser(e.target.value)}
              >
                <option value="todos">Todos los usuarios</option>
                {getUniqueUsers().map((userId) => {
                  const userInfo = users.find((u) => u.id === userId) // Use 'users' state here
                  return (
                    <option key={userId} value={userId}>
                      {userInfo?.name || `Usuario ${userId}`}
                    </option>
                  )
                })}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>ID Usuario</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Dinero Apostado</TableHead>
                  <TableHead>Total Estimado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBets.length > 0 ? (
                  filteredBets.map((bet) => {
                    const betAmount = Number(bet.amount || bet.shares * bet.price || 0)
                    const totalEstimated = calculateTotalEstimated(bet)

                    return (
                      <TableRow key={bet.id}>
                        <TableCell>{bet.id}</TableCell>
                        <TableCell>{bet.userId}</TableCell>
                        <TableCell>{bet.userName || "Usuario desconocido"}</TableCell>
                        <TableCell>
                          <Badge
                            className={`${
                              bet.direction === "a_favor"
                                ? "bg-blue-500 hover:bg-blue-600"
                                : "bg-red-500 hover:bg-red-600"
                            } text-white`}
                          >
                            {bet.direction === "a_favor" ? "A favor" : "En contra"}
                          </Badge>
                        </TableCell>
                        <TableCell>${betAmount.toFixed(2)}</TableCell>
                        <TableCell>${totalEstimated.toFixed(2)}</TableCell>
                        <TableCell>
                          {new Date(bet.date).toLocaleDateString()} {new Date(bet.date).toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                bet.status === "COMPLETADA" || bet.status === "completed"
                                  ? "bg-yellow-500"
                                  : bet.status === "PERDIDA" || bet.status === "CANCELADA" || bet.status === "cancelled"
                                    ? "bg-red-500"
                                    : "bg-blue-500"
                              }`}
                            ></div>
                            <span>
                              {bet.status === "COMPLETADA"
                                ? "completed"
                                : bet.status === "PERDIDA"
                                  ? "perdida"
                                  : bet.status === "CANCELADA"
                                    ? "cancelada"
                                    : bet.status || "pendiente"}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4">
                      No se encontraron apuestas con los filtros seleccionados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-between items-center mt-4">
            <p className="text-sm text-gray-600">
              Mostrando {filteredBets.length} de {userBets.length} apuestas
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setBetFilterDirection("todas")
                setBetFilterAsset("todos")
                setBetFilterUser("todos")
              }}
            >
              Limpiar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados de Apuestas - Sección movida desde admin */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Gestión de Resultados de Apuestas
          </CardTitle>
          <CardDescription>Selecciona quiénes ganarán y programa cuándo se aplicarán los resultados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {resultsSuccess && (
              <Alert className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-700" />
                <AlertDescription>
                  Los resultados han sido procesados correctamente. Los saldos de los usuarios han sido actualizados.
                </AlertDescription>
              </Alert>
            )}

            {resultsError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{resultsError}</AlertDescription>
              </Alert>
            )}

            <div>
              <h3 className="text-lg font-medium mb-4">Configuración de Resultados</h3>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Dirección Ganadora</label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={tempWinningDirection}
                    onChange={(e) => setTempWinningDirection(e.target.value)}
                  >
                    <option value="a_favor">A favor</option>
                    <option value="en_contra">En contra</option>
                  </select>
                  <p className="text-sm text-muted-foreground mt-1">
                    Los usuarios que apostaron en esta dirección recibirán su ganancia
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Fecha Programada</label>
                    <Input
                      type="date"
                      value={tempScheduledDate}
                      onChange={(e) => setTempScheduledDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Hora Programada</label>
                    <Input
                      type="time"
                      value={tempScheduledTime}
                      onChange={(e) => setTempScheduledTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    Programado para: {scheduledDate} a las {scheduledTime} (hora local)
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Calendar className="h-4 w-4" />
                  <span>Corresponde a las 2:00 AM hora dominicana</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-amber-600 font-medium mt-2">
                  <Clock className="h-4 w-4" />
                  <span>Tiempo restante: {timeRemaining}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-green-600 mt-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Cambios pendientes:{" "}
                    {tempScheduledDate !== scheduledDate ||
                    tempScheduledTime !== scheduledTime ||
                    tempWinningDirection !== winningDirection
                      ? "Sí (presione Confirmar programación)"
                      : "No"}
                  </span>
                </div>

                <Button variant="outline" className="mt-2 bg-transparent" onClick={setDefaultTime}>
                  Establecer a 2:00 AM (hora dominicana)
                </Button>

                <Button className="w-full bg-blue-600 hover:bg-blue-700 mt-2" onClick={saveScheduledTime}>
                  Confirmar programación
                </Button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Resumen de Resultados</h3>

              <div className="space-y-4">
                <div className="p-4 border rounded-md bg-green-50">
                  <h4 className="font-medium flex items-center gap-2 text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    Apuestas Ganadoras ({winningDirection === "a_favor" ? "A favor" : "En contra"})
                  </h4>
                  <p className="text-sm mt-1">{getWinningAndLosingBets().winningBets.length} apuestas ganadoras</p>
                  <p className="text-sm font-medium mt-2">
                    Total a pagar: $
                    {getWinningAndLosingBets()
                      .winningBets.reduce((sum, bet) => sum + calculateTotalEstimated(bet), 0)
                      .toFixed(2)}
                  </p>
                </div>

                <div className="p-4 border rounded-md bg-red-50">
                  <h4 className="font-medium flex items-center gap-2 text-red-700">
                    <XCircle className="h-4 w-4" />
                    Apuestas Perdedoras ({winningDirection === "a_favor" ? "En contra" : "A favor"})
                  </h4>
                  <p className="text-sm mt-1">{getWinningAndLosingBets().losingBets.length} apuestas perdedoras</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-end">
              <Button variant="outline" onClick={() => setShowResultsPreview(true)}>
                Ver Detalles
              </Button>

              <Button
                onClick={processResults}
                disabled={processingResults || userBets.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {processingResults ? "Procesando..." : "Procesar Resultados Ahora"}
              </Button>
            </div>

            <div className="bg-amber-50 p-4 rounded-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-700">
                  <p className="font-medium mb-1">Importante:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      Al confirmar la programación, el sistema procesará automáticamente los resultados a la hora
                      especificada.
                    </li>
                    <li>
                      Los usuarios que apostaron en la dirección ganadora recibirán automáticamente su ganancia en su
                      saldo.
                    </li>
                    <li>Esta acción no se puede deshacer. Asegúrate de verificar los detalles antes de confirmar.</li>
                    <li>Por defecto, los resultados se procesan a las 2:00 AM hora dominicana.</li>
                    <li>
                      Puedes procesar los resultados manualmente en cualquier momento usando el botón "Procesar
                      Resultados Ahora".
                    </li>
                    <li>
                      Las apuestas se pagan una sola vez por ID. Si una apuesta ya ha sido procesada, no se volverá a
                      pagar.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de vista previa de resultados */}
      <Dialog open={showResultsPreview} onOpenChange={setShowResultsPreview}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Vista Previa de Resultados</DialogTitle>
            <DialogDescription>
              Detalle de las apuestas ganadoras y perdedoras según la configuración actual
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="winners">
            <TabsList className="mb-4">
              <TabsTrigger value="winners">Ganadores ({getWinningAndLosingBets().winningBets.length})</TabsTrigger>
              <TabsTrigger value="losers">Perdedores ({getWinningAndLosingBets().losingBets.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="winners">
              <div className="overflow-x-auto max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>ID Apuesta</TableHead>
                      <TableHead>Monto Apostado</TableHead>
                      <TableHead>Interés</TableHead>
                      <TableHead>Total a Recibir</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getWinningAndLosingBets().winningBets.length > 0 ? (
                      getWinningAndLosingBets().winningBets.map((bet) => {
                        const betAmount = Number.parseFloat(bet.amount || bet.shares * bet.price || 0)
                        const dailyInterestRate = getDailyInterestRate(bet.userId, bet.vipLevel)
                        const dailyInterest = betAmount * (dailyInterestRate / 100)
                        const totalEstimated = betAmount + dailyInterest

                        return (
                          <TableRow key={bet.id}>
                            <TableCell>{bet.userName || "Usuario desconocido"}</TableCell>
                            <TableCell>{bet.id}</TableCell>
                            <TableCell>${betAmount.toFixed(2)}</TableCell>
                            <TableCell>
                              ${dailyInterest.toFixed(2)} ({dailyInterestRate}%)
                            </TableCell>
                            <TableCell className="font-medium">${totalEstimated.toFixed(2)}</TableCell>
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">
                          No hay apuestas ganadoras con la configuración actual
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="losers">
              <div className="overflow-x-auto max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>ID Apuesta</TableHead>
                      <TableHead>Monto Apostado</TableHead>
                      <TableHead>Dirección</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getWinningAndLosingBets().losingBets.length > 0 ? (
                      getWinningAndLosingBets().losingBets.map((bet) => {
                        const betAmount = Number.parseFloat(bet.amount || bet.shares * bet.price || 0)

                        return (
                          <TableRow key={bet.id}>
                            <TableCell>{bet.userName || "Usuario desconocido"}</TableCell>
                            <TableCell>{bet.id}</TableCell>
                            <TableCell>${betAmount.toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge variant={bet.direction === "a_favor" ? "default" : "destructive"}>
                                {bet.direction === "a_favor" ? "A favor" : "En contra"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4">
                          No hay apuestas perdedoras con la configuración actual
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResultsPreview(false)}>
              Cerrar
            </Button>
            <Button
              onClick={() => {
                setShowResultsPreview(false)
                processResults()
              }}
              disabled={processingResults}
              className="bg-green-600 hover:bg-green-700"
            >
              {processingResults ? "Procesando..." : "Procesar Resultados"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Information Alert */}
      <Alert className="mt-8 bg-blue-50 border-blue-200">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700">
          Las apuestas se procesan automáticamente según la programación establecida. Puedes modificar esta
          configuración en la sección de "Gestión de Resultados de Apuestas".
        </AlertDescription>
      </Alert>
    </div>
  )
}
