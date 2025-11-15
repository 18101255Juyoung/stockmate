/**
 * Development API for manually regenerating market analysis
 * POST /api/dev/market-analysis
 * Body: { date?: string } (YYYY-MM-DD, optional, default: today)
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateMarketAnalysis } from '@/lib/services/aiAdvisorService'
import { KSTDate } from '@/lib/utils/kst-date'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { success: false, error: 'This API is only available in development' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const dateStr = body.date
    const date = dateStr ? KSTDate.parse(dateStr) : KSTDate.today()

    console.log(`\n🔧 [Dev API] Manually generating market analysis for ${KSTDate.format(KSTDate.fromDate(date))}...\n`)

    // Check if analysis already exists
    const existing = await prisma.marketAnalysis.findUnique({
      where: { date }
    })

    if (existing && !body.force) {
      return NextResponse.json({
        success: false,
        error: 'Analysis already exists. Use { "force": true } to regenerate.',
        data: existing
      }, { status: 409 })
    }

    // Delete existing if force=true
    if (existing && body.force) {
      console.log('🗑️  Deleting existing analysis...')
      await prisma.marketAnalysis.delete({
        where: { date }
      })
      console.log('✅ Deleted\n')
    }

    // Generate new analysis
    const analysis = await generateMarketAnalysis(date)

    console.log('✅ [Dev API] Market analysis generated successfully\n')

    return NextResponse.json({
      success: true,
      data: analysis,
      message: 'Market analysis generated successfully'
    })

  } catch (error: any) {
    console.error('❌ [Dev API] Failed to generate market analysis:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to generate market analysis'
    }, { status: 500 })
  }
}
