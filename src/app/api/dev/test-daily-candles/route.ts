/**
 * Development API: Test updated createDailyCandles() function
 * Only available in development mode
 */

import { NextRequest, NextResponse } from 'next/server'
import { createDailyCandles } from '@/lib/services/stockPriceCollector'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/dev/test-daily-candles
 * Tests the updated createDailyCandles() function and verifies the fix
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
    console.log('\n🧪 [TEST] Running updated createDailyCandles()...')

    // Run the updated function
    const count = await createDailyCandles()

    console.log(`\n✅ [TEST] Created/updated ${count} daily candles`)

    // Verify Nov 12 vs Nov 13 data
    const nov12Data = await prisma.stockPriceHistory.findUnique({
      where: {
        stockCode_date: {
          stockCode: '005930', // Samsung
          date: new Date('2025-11-12T00:00:00.000Z'),
        },
      },
    })

    const nov13Data = await prisma.stockPriceHistory.findUnique({
      where: {
        stockCode_date: {
          stockCode: '005930', // Samsung
          date: new Date('2025-11-13T00:00:00.000Z'),
        },
      },
    })

    const isDifferent =
      nov12Data &&
      nov13Data &&
      (nov12Data.openPrice !== nov13Data.openPrice ||
        nov12Data.highPrice !== nov13Data.highPrice ||
        nov12Data.lowPrice !== nov13Data.lowPrice ||
        nov12Data.closePrice !== nov13Data.closePrice)

    console.log('\n📊 [TEST] Samsung (005930) comparison:')
    console.log('Nov 12:', {
      O: nov12Data?.openPrice,
      H: nov12Data?.highPrice,
      L: nov12Data?.lowPrice,
      C: nov12Data?.closePrice,
    })
    console.log('Nov 13:', {
      O: nov13Data?.openPrice,
      H: nov13Data?.highPrice,
      L: nov13Data?.lowPrice,
      C: nov13Data?.closePrice,
    })
    console.log(`\n${isDifferent ? '✅ FIXED: Data is different!' : '⚠️  Data is still the same'}`)

    return NextResponse.json({
      success: true,
      data: {
        candlesCreated: count,
        verification: {
          nov12: nov12Data
            ? {
                open: nov12Data.openPrice,
                high: nov12Data.highPrice,
                low: nov12Data.lowPrice,
                close: nov12Data.closePrice,
              }
            : null,
          nov13: nov13Data
            ? {
                open: nov13Data.openPrice,
                high: nov13Data.highPrice,
                low: nov13Data.lowPrice,
                close: nov13Data.closePrice,
              }
            : null,
          isDifferent,
          message: isDifferent
            ? '✅ Chart bug is FIXED! Nov 12 and Nov 13 have different OHLC data.'
            : nov12Data && nov13Data
              ? '⚠️  Data is still identical. This might be normal if market was closed.'
              : '⚠️  Missing data for verification.',
        },
      },
    })
  } catch (error) {
    console.error('❌ [TEST] Test failed:', error)

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
 * GET /api/dev/test-daily-candles
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
      endpoint: '/api/dev/test-daily-candles',
      methods: ['GET', 'POST'],
      description:
        'Tests the updated createDailyCandles() function that now uses KIS API historical data instead of Stock table',
      usage: {
        test: 'POST /api/dev/test-daily-candles',
        curl: 'curl -X POST http://localhost:3000/api/dev/test-daily-candles',
      },
      note: 'This will re-fetch today\'s data from KIS API and update StockPriceHistory with accurate OHLC values.',
      warning:
        'Takes ~50-60 seconds to complete (50 stocks × 1 req/sec rate limit).',
    },
  })
}
