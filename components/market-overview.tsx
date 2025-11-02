"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { fetchCryptocurrencyData, type FormattedCryptoData } from "@/lib/coinmarketcap-service"
import { Skeleton } from "@/components/ui/skeleton"

export default function MarketOverview() {
  const [cryptos, setCryptos] = useState<FormattedCryptoData[]>([])
  const [recommendedCrypto, setRecommendedCrypto] = useState<FormattedCryptoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)

      try {
        // Try to get recommended crypto from localStorage
        const storedRecommended = localStorage.getItem("recommendedCrypto")
        let recommendedFromStorage = null

        if (storedRecommended) {
          try {
            recommendedFromStorage = JSON.parse(storedRecommended)
          } catch (err) {
            console.error("Error parsing recommended crypto:", err)
          }
        }

        // Fetch crypto data from API
        const data = await fetchCryptocurrencyData(20)
        setCryptos(data)

        // Set recommended crypto
        if (recommendedFromStorage) {
          // Find the updated version of the recommended crypto
          const updatedRecommended = data.find((c) => c.id === recommendedFromStorage.id)
          if (updatedRecommended) {
            setRecommendedCrypto(updatedRecommended)
          } else {
            setRecommendedCrypto(recommendedFromStorage)
          }
        } else if (data.length > 0) {
          // Default to Bitcoin if available, otherwise first crypto
          const btc = data.find((c) => c.symbol === "BTC") || data[0]
          setRecommendedCrypto(btc)
        }
      } catch (err) {
        console.error("Error loading market data:", err)
        setError("Error al cargar los datos del mercado")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[300px] w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-4">
            <h3 className="text-lg font-medium mb-2">Error</h3>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Recommended Crypto */}
      {recommendedCrypto && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-100 dark:border-blue-900">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  <h3 className="text-lg font-medium">Criptomoneda Recomendada</h3>
                </div>
                <p className="text-sm text-muted-foreground">Nuestra recomendación para invertir hoy</p>
              </div>
              <Badge variant="outline" className="bg-blue-100/50 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                Top #{recommendedCrypto.rank || "N/A"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Link href={`/assets/${recommendedCrypto.id}`} className="block">
                  <h2 className="text-2xl font-bold hover:text-primary transition-colors">
                    {recommendedCrypto.name} ({recommendedCrypto.symbol})
                  </h2>
                </Link>
                <div className="mt-2">
                  <p className="text-3xl font-bold">${recommendedCrypto.price.toFixed(2)}</p>
                  <div
                    className={cn(
                      "flex items-center gap-1",
                      recommendedCrypto.change24h >= 0 ? "text-green-600" : "text-red-600",
                    )}
                  >
                    {recommendedCrypto.change24h >= 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    <span>
                      {recommendedCrypto.change24h >= 0 ? "+" : ""}
                      {recommendedCrypto.change24h.toFixed(2)}%
                    </span>
                    <span className="text-muted-foreground text-sm">(24h)</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Cap. Mercado</p>
                    <p className="font-medium">{recommendedCrypto.marketCap}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Volumen 24h</p>
                    <p className="font-medium">${formatVolume(recommendedCrypto.volume24h)}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <Link href={`/assets/${recommendedCrypto.id}`}>
                    <Button className="w-full">Ver detalles</Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Removed the "Mercado de Criptomonedas" card section */}
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
