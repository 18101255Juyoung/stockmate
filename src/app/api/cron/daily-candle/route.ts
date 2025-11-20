/**
 * Cron API: Daily Candle Creation
 * Creates daily OHLC candles from intraday price data
 *
 * Schedule: 15:35 KST (Mon-Fri)
 */

import { NextRequest } from 'next/server'
import { verifyCronAuth, createUnauthorizedResponse } from '@/lib/utils/cronAuth'
import { triggerDailyCandleCreation } from '@/lib/scheduler'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  // Verify authorization
  if (!verifyCronAuth(request)) {
    return createUnauthorizedResponse()
  }

  console.log('\n📈 [Cron API] Creating daily candles...')

  try {
    const count = await triggerDailyCandleCreation()

    console.log(`✅ [Cron API] Daily candles created: ${count}`)
    return Response.json({
      success: true,
      message: 'Daily candles created',
      count
    })
  } catch (error) {
    console.error('❌ [Cron API] Daily candle creation failed:', error)
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
