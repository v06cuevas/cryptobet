"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, Info, AlertCircle, CheckCircle } from "lucide-react"
import { getCoinMarketCapById, fetchCryptocurrencyData, getCoinMarketCapSettings } from "@/lib/coinmarketcap-service"
import { createBet } from "@/app/actions/bets"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

const TradePage = () => {
  const searchParams = useSearchParams()
  const assetId = searchParams.get("asset") || "1"
  const action = searchParams.get("action") || "buy"
  const { toast } = useToast()

  const [coinmarketcap, setCoinmarketcap] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState("")
  const [orderType, setOrderType] = useState("market")
  const [limitPrice, setLimitPrice] = useState("")
  const [error, setError] = useState("")
  const [userVipLevel, setUserVipLevel] = useState(0)
  const [user, setUser] = useState<{ balance: number }>({ balance: 1250 })

  const [isProcessing, setIsProcessing] = useState(false)
  const [purchaseComplete, setPurchaseComplete] = useState(false)

  useEffect(() => {
    const loadCryptoData = async () => {
      setLoading(true)

      try {
        // Verificar si tenemos configurada una API key
        const settings = getCoinMarketCapSettings()

        if (settings.apiKey) {
          // Si tenemos API key, intentar obtener datos reales
          try {
            // Intentar obtener datos actualizados de la API
            const cryptoList = await fetchCryptocurrencyData()
            const foundCrypto = cryptoList.find((c) => c.id === assetId)

            if (foundCrypto) {
              // Si encontramos los datos en la API, usarlos
              setCoinmarketcap(foundCrypto)
              setLimitPrice(foundCrypto.price.toString())
              setLoading(false)
              return
            }
          } catch (apiError) {
            console.error("Error fetching real-time data:", apiError)
            // Continuamos con los datos mock si falla la API
          }
        }

        // Si no hay API key o si falló la llamada a la API, usamos los datos del mock
        const mockData = getCoinMarketCapById(assetId)
        setCoinmarketcap(mockData)
        setLimitPrice(mockData.price.toString())
      } catch (err) {
        console.error("Error loading crypto data:", err)
        // En caso de error, usar datos predeterminados
        const fallbackData = {
          id: assetId,
          name: "Bitcoin",
          symbol: "BTC",
          price: 42000,
          change24h: 0,
          change7d: 0,
          type: "Cripto",
        }
        setCoinmarketcap(fallbackData)
        setLimitPrice(fallbackData.price.toString())
      } finally {
        setLoading(false)
      }
    }

    loadCryptoData()
  }, [assetId])

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()

        if (authUser) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("balance, vip_level")
            .eq("id", authUser.id)
            .single()

          if (profile) {
            setUserVipLevel(Number(profile.vip_level) || 0)
            setUser({ balance: Number(profile.balance) || 0 })
          }
        } else {
          // Fallback to localStorage if not authenticated
          const userData = localStorage.getItem("user")
          if (userData) {
            const parsedUser = JSON.parse(userData)
            setUserVipLevel(Number(parsedUser.vipLevel) || 0)
            setUser({ balance: Number(parsedUser.balance) || 1250 })
          }
        }
      } catch (err) {
        console.error("Error loading user data:", err)
      }
    }

    loadUserData()
  }, [])

  // Mover todos los cálculos dentro de una función que solo se ejecuta cuando coinmarketcap no es null
  const calculateValues = () => {
    if (!coinmarketcap) return { shares: 0, estimatedCost: 0, dailyInterestRate: 0, dailyInterest: 0, totalCost: 0 }

    const shares = amount ? Number.parseFloat(amount) / coinmarketcap.price : 0
    const estimatedCost = shares * coinmarketcap.price
    const dailyInterestRate = getDailyInterestRate()
    const dailyInterest = estimatedCost * (dailyInterestRate / 100)
    const totalCost = estimatedCost + dailyInterest

    return { shares, estimatedCost, dailyInterestRate, dailyInterest, totalCost }
  }

  const getDailyInterestRate = () => {
    const interestRates = [1.7, 1.87, 2.04, 2.21, 2.38, 2.55, 2.72, 2.89, 3.06, 3.23, 3.4]
    return interestRates[userVipLevel] || interestRates[0]
  }

  const handleAmountChange = (value: string) => {
    setAmount(value)

    if (value && user && Number(value) > user.balance) {
      setError(`El monto no puede superar tu saldo disponible de $${user.balance.toFixed(2)}`)
    } else {
      setError("")
    }
  }

  const handleConfirmPurchase = async () => {
    if (!coinmarketcap) {
      setError("No se pudieron cargar los datos del activo")
      return
    }

    if (!amount) {
      setError("Por favor ingresa un monto para apostar")
      return
    }

    const purchaseAmount = Number(amount)

    if (isNaN(purchaseAmount) || purchaseAmount <= 0) {
      setError("Por favor ingresa un monto válido")
      return
    }

    if (purchaseAmount > user.balance) {
      setError(`El monto no puede superar tu saldo disponible de $${user.balance.toFixed(2)}`)
      return
    }

    setIsProcessing(true)
    setError("")

    try {
      const { shares } = calculateValues()

      const result = await createBet({
        asset: coinmarketcap.symbol,
        amount: purchaseAmount,
        shares: shares,
        price: coinmarketcap.price,
        type: action === "buy" ? "Apuesta a Favor" : "Apuesta en Contra",
        direction: action === "buy" ? "a_favor" : "en_contra",
      })

      if (!result.success) {
        setError(result.error || "Error al crear la apuesta")
        setIsProcessing(false)
        return
      }

      const supabase = createClient()
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (authUser) {
        const { data: profile } = await supabase.from("profiles").select("balance").eq("id", authUser.id).single()

        if (profile) {
          const newBalance = Number(profile.balance) || 0
          setUser({ balance: newBalance })

          // Update localStorage for consistency
          const userData = localStorage.getItem("user")
          if (userData) {
            const parsedUser = JSON.parse(userData)
            parsedUser.balance = newBalance
            localStorage.setItem("user", JSON.stringify(parsedUser))
          }

          console.log("[v0] Balance updated after bet:", newBalance)
        }
      }

      toast({
        title: "¡Apuesta creada!",
        description: `Tu apuesta ${action === "buy" ? "a favor" : "en contra"} de ${coinmarketcap.symbol} por $${purchaseAmount.toFixed(2)} ha sido registrada.`,
      })

      setPurchaseComplete(true)

      setTimeout(() => {
        window.location.href = `/assets/${coinmarketcap.id}`
      }, 2000)
    } catch (err) {
      console.error("Error al procesar la apuesta:", err)
      setError("Ocurrió un error al procesar tu apuesta")
    }

    setIsProcessing(false)
  }

  // Renderizar el estado de carga
  if (loading || !coinmarketcap) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <Link href="/markets">
            <Button variant="ghost" className="flex items-center gap-2">
              <ChevronLeft className="h-4 w-4" />
              <span>Volver</span>
            </Button>
          </Link>
        </div>
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Cargando datos...</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Calcular valores solo cuando coinmarketcap está disponible
  const { shares, estimatedCost, dailyInterestRate, dailyInterest, totalCost } = calculateValues()

  // Renderizar la interfaz principal
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <Link href={`/assets/${coinmarketcap.id}`}>
          <Button variant="ghost" className="flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" />
            <span>Volver</span>
          </Button>
        </Link>
      </div>

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>
            {action === "buy" ? "A favor" : "En contra"} {coinmarketcap.symbol}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-semibold">{coinmarketcap.name}</h2>
                <p className="text-sm text-muted-foreground">{coinmarketcap.type}</p>
              </div>
              <div className="text-right">
                <p className="font-bold">${coinmarketcap.price.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Precio actual</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Tipo de Apuesta</h3>
            <Tabs defaultValue="market" onValueChange={setOrderType}>
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="market">Inmediata</TabsTrigger>
                <TabsTrigger value="limit">Programada</TabsTrigger>
              </TabsList>

              <TabsContent value="market" className="pt-2">
                <p className="text-sm text-muted-foreground">
                  La apuesta se ejecutará inmediatamente al mejor precio disponible en el mercado.
                </p>
              </TabsContent>

              <TabsContent value="limit" className="pt-2">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    La apuesta se ejecutará solo cuando el precio alcance o mejore el valor especificado.
                  </p>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="limitPrice">Precio límite:</Label>
                    <Input
                      id="limitPrice"
                      type="number"
                      value={limitPrice}
                      onChange={(e) => setLimitPrice(e.target.value)}
                      className="max-w-[120px]"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Cantidad a apostar {action === "buy" ? "a favor" : "en contra"}</Label>
            <div className="bg-muted p-2 rounded-md mb-2 text-sm">
              <span className="font-medium">Saldo disponible:</span> $
              {!isNaN(Number(user?.balance)) ? Number(user.balance).toFixed(2) : "0.00"}
            </div>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => {
                const value = e.target.value
                setAmount(value)

                if (value && user && Number(value) > user.balance) {
                  setError(`El monto no puede superar tu saldo disponible de $${user.balance.toFixed(2)}`)
                } else {
                  setError("")
                }
              }}
              placeholder={`Ingresa el monto a apostar ${action === "buy" ? "a favor" : "en contra"}`}
              className="text-lg"
            />

            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm mt-1">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 mt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => handleAmountChange("10")}>
                $10
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => handleAmountChange("50")}>
                $50
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => handleAmountChange("100")}>
                $100
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => handleAmountChange("200")}>
                $200
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => handleAmountChange("500")}>
                $500
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => user && handleAmountChange(user.balance.toString())}
              >
                Todo
              </Button>
            </div>
          </div>

          <div className="bg-muted p-3 rounded-md space-y-2">
            <div className="flex justify-between text-sm">
              <span>Precio estimado:</span>
              <span className="font-medium">${coinmarketcap.price.toFixed(2)}</span>
            </div>
            {action === "buy" && (
              <div className="flex justify-between text-sm">
                <span>Cantidad aproximada:</span>
                <span className="font-medium">
                  {shares.toFixed(8)} {coinmarketcap.symbol}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span>Interés diario ({dailyInterestRate}%):</span>
              <span className="font-medium text-green-600">+${dailyInterest.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-medium pt-2 border-t">
              <span>Total estimado:</span>
              <span>${totalCost.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-start gap-2 text-sm bg-blue-50 p-3 rounded-md">
            <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-blue-700">
              {action === "buy"
                ? `Al comprar ${coinmarketcap.symbol}, recibirás un interés diario del ${dailyInterestRate}% sobre tu inversión.`
                : `Al vender ${coinmarketcap.symbol}, dejarás de recibir el interés diario asociado.`}
            </p>
          </div>
        </CardContent>
        <CardFooter>
          {purchaseComplete ? (
            <div className="w-full text-center">
              <div className="flex items-center justify-center text-green-600 mb-2">
                <CheckCircle className="h-6 w-6 mr-2" />
                <span className="font-medium">¡Operación completada con éxito!</span>
              </div>
              <p className="text-sm text-muted-foreground">Redirigiendo...</p>
            </div>
          ) : (
            <Button
              className={`w-full ${action === "buy" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
              onClick={handleConfirmPurchase}
              disabled={isProcessing || error !== ""}
            >
              {isProcessing ? "Procesando..." : `Confirmar Apuesta ${action === "buy" ? "A Favor" : "En Contra"}`}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

export default TradePage
