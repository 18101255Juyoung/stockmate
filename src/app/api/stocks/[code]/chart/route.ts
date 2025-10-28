/**
 * Stock Chart Data API
 * Returns historical price data (daily candles) for a given stock
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/stocks/[code]/chart
 * Get historical price data (OHLCV) for chart display
 *
 * Query params:
 * - days: Number of days to fetch (default: 30, max: 1095 = 3 years)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params
    const { searchParams } = new URL(request.url)
    const days = Math.min(parseInt(searchParams.get('days') || '30', 10), 1095)

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

    // Calculate start date
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    // Fetch price history
    const priceHistory = await prisma.stockPriceHistory.findMany({
      where: {
        stockCode: code,
        date: {
          gte: startDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
      select: {
        date: true,
        openPrice: true,
        highPrice: true,
        lowPrice: true,
        closePrice: true,
        volume: true,
      },
    })

    // Transform to chart format
    const chartData = priceHistory.map((item) => ({
      date: item.date.toISOString().split('T')[0], // YYYY-MM-DD
      open: item.openPrice,
      high: item.highPrice,
      low: item.lowPrice,
      close: item.closePrice,
      volume: Number(item.volume),
    }))

    return NextResponse.json({
      success: true,
      data: {
        stockCode: stock.stockCode,
        stockName: stock.stockName,
        chartData,
        period: {
          days,
          startDate: startDate.toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
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
