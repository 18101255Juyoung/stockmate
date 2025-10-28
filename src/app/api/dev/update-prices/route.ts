/**
 * Development API: Manual Stock Price Update Trigger
 * Only available in development mode
 */

import { NextRequest, NextResponse } from 'next/server'
import { triggerPriceUpdate, triggerDailyCandleCreation } from '@/lib/scheduler'

/**
 * POST /api/dev/update-prices
 * Manually trigger stock price update
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
    const action = searchParams.get('action') || 'update' // 'update' or 'candles'

    if (action === 'candles') {
      // Create daily candles
      const count = await triggerDailyCandleCreation()

      return NextResponse.json({
        success: true,
        data: {
          action: 'daily_candles',
          candlesCreated: count,
          message: `Successfully created ${count} daily candles`,
        },
      })
    } else {
      // Update prices (default)
      const result = await triggerPriceUpdate()

      return NextResponse.json({
        success: true,
        data: {
          action: 'price_update',
          successCount: result.success,
          failedCount: result.failed,
          errors: result.errors,
          message: `Updated ${result.success} stocks successfully, ${result.failed} failed`,
        },
      })
    }
  } catch (error) {
    console.error('Failed to trigger manual update:', error)

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
 * GET /api/dev/update-prices
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
      endpoint: '/api/dev/update-prices',
      methods: ['GET', 'POST'],
      description: 'Manual trigger for stock price updates (development only)',
      usage: {
        updatePrices: 'POST /api/dev/update-prices?action=update',
        createCandles: 'POST /api/dev/update-prices?action=candles',
      },
      note: 'This endpoint will process all 50 stocks sequentially (takes about 50 seconds due to rate limiting)',
    },
  })
}
