/**
 * Cron API: Ranking Update
 * Updates weekly, monthly, and all-time rankings
 *
 * Schedule: 16:10 KST (Mon-Fri)
 */

import { NextRequest } from 'next/server'
import { verifyCronAuth, createUnauthorizedResponse } from '@/lib/utils/cronAuth'
import { triggerRankingUpdate } from '@/lib/scheduler'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  // Verify authorization
  if (!verifyCronAuth(request)) {
    return createUnauthorizedResponse()
  }

  console.log('\n🏆 [Cron API] Updating rankings...')

  try {
    const results = await triggerRankingUpdate()

    console.log('✅ [Cron API] Rankings updated:')
    results.forEach((r) => {
      console.log(`   ${r.period}: ${r.updated} users`)
    })

    return Response.json({
      success: true,
      message: 'Rankings updated',
      results
    })
  } catch (error) {
    console.error('❌ [Cron API] Ranking update failed:', error)
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
