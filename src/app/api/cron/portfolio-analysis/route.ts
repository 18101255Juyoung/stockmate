/**
 * Cron API: Portfolio Analysis Generation
 * Generates AI-powered portfolio analysis for all users
 *
 * Schedule: 16:00 KST (Mon-Fri)
 */

import { NextRequest } from 'next/server'
import { verifyCronAuth, createUnauthorizedResponse } from '@/lib/utils/cronAuth'
import { generateDailyPortfolioAnalysisForAllUsers } from '@/lib/services/portfolioAnalysisService'
import { KSTDate } from '@/lib/utils/kst-date'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // Verify authorization
  if (!verifyCronAuth(request)) {
    return createUnauthorizedResponse()
  }

  console.log('\n📊 [Cron API] Starting portfolio analysis...')

  try {
    const kstToday = KSTDate.today()
    const result = await generateDailyPortfolioAnalysisForAllUsers(kstToday)

    console.log(`✅ [Cron API] Analysis completed: ${result.successful}/${result.total} users`)
    return Response.json({
      success: true,
      message: 'Portfolio analysis completed',
      result
    })
  } catch (error) {
    console.error('❌ [Cron API] Portfolio analysis failed:', error)
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
