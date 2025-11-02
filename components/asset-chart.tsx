"use client"

// Asegurarse de que el componente AssetChart actualice la visualización cuando cambian los datos
import { useEffect, useRef } from "react"
import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

interface DataPoint {
  date: string
  value: number
}

interface DataSeries {
  label: string
  data: DataPoint[]
}

interface AssetChartProps {
  data: DataSeries[]
  timeframe: string
  darkMode?: boolean
  lineColor?: string
}

const AssetChart = ({ data, timeframe, darkMode = false, lineColor = "#3b82f6" }: AssetChartProps) => {
  const chartRef = useRef<ChartJS>(null)

  // Filtrar datos según el timeframe seleccionado
  const getFilteredData = () => {
    if (!data || !data[0] || !data[0].data) return []

    const series = data[0]
    const allData = [...series.data]
    const totalPoints = allData.length

    // Calculate how many data points to include based on timeframe
    let pointsToInclude = totalPoints // Default to all points (MAX)

    switch (timeframe) {
      case "1D":
        // Last 24 hours - use 24 points or less if we don't have enough
        pointsToInclude = Math.min(24, totalPoints)
        break
      case "5D":
        // Last 5 days - use 5 days worth of points
        pointsToInclude = Math.min(5 * 24, totalPoints)
        break
      case "1M":
        // Last month (30 days)
        pointsToInclude = Math.min(30 * 24, totalPoints)
        break
      case "6M":
        // Last 6 months (180 days)
        pointsToInclude = Math.min(180, totalPoints)
        break
      case "1A":
        // Last year (365 days)
        pointsToInclude = Math.min(365, totalPoints)
        break
      case "5A":
        // Last 5 years (1825 days)
        pointsToInclude = Math.min(1825, totalPoints)
        break
      // MAX uses all data points
    }

    // Get the last N points based on the calculated amount
    return allData.slice(-pointsToInclude)
  }

  const filteredData = getFilteredData()

  // Formatear etiquetas según el timeframe
  const formatLabels = () => {
    return filteredData.map((point) => {
      const date = new Date(point.date)
      switch (timeframe) {
        case "1D":
          return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        case "5D":
          return `${date.getDate()}/${date.getMonth() + 1} ${date.getHours()}:00`
        case "1M":
          return `${date.getDate()}/${date.getMonth() + 1}`
        default:
          return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
      }
    })
  }

  const chartData = {
    labels: formatLabels(),
    datasets: [
      {
        label: data[0]?.label || "Precio",
        data: filteredData.map((point) => point.value),
        borderColor: lineColor,
        backgroundColor: darkMode
          ? `rgba(${lineColor === "#22c55e" ? "34, 197, 94" : lineColor === "#ef4444" ? "239, 68, 68" : "59, 130, 246"}, 0.1)`
          : `rgba(${lineColor === "#22c55e" ? "34, 197, 94" : lineColor === "#ef4444" ? "239, 68, 68" : "59, 130, 246"}, 0.1)`,
        borderWidth: 2,
        tension: 0.4,
        fill: "start",
        pointRadius: 0,
        pointHoverRadius: 4,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: "index" as const,
        intersect: false,
        backgroundColor: darkMode ? "#1e293b" : "#ffffff",
        titleColor: darkMode ? "#ffffff" : "#1e293b",
        bodyColor: darkMode ? "#cbd5e1" : "#475569",
        borderColor: darkMode ? "#334155" : "#e2e8f0",
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        callbacks: {
          label: (context: any) => `$${context.parsed.y.toFixed(2)}`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          maxRotation: 0,
          color: darkMode ? "#94a3b8" : "#64748b",
          font: {
            size: 10,
          },
          maxTicksLimit: 6,
        },
      },
      y: {
        grid: {
          color: darkMode ? "rgba(148, 163, 184, 0.1)" : "rgba(203, 213, 225, 0.5)",
          drawBorder: false,
        },
        ticks: {
          color: darkMode ? "#94a3b8" : "#64748b",
          font: {
            size: 10,
          },
          callback: (value: any) => `$${value}`,
        },
      },
    },
    interaction: {
      mode: "nearest" as const,
      axis: "x" as const,
      intersect: false,
    },
    elements: {
      line: {
        tension: 0.4,
      },
    },
  }

  // Actualizar el gráfico cuando cambien los datos o el timeframe
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.update()
    }
  }, [data, timeframe, lineColor])

  return <Line ref={chartRef} data={chartData} options={chartOptions} />
}

export default AssetChart
