/**
 * Development API: Historical Data Backfill
 * Fetches historical price data from KIS API and saves to database
 * Only available in development mode
 */

import { NextRequest, NextResponse } from 'next/server'
import { backfillAllStocks } from '@/lib/services/historicalDataCollector'

/**
 * POST /api/dev/backfill-history
 * Backfill historical data for all stocks
 *
 * Query params:
 * - days: Number of days to backfill (default: 365, max: 1095)
 *
 * Example:
 * POST /api/dev/backfill-history?days=365
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
    const days = Math.min(parseInt(searchParams.get('days') || '365', 10), 1095)

    console.log(`\n🔧 [Manual] Triggering historical data backfill for ${days} days...`)

    // Start backfill (this will take a long time for large datasets)
    const results = await backfillAllStocks(days)

    // Calculate summary
    const totalInserted = results.reduce((sum, r) => sum + r.daysInserted, 0)
    const successCount = results.filter((r) => r.errors.length === 0).length
    const failedCount = results.filter((r) => r.errors.length > 0).length

    console.log(`✅ [Manual] Backfill completed: ${totalInserted} days inserted\n`)

    return NextResponse.json({
      success: true,
      data: {
        action: 'backfill_history',
        daysRequested: days,
        totalDaysInserted: totalInserted,
        stocksProcessed: results.length,
        successCount,
        failedCount,
        results: results.map((r) => ({
          stockCode: r.stockCode,
          stockName: r.stockName,
          daysInserted: r.daysInserted,
          errors: r.errors.length > 0 ? r.errors : undefined,
        })),
        message: `Backfilled ${totalInserted} days across ${results.length} stocks`,
        warning:
          days > 100
            ? `Large backfill requested (${days} days). This may take ${Math.ceil(results.length * days / 60)} minutes due to rate limiting.`
            : undefined,
      },
    })
  } catch (error) {
    console.error('❌ [Manual] Historical data backfill failed:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Backfill failed',
        },
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/dev/backfill-history
 * Get endpoint info and usage instructions
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
      endpoint: '/api/dev/backfill-history',
      methods: ['GET', 'POST'],
      description: 'Backfill historical stock price data from KIS API (development only)',
      usage: {
        backfill1Year: 'POST /api/dev/backfill-history?days=365',
        backfill3Years: 'POST /api/dev/backfill-history?days=1095',
        backfill30Days: 'POST /api/dev/backfill-history?days=30',
      },
      notes: [
        'Backfill respects KIS API rate limit (1 request/second)',
        'For 50 stocks with 365 days: approximately 50 seconds',
        'For 50 stocks with 1095 days (3 years): approximately 150 seconds (2.5 minutes)',
        'Existing data will be updated (upsert)',
        'Data is fetched from KIS virtual trading server',
      ],
      recommendations: [
        'Start with 30-90 days for testing',
        'For full 3-year backfill, run during off-peak hours',
        'Monitor console logs for progress',
      ],
    },
  })
}
