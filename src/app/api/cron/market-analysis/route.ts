/**
 * Cron API: Market Analysis Generation
 * Generates AI-powered market analysis (KOSPI/KOSDAQ/sectors/news)
 *
 * Schedule: 15:35 KST (Mon-Fri)
 */

import { NextRequest } from 'next/server'
import { verifyCronAuth, createUnauthorizedResponse } from '@/lib/utils/cronAuth'
import { generateMarketAnalysis } from '@/lib/services/aiAdvisorService'
import { KSTDate } from '@/lib/utils/kst-date'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // Verify authorization
  if (!verifyCronAuth(request)) {
    return createUnauthorizedResponse()
  }

  console.log('\n📰 [Cron API] Generating market analysis...')

  try {
    const kstToday = KSTDate.today()
    const analysis = await generateMarketAnalysis(kstToday)

    console.log('✅ [Cron API] Market analysis generated successfully')
    return Response.json({
      success: true,
      message: 'Market analysis generated',
      date: kstToday.toISOString()
    })
  } catch (error) {
    console.error('❌ [Cron API] Market analysis generation failed:', error)
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
