"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

export default function PortfolioChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    // Sample portfolio data (value over time)
    const portfolioData = [
      { date: "2023-09-01", value: 10000 },
      { date: "2023-10-01", value: 10200 },
      { date: "2023-11-01", value: 9800 },
      { date: "2023-12-01", value: 10500 },
      { date: "2024-01-01", value: 11200 },
      { date: "2024-02-01", value: 11800 },
      { date: "2024-03-01", value: 12750 },
    ]

    // Find min and max values
    const values = portfolioData.map((d) => d.value)
    const minValue = Math.min(...values) * 0.95
    const maxValue = Math.max(...values) * 1.05

    // Calculate dimensions
    const width = rect.width
    const height = rect.height
    const padding = { top: 20, right: 20, bottom: 30, left: 50 }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Draw axes
    ctx.beginPath()
    ctx.strokeStyle = "#e2e8f0"
    ctx.moveTo(padding.left, padding.top)
    ctx.lineTo(padding.left, height - padding.bottom)
    ctx.lineTo(width - padding.right, height - padding.bottom)
    ctx.stroke()

    // Draw price labels
    ctx.font = "12px sans-serif"
    ctx.fillStyle = "#64748b"
    ctx.textAlign = "right"
    ctx.textBaseline = "middle"

    const valueStep = (maxValue - minValue) / 5
    for (let i = 0; i <= 5; i++) {
      const value = minValue + valueStep * i
      const y = padding.top + chartHeight - (chartHeight * (value - minValue)) / (maxValue - minValue)
      ctx.fillText(`$${value.toFixed(0)}`, padding.left - 10, y)

      // Draw horizontal grid line
      ctx.beginPath()
      ctx.strokeStyle = "#e2e8f0"
      ctx.setLineDash([5, 5])
      ctx.moveTo(padding.left, y)
      ctx.lineTo(width - padding.right, y)
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Draw date labels
    ctx.textAlign = "center"
    ctx.textBaseline = "top"

    const dateStep = Math.max(1, Math.floor(portfolioData.length / 4))
    for (let i = 0; i < portfolioData.length; i += dateStep) {
      const x = padding.left + (chartWidth * i) / (portfolioData.length - 1)
      const date = new Date(portfolioData[i].date)
      const dateLabel = date.toLocaleDateString("es-ES", { month: "short" })
      ctx.fillText(dateLabel, x, height - padding.bottom + 10)
    }

    // Draw portfolio value line
    ctx.beginPath()
    ctx.strokeStyle = "#3b82f6"
    ctx.lineWidth = 3

    for (let i = 0; i < portfolioData.length; i++) {
      const x = padding.left + (chartWidth * i) / (portfolioData.length - 1)
      const y = padding.top + chartHeight - (chartHeight * (portfolioData[i].value - minValue)) / (maxValue - minValue)

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }

    ctx.stroke()

    // Draw area under the line
    ctx.lineTo(padding.left + chartWidth, height - padding.bottom)
    ctx.lineTo(padding.left, height - padding.bottom)
    ctx.closePath()
    ctx.fillStyle = "rgba(59, 130, 246, 0.1)"
    ctx.fill()

    // Draw dots at data points
    for (let i = 0; i < portfolioData.length; i++) {
      const x = padding.left + (chartWidth * i) / (portfolioData.length - 1)
      const y = padding.top + chartHeight - (chartHeight * (portfolioData[i].value - minValue)) / (maxValue - minValue)

      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fillStyle = "#3b82f6"
      ctx.fill()
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }, [])

  return <canvas ref={canvasRef} className={cn("w-full h-full")} />
}
