"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { TrendingUp, TrendingDown, AlertCircle, Star, Settings, Edit, Save, RefreshCw, X, Loader2 } from "lucide-react"
import { CheckCircle } from "lucide-react"
import { fetchCryptocurrencyData, type FormattedCryptoData } from "@/lib/coinmarketcap-service"
import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

// Mock useAuth hook for demonstration purposes. Replace with your actual auth hook.
const useAuth = () => {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate fetching user data
    setTimeout(() => {
      setUser({ id: "user-123", name: "John Doe" })
      setProfile({ bio: "Software Developer" })
      setRole("admin")
      setLoading(false)
    }, 1000)
  }, [])

  return { user, profile, role, loading }
}
// --- FIX END ---

interface UserData {
  id: string
  name: string
  email: string
  role: string
}

interface Cryptocurrency {
  id: string
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  marketCap: string
  volume: string
  type: string
  high24h?: number
  low24h?: number
}

export default function CryptPage() {
  const router = useRouter()
  const { user, profile, role, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [cryptos, setCryptos] = useState<FormattedCryptoData[]>([])
  const [recommendedCrypto, setRecommendedCrypto] = useState<FormattedCryptoData | null>(null)
  const [editingCrypto, setEditingCrypto] = useState<FormattedCryptoData | null>(null)
  const [editedPrice, setEditedPrice] = useState("")
  const [editedChange, setEditedChange] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [usingMockData, setUsingMockData] = useState(false)
  const [usingRealData, setUsingRealData] = useState(false)

  // Add these state variables at the top of the component
  const [dataSource, setDataSource] = useState("internal")
  const [coinmarketcapApiKey, setCoinmarketcapApiKey] = useState("")
  const [coingeckoApiKey, setCoingeckoApiKey] = useState("")
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [savingToDb, setSavingToDb] = useState(false)

  const [apiStatus, setApiStatus] = useState<"idle" | "testing" | "success" | "error">("idle")
  const [apiStatusMessage, setApiStatusMessage] = useState("")

  const [testingConnection, setTestingConnection] = useState(false)

  // Load settings and API keys from Supabase on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Load from Supabase
        const { data: cryptoData } = await supabase.from("crypto").select("*").maybeSingle()

        if (cryptoData) {
          // Load API keys
          if (cryptoData.coinmarketcap_api_key) {
            setCoinmarketcapApiKey(cryptoData.coinmarketcap_api_key)
          }
          if (cryptoData.coingecko_api_key) {
            setCoingeckoApiKey(cryptoData.coingecko_api_key)
          }
          // Load data source
          if (cryptoData.data_source) {
            setDataSource(cryptoData.data_source)
          }
        }

        // Also check localStorage for cached settings
        const savedSettings = localStorage.getItem("cryptSettings")
        if (savedSettings) {
          try {
            const settings = JSON.parse(savedSettings)
            if (settings.apiConnected) {
              setApiStatus("success")
            }
          } catch (err) {
            console.error("Error parsing settings:", err)
          }
        }

        // Load cached cryptos
        const cachedCryptos = localStorage.getItem("cachedCryptos")
        if (cachedCryptos) {
          try {
            const parsed = JSON.parse(cachedCryptos)
            setCryptos(parsed)
          } catch (err) {
            console.error("Error parsing cached cryptos:", err)
          }
        }

        // Load recommended crypto
        const cachedRecommended = localStorage.getItem("recommendedCrypto")
        if (cachedRecommended) {
          try {
            const parsed = JSON.parse(cachedRecommended)
            setRecommendedCrypto(parsed)
          } catch (err) {
            console.error("Error parsing recommended crypto:", err)
          }
        }

        // Load last update time
        const lastUpdateStr = localStorage.getItem("lastCryptoUpdate")
        if (lastUpdateStr) {
          setLastUpdate(new Date(lastUpdateStr))
        }
      } catch (error) {
        console.error("Error loading settings:", error)
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [])

  // Fetch cryptocurrency data from API
  // Modificar la función fetchCryptoData para limitar a 13 criptomonedas
  const fetchCryptoData = async () => {
    setIsUpdating(true)
    setApiError(null)

    try {
      const data = await fetchCryptocurrencyData(13)
      setCryptos(data)

      // Cache the data
      localStorage.setItem("cachedCryptos", JSON.stringify(data))

      // Update recommended crypto if it exists
      if (recommendedCrypto) {
        const updatedRecommended = data.find((c) => c.id === recommendedCrypto.id)
        if (updatedRecommended) {
          setRecommendedCrypto(updatedRecommended)
          localStorage.setItem("recommendedCrypto", JSON.stringify(updatedRecommended))
        }
      } else if (data.length > 0) {
        // Set Bitcoin as default recommended if none is set
        const btc = data.find((c) => c.symbol === "BTC") || data[0]
        setRecommendedCrypto(btc)
        localStorage.setItem("recommendedCrypto", JSON.stringify(btc))
      }

      // Update last update time
      const now = new Date()
      setLastUpdate(now)
      localStorage.setItem("lastCryptoUpdate", now.toISOString())

      // Verificar si hay API key en Supabase para determinar si usamos datos reales
      const { data: cryptoData } = await supabase
        .from("crypto")
        .select("coinmarketcap_api_key, coingecko_api_key")
        .maybeSingle()

      // Determinar si usamos datos reales basándonos en la fuente seleccionada
      const savedSettings = localStorage.getItem("cryptSettings")
      let currentDataSource = "internal"
      if (savedSettings) {
        try {
          const settings = JSON.parse(savedSettings)
          currentDataSource = settings.dataSource || "internal"
        } catch (err) {
          console.error("Error parsing settings:", err)
        }
      }

      if (currentDataSource === "coinmarketcap" && cryptoData?.coinmarketcap_api_key) {
        setUsingRealData(true)
        setUsingMockData(false)
      } else if (currentDataSource === "coingecko" && cryptoData?.coingecko_api_key) {
        setUsingRealData(true)
        setUsingMockData(false)
      } else {
        setUsingMockData(true)
        setUsingRealData(false)
      }
    } catch (err) {
      console.error("Error fetching cryptocurrency data:", err)
      setApiError(err instanceof Error ? err.message : "Error al obtener datos de criptomonedas")
      setUsingMockData(true)
      setUsingRealData(false)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSetRecommended = (crypto: FormattedCryptoData) => {
    try {
      localStorage.setItem("recommendedCrypto", JSON.stringify(crypto))
      setRecommendedCrypto(crypto)
      alert(`${crypto.name} (${crypto.symbol}) ha sido establecido como la criptomoneda recomendada.`)
    } catch (err) {
      console.error("Error setting recommended crypto:", err)
      alert("Error al establecer la criptomoneda recomendada.")
    }
  }

  const handleEditCrypto = (crypto: FormattedCryptoData) => {
    setEditingCrypto(crypto)
    setEditedPrice(crypto.price.toString())
    setEditedChange(crypto.change24h.toString())
  }

  const handleSaveEdit = () => {
    if (!editingCrypto) return

    try {
      const newPrice = Number.parseFloat(editedPrice)
      const newChange = Number.parseFloat(editedChange)

      if (isNaN(newPrice) || isNaN(newChange)) {
        alert("Por favor ingrese valores numéricos válidos.")
        return
      }

      // Calculate new percent change
      const newPercentChange = (newChange / (newPrice - newChange)) * 100

      // Update the crypto in the list
      const updatedCryptos = cryptos.map((crypto) => {
        if (crypto.id === editingCrypto.id) {
          return {
            ...crypto,
            price: newPrice,
            change24h: newChange,
            change7d: crypto.change7d, // Keep the original 7d change
          }
        }
        return crypto
      })

      setCryptos(updatedCryptos)

      // If this was the recommended crypto, update that too
      if (recommendedCrypto && recommendedCrypto.id === editingCrypto.id) {
        const updatedRecommended = {
          ...recommendedCrypto,
          price: newPrice,
          change24h: newChange,
        }
        setRecommendedCrypto(updatedRecommended)
        localStorage.setItem("recommendedCrypto", JSON.stringify(updatedRecommended))
      }

      // Update last update time
      const now = new Date()
      setLastUpdate(now)
      localStorage.setItem("lastCryptoUpdate", now.toISOString())

      setEditingCrypto(null)
      alert("Criptomoneda actualizada correctamente.")
    } catch (err) {
      console.error("Error updating crypto:", err)
      alert("Error al actualizar la criptomoneda.")
    }
  }

  const handleCancelEdit = () => {
    setEditingCrypto(null)
  }

  // Add this function to save settings to localStorage and Supabase
  const handleSaveSettings = async () => {
    setSavingToDb(true)
    setSaveError("")

    try {
      const settings = {
        dataSource,
        lastUpdated: new Date().toISOString(),
        apiConnected: apiStatus === "success",
        lastTested: apiStatus === "success" ? new Date().toISOString() : null,
      }

      localStorage.setItem("cryptSettings", JSON.stringify(settings))

      // Save API keys and data source to Supabase
      const { data: existingData } = await supabase.from("crypto").select("id").maybeSingle()

      if (existingData) {
        // Update existing record
        const { error } = await supabase
          .from("crypto")
          .update({
            coinmarketcap_api_key: coinmarketcapApiKey || null,
            coingecko_api_key: coingeckoApiKey || null,
            data_source: dataSource,
          })
          .eq("id", existingData.id)

        if (error) throw error
      } else {
        // Insert new record
        const { error } = await supabase.from("crypto").insert({
          coinmarketcap_api_key: coinmarketcapApiKey || null,
          coingecko_api_key: coingeckoApiKey || null,
          data_source: dataSource,
        })

        if (error) throw error
      }

      setSaveSuccess(true)

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false)
      }, 3000)

      // Refresh data with new settings
      fetchCryptoData()
    } catch (err) {
      console.error("Error saving crypto settings:", err)
      setSaveError("Error al guardar la configuración en la base de datos. Por favor, inténtalo de nuevo.")
    } finally {
      setSavingToDb(false)
    }
  }

  const handleTestConnection = async () => {
    setTestingConnection(true)
    setApiStatus("testing")
    setApiStatusMessage("Probando conexión con la API...")

    try {
      console.log("[v0] Testing API connection...")

      if (dataSource === "coinmarketcap") {
        // Usar la edge function de Supabase para probar CoinMarketCap
        const { data, error } = await supabase.functions.invoke("coinmarketcap", {
          body: { limit: 2 },
        })

        if (error) {
          console.error("[v0] Error calling edge function:", error)
          throw new Error(`Error al llamar a la función: ${error.message}`)
        }

        console.log("[v0] Edge function response:", data)

        // Verificar si la respuesta contiene los datos esperados
        if (data && data.data && Array.isArray(data.data) && data.data.length > 0) {
          setApiStatus("success")
          setApiStatusMessage("Conexión exitosa con CoinMarketCap API.")
          setUsingRealData(true)
          setUsingMockData(false)

          // Mostrar los precios actuales de BTC y ETH si están disponibles
          const btc = data.data.find((crypto: any) => crypto.symbol === "BTC")
          const eth = data.data.find((crypto: any) => crypto.symbol === "ETH")

          let detailMsg = ""
          if (btc) detailMsg += `BTC: $${btc.quote.USD.price.toFixed(2)} `
          if (eth) detailMsg += `ETH: $${eth.quote.USD.price.toFixed(2)}`

          if (detailMsg) {
            setApiStatusMessage(`Conexión exitosa. Precios actuales: ${detailMsg}`)
          }

          // Save the successful connection and persist to database
          try {
            const settings = {
              dataSource,
              lastTested: new Date().toISOString(),
              apiConnected: true,
            }
            localStorage.setItem("cryptSettings", JSON.stringify(settings))
            // Limpiar cachés para forzar datos reales
            localStorage.removeItem("cryptoDataCache")
            localStorage.removeItem("cachedCryptos")

            // Guardar automáticamente en la base de datos tras prueba exitosa
            handleSaveSettings()
          } catch (err) {
            console.error("[v0] Error saving API connection status:", err)
          }
        } else {
          throw new Error("La respuesta de la API no contiene los datos esperados")
        }
      } else if (dataSource === "coingecko") {
        // Usar la edge function de Supabase para probar CoinGecko
        const { data, error } = await supabase.functions.invoke("coingecko", {
          body: { limit: 2 },
        })

        if (error) {
          console.error("[v0] Error calling CoinGecko edge function:", error)
          throw new Error(`Error al llamar a la función CoinGecko: ${error.message}`)
        }

        console.log("[v0] CoinGecko edge function response:", data)

        // Verificar si la respuesta contiene los datos esperados
        if (data && Array.isArray(data) && data.length > 0) {
          setApiStatus("success")
          setApiStatusMessage("Conexión exitosa con CoinGecko API.")
          setUsingRealData(true)
          setUsingMockData(false)

          // Mostrar los precios actuales de BTC y ETH si están disponibles
          const btc = data.find((crypto: any) => crypto.symbol.toLowerCase() === "btc")
          const eth = data.find((crypto: any) => crypto.symbol.toLowerCase() === "eth")

          let detailMsg = ""
          if (btc) detailMsg += `BTC: $${btc.current_price.toFixed(2)} `
          if (eth) detailMsg += `ETH: $${eth.current_price.toFixed(2)}`

          if (detailMsg) {
            setApiStatusMessage(`Conexión exitosa. Precios actuales: ${detailMsg}`)
          }

          // Save the successful connection and persist to database
          try {
            const settings = {
              dataSource,
              lastTested: new Date().toISOString(),
              apiConnected: true,
            }
            localStorage.setItem("cryptSettings", JSON.stringify(settings))
            // Limpiar cachés para forzar datos reales
            localStorage.removeItem("cryptoDataCache")
            localStorage.removeItem("cachedCryptos")

            // Guardar automáticamente en la base de datos tras prueba exitosa
            handleSaveSettings()
          } catch (err) {
            console.error("[v0] Error saving API connection status:", err)
          }
        } else {
          throw new Error("La respuesta de la API no contiene los datos esperados")
        }
      } else {
        setApiStatus("error")
        setApiStatusMessage("Selecciona una fuente de datos para probar la conexión")
      }
    } catch (error) {
      console.error("[v0] Error testing API connection:", error)
      setApiStatus("error")
      setApiStatusMessage(`Error de conexión: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setTestingConnection(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Criptomonedas</h1>
          <p className="text-muted-foreground">Administra las criptomonedas disponibles en la plataforma</p>
        </div>

        <div className="flex flex-col sm:flex-row items-end gap-2">
          {usingRealData && (
            <Badge variant="outline" className="bg-green-100 text-green-800 mb-2 sm:mb-0">
              Usando datos reales
            </Badge>
          )}
          {usingMockData && !usingRealData && (
            <Badge variant="outline" className="bg-amber-100 text-amber-800 mb-2 sm:mb-0">
              Usando datos de ejemplo
            </Badge>
          )}
          <Button
            variant="outline"
            className="flex items-center gap-2 bg-transparent"
            onClick={fetchCryptoData}
            disabled={isUpdating}
          >
            <RefreshCw className={`h-4 w-4 ${isUpdating ? "animate-spin" : ""}`} />
            <span>{isUpdating ? "Actualizando..." : "Actualizar Precios"}</span>
          </Button>
        </div>
      </div>

      {lastUpdate && (
        <div className="mb-6 text-sm text-muted-foreground">
          Última actualización: {lastUpdate.toLocaleDateString()} {lastUpdate.toLocaleTimeString()}
        </div>
      )}

      {apiError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Error al obtener datos de criptomonedas: {apiError}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="list" className="mb-8">
        <TabsList className="mb-4 w-full grid grid-cols-3 h-auto">
          <TabsTrigger value="list" className="text-xs sm:text-sm px-2 py-2">
            Lista
          </TabsTrigger>
          <TabsTrigger value="recommended" className="text-xs sm:text-sm px-2 py-2">
            Recomendada
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs sm:text-sm px-2 py-2">
            Configuración
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Criptomonedas Disponibles</CardTitle>
              <CardDescription>Gestiona las criptomonedas disponibles para los usuarios</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rango</TableHead>
                      <TableHead>Símbolo</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Cambio 24h</TableHead>
                      <TableHead>Cambio 7d</TableHead>
                      <TableHead>Cap. Mercado</TableHead>
                      <TableHead>Volumen</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cryptos.map((crypto) => (
                      <TableRow key={crypto.id}>
                        <TableCell>{crypto.rank}</TableCell>
                        <TableCell className="font-medium">{crypto.symbol}</TableCell>
                        <TableCell>{crypto.name}</TableCell>
                        <TableCell>
                          {editingCrypto?.id === crypto.id ? (
                            <Input
                              value={editedPrice}
                              onChange={(e) => setEditedPrice(e.target.value)}
                              className="w-24"
                            />
                          ) : (
                            `$${crypto.price.toFixed(2)}`
                          )}
                        </TableCell>
                        <TableCell>
                          {editingCrypto?.id === crypto.id ? (
                            <Input
                              value={editedChange}
                              onChange={(e) => setEditedChange(e.target.value)}
                              className="w-24"
                            />
                          ) : (
                            <div className={crypto.change24h >= 0 ? "text-green-600" : "text-red-600"}>
                              {crypto.change24h >= 0 ? "+" : ""}
                              {crypto.change24h.toFixed(2)}%
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className={crypto.change7d >= 0 ? "text-green-600" : "text-red-600"}>
                            {crypto.change7d >= 0 ? "+" : ""}
                            {crypto.change7d.toFixed(2)}%
                          </div>
                        </TableCell>
                        <TableCell>{crypto.marketCap}</TableCell>
                        <TableCell>{formatVolume(crypto.volume24h)}</TableCell>
                        <TableCell>
                          {editingCrypto?.id === crypto.id ? (
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={handleSaveEdit}>
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleEditCrypto(crypto)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant={recommendedCrypto?.id === crypto.id ? "default" : "outline"}
                                onClick={() => handleSetRecommended(crypto)}
                              >
                                <Star className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden space-y-4">
                {cryptos.map((crypto) => (
                  <Card key={crypto.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg">{crypto.symbol}</h3>
                            {recommendedCrypto?.id === crypto.id && (
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{crypto.name}</p>
                        </div>
                        <Badge variant="outline">#{crypto.rank}</Badge>
                      </div>
                      <div className="space-y-2 text-sm mb-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Precio:</span>
                          {editingCrypto?.id === crypto.id ? (
                            <Input
                              value={editedPrice}
                              onChange={(e) => setEditedPrice(e.target.value)}
                              className="w-24 h-7"
                            />
                          ) : (
                            <span className="font-bold">${crypto.price.toFixed(2)}</span>
                          )}
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cambio 24h:</span>
                          {editingCrypto?.id === crypto.id ? (
                            <Input
                              value={editedChange}
                              onChange={(e) => setEditedChange(e.target.value)}
                              className="w-24 h-7"
                            />
                          ) : (
                            <span
                              className={
                                crypto.change24h >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"
                              }
                            >
                              {crypto.change24h >= 0 ? "+" : ""}
                              {crypto.change24h.toFixed(2)}%
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cambio 7d:</span>
                          <span
                            className={crypto.change7d >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}
                          >
                            {crypto.change7d >= 0 ? "+" : ""}
                            {crypto.change7d.toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cap. Mercado:</span>
                          <span className="font-medium">{crypto.marketCap}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Volumen:</span>
                          <span className="font-medium">{formatVolume(crypto.volume24h)}</span>
                        </div>
                      </div>
                      {editingCrypto?.id === crypto.id ? (
                        <div className="grid grid-cols-2 gap-2">
                          <Button size="sm" variant="outline" onClick={handleSaveEdit}>
                            <Save className="h-4 w-4 mr-1" />
                            Guardar
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                            <X className="h-4 w-4 mr-1" />
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEditCrypto(crypto)}>
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant={recommendedCrypto?.id === crypto.id ? "default" : "outline"}
                            onClick={() => handleSetRecommended(crypto)}
                          >
                            <Star className="h-4 w-4 mr-1" />
                            {recommendedCrypto?.id === crypto.id ? "Recomendada" : "Recomendar"}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommended">
          <Card>
            <CardHeader>
              <CardTitle>Criptomoneda Recomendada</CardTitle>
              <CardDescription>
                Configura la criptomoneda que se mostrará como recomendada a los usuarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recommendedCrypto ? (
                <div className="space-y-6">
                  <div className="p-6 border rounded-lg">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                          <h3 className="text-xl font-bold">{recommendedCrypto.symbol}</h3>
                        </div>
                        <p className="text-muted-foreground">{recommendedCrypto.name}</p>
                      </div>
                      <Badge variant="outline" className="bg-primary/10 text-primary">
                        Recomendada
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-muted-foreground">Precio actual</p>
                        <p className="text-2xl font-bold">${recommendedCrypto.price.toFixed(2)}</p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Cambio 24h</p>
                        <div className="flex items-center gap-1">
                          {recommendedCrypto.change24h >= 0 ? (
                            <TrendingUp className="h-5 w-5 text-green-600" />
                          ) : (
                            <TrendingDown className="h-5 w-5 text-red-600" />
                          )}
                          <p
                            className={`text-xl font-bold ${
                              recommendedCrypto.change24h >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {recommendedCrypto.change24h >= 0 ? "+" : ""}
                            {recommendedCrypto.change24h.toFixed(2)}%
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Cambio 7d</p>
                        <div className="flex items-center gap-1">
                          {recommendedCrypto.change7d >= 0 ? (
                            <TrendingUp className="h-5 w-5 text-green-600" />
                          ) : (
                            <TrendingDown className="h-5 w-5 text-red-600" />
                          )}
                          <p
                            className={`text-xl font-bold ${
                              recommendedCrypto.change7d >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {recommendedCrypto.change7d >= 0 ? "+" : ""}
                            {recommendedCrypto.change7d.toFixed(2)}%
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Capitalización de mercado</p>
                        <p className="text-lg font-medium">{recommendedCrypto.marketCap}</p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Volumen (24h)</p>
                        <p className="text-lg font-medium">{formatVolume(recommendedCrypto.volume24h)}</p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Rango</p>
                        <p className="text-lg font-medium">#{recommendedCrypto.rank}</p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Última actualización</p>
                        <p className="text-lg font-medium">
                          {new Date(recommendedCrypto.lastUpdated).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-700">
                      Esta criptomoneda aparecerá como recomendada en la página de mercados para todos los usuarios.
                      Puedes cambiar la recomendación en cualquier momento.
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No hay criptomoneda recomendada</h3>
                  <p className="text-muted-foreground mb-4">
                    Selecciona una criptomoneda para mostrarla como recomendada a los usuarios.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full bg-transparent" onClick={() => router.push("/markets")}>
                Ver cómo se muestra a los usuarios
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuración de Criptomonedas
              </CardTitle>
              <CardDescription>Configura los parámetros generales para las criptomonedas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {saveSuccess && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700">Configuración guardada correctamente</AlertDescription>
                  </Alert>
                )}

                {saveError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{saveError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  <label className="text-sm font-medium">Fuente de datos para gráficos</label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="internal"
                        checked={dataSource === "internal"}
                        onCheckedChange={() => {
                          setDataSource("internal")
                          setApiStatus("idle")
                          setApiStatusMessage("")
                        }}
                      />
                      <label
                        htmlFor="internal"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        Base de datos interna (sin gráficos en tiempo real)
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="coinmarketcap"
                        checked={dataSource === "coinmarketcap"}
                        onCheckedChange={() => {
                          setDataSource("coinmarketcap")
                          setApiStatus("idle")
                          setApiStatusMessage("")
                        }}
                      />
                      <label
                        htmlFor="coinmarketcap"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        CoinMarketCap API (recomendado)
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="coingecko"
                        checked={dataSource === "coingecko"}
                        onCheckedChange={() => {
                          setDataSource("coingecko")
                          setApiStatus("idle")
                          setApiStatusMessage("")
                        }}
                      />
                      <label
                        htmlFor="coingecko"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        CoinGecko API
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">API Key de CoinMarketCap</label>
                    <div className="flex gap-2 max-w-md">
                      <Input
                        type="password"
                        placeholder="Ingresa tu API key de CoinMarketCap (deja vacío para eliminar)"
                        className="flex-1"
                        value={coinmarketcapApiKey}
                        onChange={(e) => {
                          setCoinmarketcapApiKey(e.target.value)
                          setApiStatus("idle")
                        }}
                      />
                      {coinmarketcapApiKey && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setCoinmarketcapApiKey("")
                            setApiStatus("idle")
                            setApiStatusMessage("")
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      {dataSource === "coinmarketcap" && coinmarketcapApiKey && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleTestConnection}
                          disabled={testingConnection}
                        >
                          {testingConnection ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Probando
                            </>
                          ) : (
                            "Probar"
                          )}
                        </Button>
                      )}
                    </div>
                    {dataSource === "coinmarketcap" && apiStatus === "success" && (
                      <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
                        <CheckCircle className="h-4 w-4" />
                        {apiStatusMessage}
                      </p>
                    )}
                    {dataSource === "coinmarketcap" && apiStatus === "error" && (
                      <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                        <AlertCircle className="h-4 w-4" />
                        {apiStatusMessage}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">API Key de CoinGecko</label>
                    <div className="flex gap-2 max-w-md">
                      <Input
                        type="password"
                        placeholder="Ingresa tu API key de CoinGecko (deja vacío para eliminar)"
                        className="flex-1"
                        value={coingeckoApiKey}
                        onChange={(e) => {
                          setCoingeckoApiKey(e.target.value)
                          setApiStatus("idle")
                        }}
                      />
                      {coingeckoApiKey && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setCoingeckoApiKey("")
                            setApiStatus("idle")
                            setApiStatusMessage("")
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      {dataSource === "coingecko" && coingeckoApiKey && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleTestConnection}
                          disabled={testingConnection}
                        >
                          {testingConnection ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Probando
                            </>
                          ) : (
                            "Probar"
                          )}
                        </Button>
                      )}
                    </div>
                    {dataSource === "coingecko" && apiStatus === "success" && (
                      <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
                        <CheckCircle className="h-4 w-4" />
                        {apiStatusMessage}
                      </p>
                    )}
                    {dataSource === "coingecko" && apiStatus === "error" && (
                      <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                        <AlertCircle className="h-4 w-4" />
                        {apiStatusMessage}
                      </p>
                    )}
                  </div>

                  {dataSource === "coinmarketcap" && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-700">
                      <p className="font-medium mb-1">Obtener una API key de CoinMarketCap:</p>
                      <ol className="list-decimal list-inside space-y-1 ml-1">
                        <li>
                          Regístrate en{" "}
                          <a
                            href="https://coinmarketcap.com/api/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            coinmarketcap.com/api
                          </a>
                        </li>
                        <li>Selecciona el plan gratuito (Basic) para comenzar</li>
                        <li>Copia tu API key desde el dashboard</li>
                        <li>Pégala en el campo de arriba y haz clic en "Probar conexión"</li>
                      </ol>
                    </div>
                  )}

                  {dataSource === "coingecko" && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-700">
                      <p className="font-medium mb-1">Obtener una API key de CoinGecko:</p>
                      <ol className="list-decimal list-inside space-y-1 ml-1">
                        <li>
                          Regístrate en{" "}
                          <a
                            href="https://www.coingecko.com/en/api"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            coingecko.com/en/api
                          </a>
                        </li>
                        <li>Selecciona un plan según tus necesidades</li>
                        <li>Copia tu API key desde el dashboard</li>
                        <li>Pégala en el campo de arriba y haz clic en "Probar conexión"</li>
                      </ol>
                    </div>
                  )}
                </div>

                <Alert
                  className={
                    dataSource === "internal"
                      ? "bg-amber-50 border-amber-200"
                      : apiStatus === "success"
                        ? "bg-green-50 border-green-200"
                        : "bg-amber-50 border-amber-200"
                  }
                >
                  <AlertCircle
                    className={`h-4 w-4 ${dataSource === "internal" ? "text-amber-600" : apiStatus === "success" ? "text-green-600" : "text-amber-600"}`}
                  />
                  <AlertDescription
                    className={
                      dataSource === "internal"
                        ? "text-amber-700"
                        : apiStatus === "success"
                          ? "text-green-700"
                          : "text-amber-700"
                    }
                  >
                    {dataSource === "internal"
                      ? "Estás utilizando la base de datos interna. Los gráficos de criptomonedas serán simulados y no mostrarán datos en tiempo real."
                      : apiStatus === "success"
                        ? `La API de ${dataSource === "coinmarketcap" ? "CoinMarketCap" : "CoinGecko"} está configurada correctamente. Los gráficos mostrarán datos en tiempo real.`
                        : `Para mostrar gráficos de criptomonedas en tiempo real, necesitas configurar una API key válida de ${dataSource === "coinmarketcap" ? "CoinMarketCap" : "CoinGecko"}.`}
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={handleSaveSettings} disabled={savingToDb}>
                {savingToDb ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando en base de datos...
                  </>
                ) : (
                  "Guardar configuración en base de datos"
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Helper function to format volume
function formatVolume(volume: number): string {
  if (volume >= 1e12) return `$${(volume / 1e12).toFixed(1)}T`
  if (volume >= 1e9) return `$${(volume / 1e9).toFixed(1)}B`
  if (volume >= 1e6) return `$${(volume / 1e6).toFixed(1)}M`
  if (volume >= 1e3) return `$${(volume / 1e3).toFixed(1)}K`
  return `$${volume.toFixed(2)}`
}
