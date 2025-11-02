import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

interface ChartDataPoint {
  date: string
  value: number
}

interface UseCoingeckoChartProps {
  coinId: string
  timeframe: string
  enabled?: boolean
}

const timeframeToDays: Record<string, number> = {
  '1D': 1,
  '5D': 5,
  '1M': 30,
  '6M': 180,
  '1A': 365,
  '5A': 365, // Limitado a 365 días por API gratuita
  'MAX': 365 // Limitado a 365 días por API gratuita
}

export function useCoingeckoChart({ coinId, timeframe, enabled = true }: UseCoingeckoChartProps) {
  const [data, setData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !coinId) return

    const fetchChartData = async () => {
      setLoading(true)
      setError(null)

      try {
        const days = timeframeToDays[timeframe] || 30

        const { data: chartData, error: chartError } = await supabase.functions.invoke('coingecko-chart', {
          body: { coinId, days }
        })

        if (chartError) {
          throw chartError
        }

        if (chartData && Array.isArray(chartData)) {
          setData(chartData)
        } else {
          throw new Error('Invalid chart data format')
        }
      } catch (err) {
        console.error('Error fetching chart data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch chart data')
      } finally {
        setLoading(false)
      }
    }

    fetchChartData()

    // Actualizar cada 5 minutos para reflejar cambios en tiempo real
    const intervalId = setInterval(fetchChartData, 300000)

    return () => clearInterval(intervalId)
  }, [coinId, timeframe, enabled])

  return { data, loading, error }
}
