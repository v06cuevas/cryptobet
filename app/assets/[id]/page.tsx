"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, Star, TrendingUp, TrendingDown, BarChart2, Globe, Shield, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import AssetChart from "@/components/asset-chart"
import { getCoinMarketCapById } from "@/lib/coinmarketcap-service"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchCryptocurrencyData, getCoinMarketCapSettings } from "@/lib/coinmarketcap-service"

export default function CryptoPage({ params }: { params: { id: string } }) {
  const [crypto, setCrypto] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState("1D")
  const [isFavorite, setIsFavorite] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadCryptoData = async () => {
      setLoading(true)
      setError(null)

      try {
        // Primero verificar si tenemos configurada una API key
        const settings = getCoinMarketCapSettings()

        if (settings.apiKey) {
          // Si tenemos API key, intentar obtener datos reales
          try {
            // Intentar obtener datos actualizados de la API
            const cryptoList = await fetchCryptocurrencyData()
            const foundCrypto = cryptoList.find((c) => c.id === params.id)

            if (foundCrypto) {
              // Si encontramos los datos en la API, usarlos
              setCrypto(foundCrypto)

              // Check if this crypto is in favorites
              const favorites = JSON.parse(localStorage.getItem("cryptoFavorites") || "[]")
              setIsFavorite(favorites.includes(params.id))

              setLoading(false)
              return
            }
          } catch (apiError) {
            console.error("Error fetching real-time data:", apiError)
            // Continuamos con los datos mock si falla la API
          }
        }

        // Si no hay API key o si falló la llamada a la API, usamos los datos del mock
        const foundCrypto = getCoinMarketCapById(params.id)
        setCrypto(foundCrypto)

        // Check if this crypto is in favorites
        const favorites = JSON.parse(localStorage.getItem("cryptoFavorites") || "[]")
        setIsFavorite(favorites.includes(params.id))
      } catch (err) {
        console.error("Error loading crypto data:", err)
        setError("No se pudieron cargar los datos de la criptomoneda")

        // Create a fallback crypto object for better user experience
        setCrypto({
          id: params.id,
          name: "Criptomoneda",
          symbol: "CRYPTO",
          price: 0,
          change24h: 0,
          change7d: 0,
          volume24h: 0,
          marketCap: "$0",
          lastUpdated: new Date().toISOString(),
          rank: 0,
          maxSupply: "N/A",
          circulatingSupply: "N/A",
          totalSupply: "N/A",
          type: "Cripto",
          historicalData: [
            {
              name: "Precio",
              data: Array.from({ length: 30 }, (_, i) => ({
                date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
                value: 0,
              })),
            },
          ],
        })
      } finally {
        setLoading(false)
      }
    }

    loadCryptoData()

    const intervalId = setInterval(() => {
      loadCryptoData()
    }, 30000)

    return () => clearInterval(intervalId)
  }, [params.id])

  const toggleFavorite = () => {
    if (!crypto) return

    try {
      const favorites = JSON.parse(localStorage.getItem("cryptoFavorites") || "[]")
      if (isFavorite) {
        const newFavorites = favorites.filter((id: string) => id !== crypto.id)
        localStorage.setItem("cryptoFavorites", JSON.stringify(newFavorites))
      } else {
        favorites.push(crypto.id)
        localStorage.setItem("cryptoFavorites", JSON.stringify(favorites))
      }
      setIsFavorite(!isFavorite)
    } catch (err) {
      console.error("Error updating favorites:", err)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.getDate()} ${date.toLocaleString("es-ES", { month: "short" })}, ${date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    })} UTC`
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <Link href="/markets">
            <Button variant="ghost" className="flex items-center gap-2">
              <ChevronLeft className="h-4 w-4" />
              <span>Volver</span>
            </Button>
          </Link>
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        <div className="mb-6">
          <Skeleton className="h-12 w-48 mb-2" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Card className="mb-6 bg-background border-none">
          <CardContent className="p-0">
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !crypto) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <Link href="/markets">
            <Button variant="ghost" className="flex items-center gap-2">
              <ChevronLeft className="h-4 w-4" />
              <span>Volver</span>
            </Button>
          </Link>
        </div>
        <Card className="p-6 text-center">
          <Info className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">Error al cargar los datos</h2>
          <p className="text-muted-foreground mb-4">{error || "No se pudo encontrar la criptomoneda solicitada"}</p>
          <Button asChild>
            <Link href="/markets">Volver a Mercados</Link>
          </Button>
        </Card>
      </div>
    )
  }

  const isPositive = crypto.change24h >= 0

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Back button and favorite */}
      <div className="flex justify-between items-center mb-4">
        <Link href="/markets">
          <Button variant="ghost" className="flex items-center gap-2 text-muted-foreground">
            <ChevronLeft className="h-4 w-4" />
            <span>Resumen de mercado</span>
          </Button>
        </Link>
        <Button
          variant="outline"
          size="icon"
          className={cn(isFavorite ? "text-yellow-500" : "text-muted-foreground")}
          onClick={toggleFavorite}
        >
          <Star className={cn("h-5 w-5", isFavorite && "fill-yellow-500")} />
          <span className="sr-only">Favorito</span>
        </Button>
      </div>

      {/* Crypto header */}
      <div className="mb-2">
        <h1 className="text-2xl font-medium text-muted-foreground">{crypto.name}</h1>
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-bold">
            {crypto.price.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-lg text-muted-foreground">USD</span>
        </div>
        <div className={cn("flex items-center gap-1 text-lg", isPositive ? "text-green-600" : "text-red-600")}>
          {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          <span>
            {isPositive ? "+" : ""}
            {crypto.change24h.toFixed(2)}%
          </span>
          <span className="text-muted-foreground ml-1">hoy</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
          <span>{formatDate(crypto.lastUpdated)}</span>
          <button className="underline hover:no-underline">Renuncia de responsabilidad</button>
        </div>
      </div>

      {/* Chart */}
      <Card className="mb-6 bg-[#121212] border-none overflow-hidden">
        <CardContent className="p-0">
          <Tabs value={timeframe} onValueChange={setTimeframe}>
            <div className="border-b border-gray-800">
              <TabsList className="bg-transparent h-10">
                <TabsTrigger
                  value="1D"
                  className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-gray-400 data-[state=active]:text-white"
                >
                  1D
                </TabsTrigger>
                <TabsTrigger
                  value="5D"
                  className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-gray-400 data-[state=active]:text-white"
                >
                  5D
                </TabsTrigger>
                <TabsTrigger
                  value="1M"
                  className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-gray-400 data-[state=active]:text-white"
                >
                  1M
                </TabsTrigger>
                <TabsTrigger
                  value="6M"
                  className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-gray-400 data-[state=active]:text-white"
                >
                  6M
                </TabsTrigger>
                <TabsTrigger
                  value="1A"
                  className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-gray-400 data-[state=active]:text-white"
                >
                  1A
                </TabsTrigger>
                <TabsTrigger
                  value="5A"
                  className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-gray-400 data-[state=active]:text-white"
                >
                  5A
                </TabsTrigger>
                <TabsTrigger
                  value="MAX"
                  className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-gray-400 data-[state=active]:text-white"
                >
                  Máx
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value={timeframe} className="mt-0">
              <div className="h-64 md:h-80 p-4 text-white">
                <AssetChart
                  data={crypto.historicalData || []}
                  timeframe={timeframe}
                  darkMode={true}
                  lineColor={isPositive ? "#22c55e" : "#ef4444"}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Trading actions */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Link href={`/trade?asset=${crypto.id}&action=buy`} className="w-full">
          <Button className="py-6 text-lg bg-green-600 hover:bg-green-700 w-full">A favor</Button>
        </Link>
        <Link href={`/trade?asset=${crypto.id}&action=sell`} className="w-full">
          <Button className="py-6 text-lg bg-red-600 hover:bg-red-700 w-full">En contra</Button>
        </Link>
      </div>

      {/* Crypto details */}
      <Tabs defaultValue="overview" className="mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="stats">Estadísticas</TabsTrigger>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="news">Noticias</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-medium mb-4">Acerca de {crypto.name}</h2>
              <p className="text-sm text-muted-foreground">
                {crypto.description ||
                  `${crypto.name} es una criptomoneda digital que opera en una red descentralizada. Como todas las criptomonedas, ${crypto.name} utiliza tecnología blockchain para asegurar y verificar transacciones.`}
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div>
                  <p className="text-sm text-muted-foreground">Rango</p>
                  <p className="font-medium">#{crypto.rank || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Capitalización</p>
                  <p className="font-medium">{crypto.marketCap}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Volumen 24h</p>
                  <p className="font-medium">${formatVolume(crypto.volume24h)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sitio Web</p>
                  <a
                    href={crypto.website || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    Visitar
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-medium mb-4">Estadísticas Clave</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Capitalización</p>
                  <p className="font-medium">{crypto.marketCap}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Volumen (24h)</p>
                  <p className="font-medium">${formatVolume(crypto.volume24h)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cambio 24h</p>
                  <p className={cn("font-medium", isPositive ? "text-green-600" : "text-red-600")}>
                    {isPositive ? "+" : ""}
                    {crypto.change24h.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cambio 7d</p>
                  <p className={cn("font-medium", crypto.change7d >= 0 ? "text-green-600" : "text-red-600")}>
                    {crypto.change7d >= 0 ? "+" : ""}
                    {crypto.change7d.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Suministro Circulante</p>
                  <p className="font-medium">{crypto.circulatingSupply || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Suministro Total</p>
                  <p className="font-medium">{crypto.totalSupply || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Suministro Máximo</p>
                  <p className="font-medium">{crypto.maxSupply || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Máximo Histórico</p>
                  <p className="font-medium">${crypto.allTimeHigh?.price?.toFixed(2) || "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-medium mb-4">Información Técnica</h2>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-3">
                    <Globe className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <h3 className="font-medium">Recursos Oficiales</h3>
                      <div className="mt-2 space-y-2">
                        <p className="text-sm">
                          <a
                            href={crypto.website || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            Sitio Web Oficial
                          </a>
                        </p>
                        <p className="text-sm">
                          <a
                            href={crypto.whitepaper || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            Whitepaper
                          </a>
                        </p>
                        <p className="text-sm">
                          <a
                            href={crypto.explorer || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            Explorador de Blockchain
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <h3 className="font-medium">Seguridad</h3>
                      <div className="mt-2 space-y-2">
                        <p className="text-sm">
                          Algoritmo: <span className="font-medium">{crypto.algorithm || "N/A"}</span>
                        </p>
                        <p className="text-sm">
                          Tipo de Consenso: <span className="font-medium">{crypto.proofType || "N/A"}</span>
                        </p>
                        <p className="text-sm">
                          Lanzamiento: <span className="font-medium">{crypto.launchDate || "N/A"}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="news" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-center mb-4">
                <BarChart2 className="h-24 w-24 text-muted-foreground" />
              </div>
              <p className="text-center text-muted-foreground">
                Las noticias relacionadas con {crypto.name} estarán disponibles próximamente.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Helper function to format volume
function formatVolume(volume: number): string {
  if (volume >= 1e12) return `${(volume / 1e12).toFixed(1)}T`
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`
  return volume.toFixed(2)
}
