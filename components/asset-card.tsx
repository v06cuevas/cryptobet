import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface AssetCardProps {
  asset: {
    id: string
    symbol: string
    name: string
    price: number
    change: number
    changePercent: number
    marketCap?: string
    volume?: string
    type: string
  }
  watchlist?: boolean
}

export default function AssetCard({ asset, watchlist }: AssetCardProps) {
  const isPositive = asset.change >= 0

  return (
    <Link href={`/assets/${asset.id}`}>
      <Card className={cn("transition-all hover:shadow-md", watchlist && "border-primary/20")}>
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{asset.symbol}</h3>
                <Badge variant="outline" className="rounded-sm">
                  {asset.type}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{asset.name}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Star className="h-4 w-4" />
              <span className="sr-only">Favorito</span>
            </Button>
          </div>

          <div className="flex justify-between items-end mt-4">
            <div>
              <p className="text-2xl font-bold">${asset.price.toFixed(2)}</p>
              <div className={cn("flex items-center gap-1 text-sm", isPositive ? "text-green-600" : "text-red-600")}>
                {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span>
                  {isPositive ? "+" : ""}
                  {asset.change.toFixed(2)}
                </span>
                <span>
                  ({isPositive ? "+" : ""}
                  {asset.changePercent.toFixed(2)}%)
                </span>
              </div>
            </div>

            <Button variant="outline" className="h-9">
              Invertir
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
