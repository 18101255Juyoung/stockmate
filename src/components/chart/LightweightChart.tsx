'use client'

import { useEffect, useRef, useState } from 'react'
import {
  createChart,
  IChartApi,
  CandlestickData,
  HistogramData,
  LineData,
  UTCTimestamp,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  MouseEventParams,
} from 'lightweight-charts'

interface ChartDataPoint {
  time: string
  open: number
  high: number
  low: number
  close: number
}

interface VolumeDataPoint {
  time: string
  value: number
  color: string
}

interface MADataPoint {
  time: string
  value: number | null
}

interface LightweightChartProps {
  data: ChartDataPoint[]
  volumeData: VolumeDataPoint[]
  ma5?: MADataPoint[]
  ma10?: MADataPoint[]
  ma20?: MADataPoint[]
  height?: number
}

interface TooltipData {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  isUp: boolean
}

export default function LightweightChart({
  data,
  volumeData,
  ma5,
  ma10,
  ma20,
  height = 500,
}: LightweightChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return

    const container = chartContainerRef.current

    // Create chart
    const chart = createChart(container, {
      width: container.clientWidth,
      height: height,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333333',
      },
      grid: {
        vertLines: { color: '#e5e7eb' },
        horzLines: { color: '#e5e7eb' },
      },
      timeScale: {
        borderColor: '#e5e7eb',
        timeVisible: false,
      },
      rightPriceScale: {
        borderColor: '#e5e7eb',
      },
      crosshair: {
        mode: 1, // Magnet mode
        vertLine: {
          color: '#9ca3af',
          width: 1,
          style: 3, // Dashed
        },
        horzLine: {
          color: '#9ca3af',
          width: 1,
          style: 3, // Dashed
        },
      },
    })

    chartRef.current = chart

    // Convert data to UTC timestamps
    const candleData: CandlestickData[] = data.map((d) => ({
      time: (new Date(d.time).getTime() / 1000) as UTCTimestamp,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }))

    // Add candlestick series (Korean style: red up, blue down)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#ef4444', // Red for up
      downColor: '#3b82f6', // Blue for down
      borderVisible: true,
      wickUpColor: '#ef4444',
      wickDownColor: '#3b82f6',
      borderUpColor: '#ef4444',
      borderDownColor: '#3b82f6',
    })
    candleSeries.setData(candleData)

    // Add moving averages
    if (ma5 && ma5.length > 0) {
      const ma5Data: LineData[] = ma5
        .filter((d) => d.value !== null)
        .map((d) => ({
          time: (new Date(d.time).getTime() / 1000) as UTCTimestamp,
          value: d.value as number,
        }))

      const ma5Series = chart.addSeries(LineSeries, {
        color: '#ef4444',
        lineWidth: 2,
        title: 'MA5',
        priceLineVisible: false,
        lastValueVisible: false,
      })
      ma5Series.setData(ma5Data)
    }

    if (ma10 && ma10.length > 0) {
      const ma10Data: LineData[] = ma10
        .filter((d) => d.value !== null)
        .map((d) => ({
          time: (new Date(d.time).getTime() / 1000) as UTCTimestamp,
          value: d.value as number,
        }))

      const ma10Series = chart.addSeries(LineSeries, {
        color: '#10b981',
        lineWidth: 2,
        title: 'MA10',
        priceLineVisible: false,
        lastValueVisible: false,
      })
      ma10Series.setData(ma10Data)
    }

    if (ma20 && ma20.length > 0) {
      const ma20Data: LineData[] = ma20
        .filter((d) => d.value !== null)
        .map((d) => ({
          time: (new Date(d.time).getTime() / 1000) as UTCTimestamp,
          value: d.value as number,
        }))

      const ma20Series = chart.addSeries(LineSeries, {
        color: '#3b82f6',
        lineWidth: 2,
        title: 'MA20',
        priceLineVisible: false,
        lastValueVisible: false,
      })
      ma20Series.setData(ma20Data)
    }

    // Add volume histogram
    if (volumeData && volumeData.length > 0) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: '#94a3b8',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: 'volume',
      })

      chart.priceScale('volume').applyOptions({
        scaleMargins: {
          top: 0.85, // Price chart: top 80%, gap: 5%, volume: bottom 15%
          bottom: 0,
        },
      })

      const histogramData: HistogramData[] = volumeData.map((d) => ({
        time: (new Date(d.time).getTime() / 1000) as UTCTimestamp,
        value: d.value,
        color: d.color,
      }))
      volumeSeries.setData(histogramData)
    }

    // Subscribe to crosshair move for tooltip
    chart.subscribeCrosshairMove((param: MouseEventParams) => {
      if (
        !param.time ||
        !param.point ||
        param.point.x < 0 ||
        param.point.y < 0
      ) {
        setTooltip(null)
        return
      }

      // Get candle data at crosshair position
      const candleData = param.seriesData.get(candleSeries) as
        | CandlestickData
        | undefined

      if (!candleData) {
        setTooltip(null)
        return
      }

      // Get volume data
      const volumePoint = volumeData.find((v) => {
        const volumeTime = new Date(v.time).getTime() / 1000
        return volumeTime === param.time
      })

      // Convert UTC timestamp to KST date string
      const utcTimestamp = param.time as number
      const kstDate = new Date((utcTimestamp * 1000) + (9 * 60 * 60 * 1000))
      const dateStr = kstDate.toISOString().split('T')[0]

      // Format as YYYY년 MM월 DD일
      const [year, month, day] = dateStr.split('-')
      const formattedDate = `${year}년 ${month}월 ${day}일`

      setTooltip({
        date: formattedDate,
        open: candleData.open,
        high: candleData.high,
        low: candleData.low,
        close: candleData.close,
        volume: volumePoint?.value || 0,
        isUp: candleData.close >= candleData.open,
      })

      setTooltipPosition({
        x: param.point.x,
        y: param.point.y,
      })
    })

    // Fit content
    chart.timeScale().fitContent()

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        })
      }
    }

    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
      chartRef.current = null
    }
  }, [data, volumeData, ma5, ma10, ma20, height])

  return (
    <div className="relative">
      <div ref={chartContainerRef} />

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-10 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-sm"
          style={{
            left: tooltipPosition.x + 15,
            top: tooltipPosition.y - 10,
          }}
        >
          <div className="font-semibold mb-2 text-gray-700">{tooltip.date}</div>
          <div className="space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">시가:</span>
              <span className={tooltip.isUp ? 'text-red-500 font-medium' : 'text-blue-500 font-medium'}>
                {tooltip.open.toLocaleString()}원
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">고가:</span>
              <span className={tooltip.isUp ? 'text-red-500 font-medium' : 'text-blue-500 font-medium'}>
                {tooltip.high.toLocaleString()}원
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">저가:</span>
              <span className={tooltip.isUp ? 'text-red-500 font-medium' : 'text-blue-500 font-medium'}>
                {tooltip.low.toLocaleString()}원
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">종가:</span>
              <span className={tooltip.isUp ? 'text-red-500 font-medium' : 'text-blue-500 font-medium'}>
                {tooltip.close.toLocaleString()}원
              </span>
            </div>
            <div className="flex justify-between gap-4 pt-1 border-t border-gray-200">
              <span className="text-gray-600">거래량:</span>
              <span className="text-gray-700">
                {tooltip.volume.toLocaleString()}주
              </span>
            </div>
          </div>
        </div>
      )}

      {data.length > 0 && (
        <div className="mt-2 text-sm text-gray-500 text-center">
          차트 데이터: {data.length}일 | 이동평균선: MA5(빨강), MA10(초록), MA20(파랑)
        </div>
      )}
    </div>
  )
}
