/**
 * Stock Chart Data API
 * Returns historical price data (daily/weekly candles) for a given stock
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { aggregateToWeekly } from '@/lib/utils/chartAggregation'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/stocks/[code]/chart
 * Get historical price data (OHLCV) for chart display
 *
 * Query params:
 * - days: Number of trading days to fetch (default: 90, max: 500)
 * - timeframe: 'daily' | 'weekly' (default: 'daily')
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('days') || '90', 10), 500)
    const timeframe = searchParams.get('timeframe') || 'daily'

    // Validate timeframe
    if (timeframe !== 'daily' && timeframe !== 'weekly') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid timeframe: ${timeframe}. Must be 'daily' or 'weekly'`,
          },
        },
        { status: 400 }
      )
    }

    // Verify stock exists
    const stock = await prisma.stock.findUnique({
      where: { stockCode: code },
      select: { stockCode: true, stockName: true },
    })

    if (!stock) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Stock not found: ${code}`,
          },
        },
        { status: 404 }
      )
    }

    // Fetch most recent N trading days (latest records)
    const priceHistoryDesc = await prisma.stockPriceHistory.findMany({
      where: {
        stockCode: code,
      },
      orderBy: {
        date: 'desc',
      },
      take: limit,
      select: {
        date: true,
        openPrice: true,
        highPrice: true,
        lowPrice: true,
        closePrice: true,
        volume: true,
      },
    })

    // Reverse to get chronological order (oldest to newest)
    const priceHistory = priceHistoryDesc.reverse()

    // Transform to chart format (daily candles)
    const dailyCandles = priceHistory.map((item) => ({
      date: item.date.toISOString().split('T')[0], // YYYY-MM-DD
      openPrice: item.openPrice,
      highPrice: item.highPrice,
      lowPrice: item.lowPrice,
      closePrice: item.closePrice,
      volume: Number(item.volume),
    }))

    // Aggregate if timeframe is weekly
    let chartData
    if (timeframe === 'weekly') {
      const weeklyCandles = aggregateToWeekly(dailyCandles)
      chartData = weeklyCandles.map((item) => ({
        date: item.date,
        open: item.openPrice,
        high: item.highPrice,
        low: item.lowPrice,
        close: item.closePrice,
        volume: item.volume,
      }))
    } else {
      chartData = dailyCandles.map((item) => ({
        date: item.date,
        open: item.openPrice,
        high: item.highPrice,
        low: item.lowPrice,
        close: item.closePrice,
        volume: item.volume,
      }))
    }

    return NextResponse.json({
      success: true,
      data: {
        stockCode: stock.stockCode,
        stockName: stock.stockName,
        chartData,
        period: {
          tradingDays: priceHistory.length,
          timeframe,
          startDate: priceHistory.length > 0 ? priceHistory[0].date.toISOString().split('T')[0] : null,
          endDate: priceHistory.length > 0 ? priceHistory[priceHistory.length - 1].date.toISOString().split('T')[0] : null,
        },
      },
    })
  } catch (error) {
    console.error('Failed to fetch chart data:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch chart data',
        },
      },
      { status: 500 }
    )
  }
}
