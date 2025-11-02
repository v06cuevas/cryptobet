"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ChevronLeft, AlertCircle, Bitcoin, Coins, Info, CheckCircle, Crown, KeyRound, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { createWithdrawal, getUserWithdrawalStats } from "@/app/actions/withdrawals"
import { getVIPLevels } from "@/app/actions/vip-levels"
import { createBrowserClient } from "@supabase/ssr"

const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(key)
    }
    return null
  },
  setItem: (key: string, value: string): void => {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, value)
    }
  },
}

const DEFAULT_VIP_LEVELS = [
  {
    id: "1",
    level: 0,
    name: "Básico",
    depositRequired: 0,
    monthlyLimit: 15,
    retirosCantidad: 1,
    color: "bg-gray-400",
    interestRate: 0,
    withdrawalFee: 9.6,
    benefits: [],
  },
  {
    id: "2",
    level: 1,
    name: "Plata",
    depositRequired: 500,
    monthlyLimit: 100,
    retirosCantidad: 2,
    color: "bg-gray-500",
    interestRate: 0.5,
    withdrawalFee: 5,
    benefits: [],
  },
  {
    id: "3",
    level: 2,
    name: "Oro",
    depositRequired: 2000,
    monthlyLimit: 500,
    retirosCantidad: 4,
    color: "bg-yellow-500",
    interestRate: 1,
    withdrawalFee: 3,
    benefits: [],
  },
  {
    id: "4",
    level: 3,
    name: "Platino",
    depositRequired: 5000,
    monthlyLimit: 2000,
    retirosCantidad: 8,
    color: "bg-blue-400",
    interestRate: 1.5,
    withdrawalFee: 1,
    benefits: [],
  },
  {
    id: "5",
    level: 4,
    name: "Diamante",
    depositRequired: 15000,
    monthlyLimit: 10000,
    retirosCantidad: 15,
    color: "bg-black",
    interestRate: 3,
    withdrawalFee: 0.5,
    benefits: [],
  },
]

const getDefaultWithdrawalStats = (vipLevels: any[], vipLevel: number) => {
  const currentLevel = vipLevels.find((l) => l.level === vipLevel) || vipLevels[0]
  return {
    monthlyWithdrawalsUsed: 0,
    monthlyWithdrawalAmount: 0,
    retirosCantidad: currentLevel.retirosCantidad,
  }
}

interface UserData {
  id: string
  name: string
  email: string
  role: string
  balance: number
  status?: string
  referralCode?: string
  referredBy?: string
  totalDeposits?: number
}

export default function WithdrawPage() {
  const [vipLevels, setVipLevels] = useState<any[]>(DEFAULT_VIP_LEVELS)
  const [userVipLevel, setUserVipLevel] = useState(0)
  const [totalDeposits, setTotalDeposits] = useState(0)
  const [monthlyWithdrawalsUsed, setMonthlyWithdrawalsUsed] = useState(0)
  const [monthlyWithdrawalAmount, setMonthlyWithdrawalAmount] = useState(0)
  const [remainingWithdrawals, setRemainingWithdrawals] = useState(0)
  const [cryptoAddress, setCryptoAddress] = useState("")
  const [isLoadingData, setIsLoadingData] = useState(true)

  useEffect(() => {
    setWithdrawMethod("crypto")
    setCryptoMethod("bitcoin")

    const loadUserData = async () => {
      try {
        const vipLevelsResult = await getVIPLevels()
        if (vipLevelsResult.success && vipLevelsResult.data) {
          setVipLevels(vipLevelsResult.data)
          console.log("[v0] VIP Levels loaded from database:", vipLevelsResult.data)
        } else {
          console.warn("[v0] Failed to load VIP levels, using defaults")
          setVipLevels(DEFAULT_VIP_LEVELS)
        }

        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || "",
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
        )

        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          console.error("[v0] No user found")
          setIsLoadingData(false)
          return
        }

        // Get user profile data from Supabase
        const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single()

        if (profileData) {
          console.log("[v0] Profile data loaded:", profileData)
          setUserVipLevel(profileData.vip_level || 0)
          setTotalDeposits(profileData.balance || 0)
        }

        const loadedLevels = vipLevelsResult.success && vipLevelsResult.data ? vipLevelsResult.data : DEFAULT_VIP_LEVELS
        const defaultStats = getDefaultWithdrawalStats(loadedLevels, profileData?.vip_level || 0)

        // Get withdrawal statistics
        const statsResult = await getUserWithdrawalStats()

        if (statsResult.success && statsResult.data) {
          setMonthlyWithdrawalsUsed(statsResult.data.monthlyWithdrawalsUsed)
          setMonthlyWithdrawalAmount(statsResult.data.monthlyWithdrawalAmount)
          setRemainingWithdrawals(defaultStats.retirosCantidad - statsResult.data.monthlyWithdrawalsUsed)
        } else {
          setMonthlyWithdrawalsUsed(0)
          setMonthlyWithdrawalAmount(0)
          setRemainingWithdrawals(defaultStats.retirosCantidad)
        }

        setIsLoadingData(false)
      } catch (err: any) {
        console.error("[v0] Error al cargar datos:", err)
        setIsLoadingData(false)
      }
    }

    loadUserData()
  }, [])

  const [amount, setAmount] = useState("")
  const [withdrawMethod, setWithdrawMethod] = useState("crypto")
  const [cryptoMethod, setCryptoMethod] = useState("bitcoin")
  const [error, setError] = useState("")
  const [step, setStep] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [withdrawPassword, setWithdrawPassword] = useState("")
  const [withdrawPasswordError, setWithdrawPasswordError] = useState("")

  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)

  useEffect(() => {
    try {
      const userData = localStorage.getItem("user")
      if (userData) {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
      } else {
        router.push("/login")
      }
    } catch (err: any) {
      console.error("Error al cargar datos del usuario:", err)
      router.push("/login")
    }
  }, [router])

  const currentVipLevel = vipLevels.find((l) => l.level === userVipLevel) || vipLevels[0]

  const remainingWithdrawalLimit = currentVipLevel.monthlyLimit

  const calculateWithdrawalFee = (amount: number): number => {
    const feePercentage = currentVipLevel.withdrawalFee / 100
    return Number((amount * feePercentage).toFixed(2))
  }

  const calculateNetAmount = (amount: number): number => {
    const fee = calculateWithdrawalFee(amount)
    return Number((amount - fee).toFixed(2))
  }

  const handlePresetAmount = (preset: string) => {
    setAmount(preset)

    const numValue = Number(preset)
    if (numValue < 10) {
      setError("El monto mínimo de retiro es de $10")
    } else if (user && numValue > user.balance) {
      setError(`El monto no puede superar tu saldo disponible de $${user.balance.toFixed(2)}`)
    } else if (numValue > remainingWithdrawalLimit) {
      setError(`El monto excede tu límite por retiro de $${remainingWithdrawalLimit.toFixed(2)}`)
    } else {
      setError("")
    }
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setAmount(value)

    if (value) {
      const numValue = Number(value)
      if (numValue < 10) {
        setError("El monto mínimo de retiro es de $10")
      } else if (user && numValue > user.balance) {
        setError(`El monto no puede superar tu saldo disponible de $${user.balance.toFixed(2)}`)
      } else if (numValue > remainingWithdrawalLimit) {
        setError(`El monto excede tu límite por retiro de $${remainingWithdrawalLimit.toFixed(2)}`)
      } else {
        setError("")
      }
    } else {
      setError("")
    }
  }

  const handleWithdrawMethodChange = (value: string) => {
    setWithdrawMethod("crypto")
  }

  const handleCryptoMethodChange = (value: string) => {
    setCryptoMethod(value)
  }

  const handleCryptoAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCryptoAddress(e.target.value)
  }

  const handleWithdrawPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWithdrawPassword(e.target.value)
    if (e.target.value) {
      setWithdrawPasswordError("")
    }
  }

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault()

    if (remainingWithdrawals <= 0) {
      setError(`Ya has alcanzado el límite de ${currentVipLevel.retirosCantidad} retiros mensuales para tu nivel VIP`)
      return
    }

    if (!amount) {
      setError("Por favor ingresa un monto para retirar")
      return
    }

    const numAmount = Number(amount)
    if (numAmount < 10) {
      setError("El monto mínimo de retiro es de $10")
      return
    }

    if (user && numAmount > user.balance) {
      setError(`El monto no puede superar tu saldo disponible de $${user.balance.toFixed(2)}`)
      return
    }

    if (numAmount > remainingWithdrawalLimit) {
      setError(`El monto excede tu límite por retiro de $${remainingWithdrawalLimit.toFixed(2)}`)
      return
    }

    if (!withdrawPassword) {
      setWithdrawPasswordError("La contraseña de retiro es obligatoria")
      return
    }

    if (withdrawPassword !== "Segura2024!") {
      setWithdrawPasswordError("La contraseña de retiro es incorrecta")
      return
    }

    setStep(2)
  }

  const handleSubmitWithdrawal = async () => {
    if (!cryptoAddress) {
      alert("Por favor ingresa una dirección de cartera válida")
      return
    }

    setIsProcessing(true)

    const withdrawalAmount = Number(amount)
    if (user && user.balance < withdrawalAmount) {
      setError(`No tienes saldo suficiente. Tu saldo actual es $${user.balance.toFixed(2)}`)
      setIsProcessing(false)
      setStep(1)
      return
    }

    if (withdrawalAmount > remainingWithdrawalLimit) {
      setError(`El monto excede tu límite por retiro de $${remainingWithdrawalLimit.toFixed(2)}`)
      setIsProcessing(false)
      setStep(1)
      return
    }

    if (remainingWithdrawals <= 0) {
      setError(`Ya has alcanzado el límite de ${currentVipLevel.retirosCantidad} retiros mensuales para tu nivel VIP`)
      setIsProcessing(false)
      setStep(1)
      return
    }

    let methodName = ""
    if (cryptoMethod === "bitcoin") {
      methodName = "Bitcoin"
    } else if (cryptoMethod === "ethereum") {
      methodName = "Ethereum"
    } else {
      methodName = "Criptomoneda"
    }

    const result = await createWithdrawal({
      amount: withdrawalAmount,
      method: withdrawMethod,
      method_name: methodName,
      crypto_address: cryptoAddress,
      crypto_type: cryptoMethod,
    })

    if (!result.success) {
      setError(result.error || "Error al procesar el retiro")
      setIsProcessing(false)
      return
    }

    try {
      const userData = localStorage.getItem("user")
      if (userData) {
        const currentUser = JSON.parse(userData)

        if (currentUser.balance < withdrawalAmount) {
          setError(`No tienes saldo suficiente. Tu saldo actual es $${currentUser.balance.toFixed(2)}`)
          setIsProcessing(false)
          setStep(1)
          return
        }

        currentUser.balance -= withdrawalAmount
        localStorage.setItem("user", JSON.stringify(currentUser))

        const registeredUsers = JSON.parse(localStorage.getItem("registeredUsers") || "[]")
        const userIndex = registeredUsers.findIndex((u: any) => u.id === currentUser.id)
        if (userIndex !== -1) {
          registeredUsers[userIndex].balance -= withdrawalAmount
          localStorage.setItem("registeredUsers", JSON.stringify(registeredUsers))
        }
      }
    } catch (err) {
      console.error("Error updating user balance:", err)
    }

    setTimeout(() => {
      setIsProcessing(false)
      setIsComplete(true)

      localStorage.setItem("pendingWithdrawalVerification", "true")
      localStorage.setItem("withdrawalAmount", amount)
      localStorage.setItem("withdrawalMethod", withdrawMethod)
      localStorage.setItem("withdrawalMethodName", methodName)
      localStorage.setItem("withdrawalDate", new Date().toLocaleDateString())
      localStorage.setItem("withdrawalCryptoAddress", cryptoAddress)
      localStorage.setItem("withdrawalCryptoType", cryptoMethod)
      localStorage.setItem("withdrawalApproved", "false")
      localStorage.setItem("hasUnreadNotifications", "true")

      setTimeout(() => {
        window.location.href = "/profile?tab=financial"
      }, 3000)
    }, 2000)
  }

  if (isLoadingData) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-center items-center min-h-screen">
          <p className="text-muted-foreground">Cargando datos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <Link href="/profile">
          <Button variant="ghost" className="flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" />
            <span>Volver</span>
          </Button>
        </Link>
      </div>

      <Card className="max-w-md mx-auto">
        {step === 1 ? (
          <form onSubmit={handleContinue}>
            <CardHeader>
              <CardTitle>Retirar Fondos</CardTitle>
              <CardDescription>Solicita un retiro de fondos a tu cuenta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted p-4 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Crown className={`h-5 w-5 ${currentVipLevel.color === "bg-black" ? "text-yellow-500" : ""}`} />
                    <span className="font-bold">
                      Nivel VIP {currentVipLevel.level}: {currentVipLevel.name}
                    </span>
                  </div>
                  <Badge className={`${currentVipLevel.color} text-white`}>{currentVipLevel.level}</Badge>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Límite por retiro:</span>
                    <p className="font-medium">
                      ${currentVipLevel.monthlyLimit.toLocaleString()}
                      <span className="text-xs text-muted-foreground ml-2">(Disponible para cada retiro)</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Retiros permitidos:</span>
                    <p className="font-medium">
                      {currentVipLevel.retirosCantidad} por mes
                      <span className="text-xs text-muted-foreground ml-2">(Restantes: {remainingWithdrawals})</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Comisión de retiro:</span>
                    <p className="font-medium">{currentVipLevel.withdrawalFee}%</p>
                  </div>
                </div>
              </div>

              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm flex justify-between items-center">
                  <span>Saldo disponible:</span>
                  <span className="font-bold text-base">${totalDeposits.toFixed(2)}</span>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="withdrawPassword" className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-primary" />
                  <span>Contraseña de retiro</span>
                </Label>
                <div className="relative">
                  <Input
                    id="withdrawPassword"
                    type="password"
                    value={withdrawPassword}
                    onChange={handleWithdrawPasswordChange}
                    placeholder="Ingresa tu contraseña de retiro"
                    className={withdrawPasswordError ? "border-red-500" : ""}
                  />
                  <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                {withdrawPasswordError && (
                  <div className="flex items-center gap-2 text-red-500 text-sm mt-1">
                    <AlertCircle className="h-4 w-4" />
                    <span>{withdrawPasswordError}</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Esta contraseña es obligatoria para realizar retiros y es diferente a tu contraseña de acceso.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Cantidad a retirar</Label>

                <div className="grid grid-cols-3 gap-2 mb-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handlePresetAmount("20")}
                    className={amount === "20" ? "border-primary" : ""}
                  >
                    $20
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handlePresetAmount("50")}
                    className={amount === "50" ? "border-primary" : ""}
                  >
                    $50
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handlePresetAmount("100")}
                    className={amount === "100" ? "border-primary" : ""}
                  >
                    $100
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handlePresetAmount("200")}
                    className={amount === "200" ? "border-primary" : ""}
                  >
                    $200
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handlePresetAmount("500")}
                    className={amount === "500" ? "border-primary" : ""}
                  >
                    $500
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handlePresetAmount("1000")}
                    className={amount === "1000" ? "border-primary" : ""}
                  >
                    $1000
                  </Button>
                </div>

                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={handleAmountChange}
                  min="10"
                  step="1"
                  placeholder="Ingresa el monto a retirar"
                  className="text-lg"
                />

                {error && (
                  <div className="flex items-center gap-2 text-red-500 text-sm mt-1">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Selecciona la criptomoneda</Label>
                <RadioGroup defaultValue="bitcoin" onValueChange={setCryptoMethod}>
                  <div className="flex items-center space-x-2 p-3 border rounded-md mb-2">
                    <RadioGroupItem value="bitcoin" id="bitcoin-withdraw" />
                    <Label htmlFor="bitcoin-withdraw" className="flex items-center gap-2 cursor-pointer">
                      <Bitcoin className="h-4 w-4 text-orange-500" />
                      <span>Bitcoin (BTC)</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-md">
                    <RadioGroupItem value="ethereum" id="ethereum-withdraw" />
                    <Label htmlFor="ethereum-withdraw" className="flex items-center gap-2 cursor-pointer">
                      <Coins className="h-4 w-4 text-purple-500" />
                      <span>Ethereum (ETH)</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="mt-4 bg-blue-50 p-3 rounded-md">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 shrink-0 mt-0.5 text-blue-500" />
                  <p className="text-sm text-blue-700">
                    Recuerda que los retiros no afectan tu nivel VIP. Una vez alcanzado un nivel, este se mantiene
                    permanentemente.
                  </p>
                </div>
              </div>

              <p className={cn("text-sm", error ? "text-red-700" : "text-blue-700")}>
                {error ||
                  `Tu nivel VIP ${currentVipLevel.level} te permite hacer ${currentVipLevel.retirosCantidad} ${currentVipLevel.retirosCantidad === 1 ? "retiro" : "retiros"} mensuales de hasta $${currentVipLevel.monthlyLimit.toLocaleString()} cada uno.`}
              </p>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" size="lg" disabled={remainingWithdrawals <= 0}>
                {remainingWithdrawals <= 0 ? "Límite de retiros alcanzado" : "Continuar"}
              </Button>
            </CardFooter>
          </form>
        ) : isComplete ? (
          <div className="p-6 text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">¡Solicitud enviada!</h3>
            <p className="text-muted-foreground mb-6">
              Tu solicitud de retiro ha sido enviada correctamente. Recibirás una notificación cuando se procese.
            </p>
            <p className="text-sm text-muted-foreground">Redirigiendo a tu perfil...</p>
          </div>
        ) : (
          <>
            <CardHeader>
              <CardTitle>Confirmar Retiro</CardTitle>
              <CardDescription>Revisa los detalles de tu solicitud de retiro</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted p-4 rounded-md space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monto a retirar:</span>
                  <span className="font-bold">${Number(amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Método de retiro:</span>
                  <span className="font-medium">{cryptoMethod === "bitcoin" ? "Bitcoin (BTC)" : "Ethereum (ETH)"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Comisión ({currentVipLevel.withdrawalFee}%):</span>
                  <span className="font-medium text-red-500">
                    -${calculateWithdrawalFee(Number(amount)).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-medium">Total a recibir:</span>
                  <span className="font-bold">${calculateNetAmount(Number(amount)).toLocaleString()}</span>
                </div>
                {user && Number(amount) > user.balance * 0.8 && (
                  <div className="pt-2 text-sm text-amber-600">
                    <div className="flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      <span>
                        {Number(amount) > user.balance
                          ? `El monto excede tu saldo disponible de $${user.balance.toFixed(2)}`
                          : `Este retiro utilizará el ${Math.round((Number(amount) / user.balance) * 100)}% de tu saldo disponible`}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4 border p-4 rounded-md">
                <h3 className="font-medium">Dirección de {cryptoMethod === "bitcoin" ? "Bitcoin" : "Ethereum"}</h3>
                <div className="space-y-2">
                  <Label htmlFor="cryptoAddress">Dirección de la cartera</Label>
                  <Input
                    id="cryptoAddress"
                    value={cryptoAddress}
                    onChange={handleCryptoAddressChange}
                    placeholder={`Ingresa tu dirección de ${cryptoMethod === "bitcoin" ? "Bitcoin" : "Ethereum"}`}
                    required
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Asegúrate de ingresar la dirección correcta. Las transacciones en criptomonedas son irreversibles.
                </p>
              </div>

              <div className="bg-amber-50 p-3 rounded-md">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 shrink-0 mt-0.5 text-amber-500" />
                  <div className="text-sm text-amber-700">
                    <p className="mb-1">Información importante:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>El tiempo de procesamiento es de 1-3 días hábiles.</li>
                      <li>Los retiros están sujetos a verificación de seguridad.</li>
                      <li>Asegúrate de que los datos de la cartera sean correctos.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <div className="w-full space-y-3">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSubmitWithdrawal}
                  disabled={isProcessing || (user && Number(amount) > user.balance) || !cryptoAddress}
                >
                  {isProcessing ? "Procesando..." : "Confirmar retiro"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() => setStep(1)}
                  disabled={isProcessing}
                >
                  Volver
                </Button>
              </div>
            </CardFooter>
          </>
        )}
      </Card>

      <div className="max-w-md mx-auto mt-4 text-center">
        <Link href="/vip-levels" className="text-sm text-primary hover:underline">
          Ver todos los niveles VIP y sus beneficios
        </Link>
      </div>
    </div>
  )
}
