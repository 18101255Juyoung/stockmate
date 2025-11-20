/**
 * Development API: Historical Data Backfill Trigger
 * Only available in development mode
 */

import { NextRequest, NextResponse } from 'next/server'
import { backfillAllStocks, backfillStock } from '@/lib/services/historicalDataCollector'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * POST /api/dev/backfill
 * Manually trigger historical data backfill
 * Query params:
 * - days: Number of days to backfill (default: 365)
 * - stockCode: (optional) Backfill specific stock only
 */
export async function POST(request: NextRequest) {
  // Only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DEV_ONLY',
          message: 'This endpoint is only available in development mode',
        },
      },
      { status: 403 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '365', 10)
    const stockCode = searchParams.get('stockCode')

    if (stockCode) {
      // Backfill single stock
      const stock = await prisma.stock.findUnique({
        where: { stockCode },
        select: { stockCode: true, stockName: true },
      })

      if (!stock) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: `Stock not found: ${stockCode}`,
            },
          },
          { status: 404 }
        )
      }

      console.log(`\n📊 [Manual] Backfilling ${stockCode} (${stock.stockName}): ${days} days...`)

      const result = await backfillStock(stock.stockCode, stock.stockName, days)

      return NextResponse.json({
        success: true,
        data: {
          stockCode: result.stockCode,
          stockName: result.stockName,
          daysRequested: result.daysRequested,
          daysInserted: result.daysInserted,
          errors: result.errors,
          message: `Backfilled ${result.daysInserted} days for ${result.stockName}`,
        },
      })
    } else {
      // Backfill all stocks
      console.log(`\n📊 [Manual] Backfilling all stocks: ${days} days...`)

      const results = await backfillAllStocks(days)
      const totalInserted = results.reduce((sum, r) => sum + r.daysInserted, 0)
      const totalErrors = results.filter((r) => r.errors.length > 0).length

      return NextResponse.json({
        success: true,
        data: {
          totalStocks: results.length,
          totalDaysInserted: totalInserted,
          stocksWithErrors: totalErrors,
          results: results.map((r) => ({
            stockCode: r.stockCode,
            stockName: r.stockName,
            daysInserted: r.daysInserted,
            errors: r.errors,
          })),
          message: `Backfilled ${totalInserted} total days across ${results.length} stocks`,
        },
      })
    }
  } catch (error) {
    console.error('Failed to trigger backfill:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/dev/backfill
 * Get endpoint info
 */
export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DEV_ONLY',
          message: 'This endpoint is only available in development mode',
        },
      },
      { status: 403 }
    )
  }

  return NextResponse.json({
    success: true,
    data: {
      endpoint: '/api/dev/backfill',
      methods: ['GET', 'POST'],
      description: 'Manual trigger for historical data backfill (development only)',
      usage: {
        backfillAll365Days: 'POST /api/dev/backfill?days=365',
        backfillAll90Days: 'POST /api/dev/backfill?days=90',
        backfillSingleStock: 'POST /api/dev/backfill?stockCode=005930&days=365',
      },
      note: 'This endpoint will process stocks sequentially due to KIS API rate limiting (1 req/sec). Expect ~50-60 seconds for all 66 stocks.',
      warning: 'KIS API daily chart endpoint may have limitations on historical data range.',
    },
  })
}
