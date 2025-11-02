"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, Wallet, TrendingDown, RefreshCw, AlertCircle, ExternalLink, Mail } from "lucide-react"
import MarketOverview from "@/components/market-overview"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"
import {
  fetchCryptocurrencyData,
  type FormattedCryptoData,
  getCoinMarketCapSettings,
} from "@/lib/coinmarketcap-service"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  getBroadcastMessages,
  markMessageAsRead,
  markAllMessagesAsRead,
  type BroadcastMessage,
} from "@/app/actions/messages"

export default function MarketsPage() {
  return (
    <ProtectedRoute>
      <MarketsPageContent />
    </ProtectedRoute>
  )
}

function MarketsPageContent() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cryptoData, setCryptoData] = useState<FormattedCryptoData[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [usingMockData, setUsingMockData] = useState(false)
  const [messages, setMessages] = useState<BroadcastMessage[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [messagesOpen, setMessagesOpen] = useState(false)

  const router = useRouter()

  // Load user data from localStorage
  useEffect(() => {
    try {
      const userData = localStorage.getItem("user")
      if (userData) {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
        loadUserMessages()
      }
    } catch (err) {
      console.error("Error al cargar datos del usuario:", err)
    }
  }, [])

  const loadUserMessages = async () => {
    try {
      const result = await getBroadcastMessages()
      if (result.success && result.data) {
        setMessages(result.data)
        const unread = result.data.filter((msg) => !msg.read).length
        setUnreadCount(unread)
      }
    } catch (err) {
      console.error("Error al cargar mensajes:", err)
    }
  }

  const markAsRead = async (messageId: string) => {
    try {
      const result = await markMessageAsRead(messageId)
      if (result.success) {
        // Update local state
        const updatedMessages = messages.map((msg) => (msg.id === messageId ? { ...msg, read: true } : msg))
        setMessages(updatedMessages)
        const unread = updatedMessages.filter((msg) => !msg.read).length
        setUnreadCount(unread)
      }
    } catch (err) {
      console.error("Error al marcar mensaje como leído:", err)
    }
  }

  const markAllAsRead = async () => {
    try {
      const result = await markAllMessagesAsRead()
      if (result.success) {
        // Update local state
        const updatedMessages = messages.map((msg) => ({ ...msg, read: true }))
        setMessages(updatedMessages)
        setUnreadCount(0)
      }
    } catch (err) {
      console.error("Error al marcar todos los mensajes como leídos:", err)
    }
  }

  // Fetch cryptocurrency data
  const fetchData = async () => {
    setRefreshing(true)
    setError(null)

    try {
      // Check if we have an API key
      const settings = getCoinMarketCapSettings()
      if (!settings.apiKey) {
        setUsingMockData(true)
        setError(
          "No se encontró la API key de CoinMarketCap. Los datos mostrados son de ejemplo. Por favor, configura la API key en la sección de configuración.",
        )
      } else {
        setUsingMockData(false)
      }

      const data = await fetchCryptocurrencyData(13)
      setCryptoData(data)
      setLastUpdated(new Date())
    } catch (err) {
      console.error("Error fetching cryptocurrency data:", err)
      setError(err instanceof Error ? err.message : "Error al cargar datos de criptomonedas")
      setUsingMockData(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Initial data fetch
  useEffect(() => {
    fetchData()

    // Set up auto-refresh if enabled
    const settings = getCoinMarketCapSettings()
    if (settings.autoUpdate && settings.updateInterval > 0) {
      const intervalId = setInterval(fetchData, settings.updateInterval * 60 * 1000)
      return () => clearInterval(intervalId)
    }
  }, [])

  // Filter cryptocurrencies based on search term
  const filteredCryptos = cryptoData.filter(
    (crypto) =>
      crypto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      crypto.symbol.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="container mx-auto px-4 py-6 pb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mercado de Criptomonedas</h1>
        <div className="flex items-center gap-3">
          <Sheet open={messagesOpen} onOpenChange={setMessagesOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="relative bg-transparent">
                <Mail className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Mensajes del Administrador</SheetTitle>
                <SheetDescription>
                  {messages.length === 0
                    ? "No tienes mensajes"
                    : `${messages.length} mensaje${messages.length !== 1 ? "s" : ""}`}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                {messages.length > 0 && unreadCount > 0 && (
                  <Button variant="outline" size="sm" onClick={markAllAsRead} className="mb-4 w-full bg-transparent">
                    Marcar todos como leídos
                  </Button>
                )}
                <ScrollArea className="h-[calc(100vh-200px)]">
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Mail className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No hay mensajes</p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <Card
                          key={message.id}
                          className={cn(
                            "cursor-pointer transition-all hover:shadow-md",
                            !message.read && "border-primary bg-primary/5",
                          )}
                          onClick={() => markAsRead(message.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-semibold text-sm">{message.subject}</h3>
                              {!message.read && (
                                <Badge variant="default" className="ml-2">
                                  Nuevo
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-2">{message.content}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(message.timestamp).toLocaleString("es-ES", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </SheetContent>
          </Sheet>

          {user && (
            <Card className="bg-primary text-primary-foreground">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  <div>
                    <p className="text-xs">Saldo disponible</p>
                    <p className="text-lg font-bold">
                      $
                      {typeof user.balance === "number"
                        ? user.balance.toFixed(2)
                        : Number.parseFloat(user.balance || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Market Overview */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">Recomendación de Inversión</h2>
        <MarketOverview />
      </div>

      {/* Search and Refresh */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="w-full sm:w-auto">
          <Input
            placeholder="Buscar criptomoneda..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64"
          />
        </div>
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <p className="text-sm text-muted-foreground">
              Última actualización: {lastUpdated.toLocaleTimeString()}
              {usingMockData && " (datos de ejemplo)"}
            </p>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={refreshing}
            className="flex items-center gap-2 bg-transparent"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <Alert variant={error.includes("No se encontró la API key") ? "warning" : "destructive"} className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{error.includes("No se encontró la API key") ? "Usando datos de ejemplo" : "Error"}</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <p>{error}</p>
            {error.includes("No se encontró la API key") && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 bg-transparent"
                  onClick={() => router.push("/crypt")}
                >
                  <ExternalLink className="h-4 w-4" />
                  Ir a configuración
                </Button>
                <span className="text-xs text-muted-foreground">
                  Necesitas una API key de CoinMarketCap para ver datos en tiempo real
                </span>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Cryptocurrency List */}
      <div className="space-y-4 mb-8">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Criptomonedas</h2>
          <Badge variant="outline">{filteredCryptos.length} resultados</Badge>
        </div>

        {/* Table Header */}
        <div className="hidden md:grid grid-cols-7 gap-4 px-4 py-2 bg-muted/50 rounded-lg text-sm font-medium">
          <div className="col-span-2">Nombre</div>
          <div className="text-right">Precio</div>
          <div className="text-right">24h %</div>
          <div className="text-right">7d %</div>
          <div className="text-right">Volumen (24h)</div>
          <div className="text-right">Últimas 24h</div>
        </div>

        {/* Loading skeletons */}
        {loading &&
          !cryptoData.length &&
          Array(10)
            .fill(0)
            .map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div>
                        <Skeleton className="h-5 w-24 mb-1" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    </div>
                    <div className="hidden md:block">
                      <Skeleton className="h-6 w-20" />
                    </div>
                    <div className="hidden md:block">
                      <Skeleton className="h-6 w-16" />
                    </div>
                    <div className="hidden md:block">
                      <Skeleton className="h-6 w-16" />
                    </div>
                    <div className="hidden md:block">
                      <Skeleton className="h-6 w-24" />
                    </div>
                    <div>
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

        {/* Cryptocurrency cards */}
        {!loading && filteredCryptos.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No se encontraron criptomonedas que coincidan con tu búsqueda.</p>
          </div>
        )}

        <div className="grid gap-3">
          {filteredCryptos.map((crypto) => (
            <Link key={crypto.id} href={`/assets/${crypto.id}`}>
              <Card className="transition-all hover:shadow-md">
                <CardContent className="p-4">
                  {/* Mobile view */}
                  <div className="md:hidden">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{crypto.symbol}</h3>
                          <Badge variant="outline" className="rounded-sm">
                            {crypto.rank}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{crypto.name}</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">${crypto.price.toFixed(2)}</p>
                        <div
                          className={cn(
                            "flex items-center justify-end gap-1 text-sm",
                            crypto.change24h >= 0 ? "text-green-600" : "text-red-600",
                          )}
                        >
                          {crypto.change24h >= 0 ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          <span>
                            {crypto.change24h >= 0 ? "+" : ""}
                            {crypto.change24h.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">7d %</p>
                        <p
                          className={cn(
                            "text-sm font-medium",
                            crypto.change7d >= 0 ? "text-green-600" : "text-red-600",
                          )}
                        >
                          {crypto.change7d >= 0 ? "+" : ""}
                          {crypto.change7d.toFixed(2)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Volumen (24h)</p>
                        <p className="text-sm font-medium">{formatVolume(crypto.volume24h)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Desktop view */}
                  <div className="hidden md:grid grid-cols-7 gap-4 items-center">
                    <div className="col-span-2 flex items-center gap-3">
                      <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center p-0">
                        {crypto.rank}
                      </Badge>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{crypto.name}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">{crypto.symbol}</p>
                      </div>
                    </div>
                    <div className="text-right font-medium">${crypto.price.toFixed(2)}</div>
                    <div
                      className={cn(
                        "text-right font-medium",
                        crypto.change24h >= 0 ? "text-green-600" : "text-red-600",
                      )}
                    >
                      {crypto.change24h >= 0 ? "+" : ""}
                      {crypto.change24h.toFixed(2)}%
                    </div>
                    <div
                      className={cn("text-right font-medium", crypto.change7d >= 0 ? "text-green-600" : "text-red-600")}
                    >
                      {crypto.change7d >= 0 ? "+" : ""}
                      {crypto.change7d.toFixed(2)}%
                    </div>
                    <div className="text-right font-medium">{formatVolume(crypto.volume24h)}</div>
                    <div className="flex justify-end">
                      <MiniChart positive={crypto.change24h >= 0} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
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

// Simple mini chart component
function MiniChart({ positive }: { positive: boolean }) {
  return (
    <div className="w-20 h-10">
      <svg viewBox="0 0 100 40" width="100%" height="100%">
        <path
          d={
            positive
              ? "M0,40 L10,35 L20,38 L30,30 L40,32 L50,25 L60,20 L70,15 L80,10 L90,5 L100,0"
              : "M0,0 L10,5 L20,2 L30,10 L40,8 L50,15 L60,20 L70,25 L80,30 L90,35 L100,40"
          }
          fill="none"
          stroke={positive ? "rgb(22, 163, 74)" : "rgb(220, 38, 38)"}
          strokeWidth="2"
        />
      </svg>
    </div>
  )
}
