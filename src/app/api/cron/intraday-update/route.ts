import { NextRequest } from 'next/server'
import { verifyCronAuth, createUnauthorizedResponse } from '@/lib/utils/cronAuth'
import { updateAllStockPrices, updateTodayCandles } from '@/lib/services/stockPriceCollector'
import { isMarketOpen } from '@/lib/utils/timezone'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes

/**
 * Intraday Price Update API
 * Called by GitHub Actions every 5 minutes during market hours (09:00-15:30 KST)
 * Updates Stock table prices + StockPriceHistory today's candle
 */
export async function POST(request: NextRequest) {
  // Verify authorization
  if (!verifyCronAuth(request)) {
    return createUnauthorizedResponse()
  }

  // Safety check: only run during market hours
  if (!isMarketOpen()) {
    return Response.json({
      success: false,
      message: 'Market is closed - no update needed',
      timestamp: new Date().toISOString()
    })
  }

  console.log('\n🔄 [Cron API] Starting intraday update (prices + today candles)...')
  const startTime = Date.now()

  try {
    // Step 1: Update all stock prices (Stock table)
    console.log('  📊 Updating stock prices...')
    const priceResult = await updateAllStockPrices()
    console.log(`  ✅ Prices updated: ${priceResult.success} success, ${priceResult.failed} failed`)

    // Step 2: Update today's candles (StockPriceHistory table)
    console.log('  📈 Updating today\'s candles...')
    const candleCount = await updateTodayCandles()
    console.log(`  ✅ Today's candles updated: ${candleCount} candles`)

    const duration = Date.now() - startTime
    console.log(`✅ [Cron API] Intraday update completed in ${duration}ms`)

    return Response.json({
      success: true,
      message: 'Intraday update completed successfully',
      data: {
        pricesUpdated: priceResult.success,
        pricesFailed: priceResult.failed,
        candlesUpdated: candleCount,
        durationMs: duration
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`❌ [Cron API] Intraday update failed after ${duration}ms:`, error)

    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
