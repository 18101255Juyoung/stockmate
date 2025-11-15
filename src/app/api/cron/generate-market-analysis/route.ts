/**
 * Generate Market Analysis API
 * POST /api/cron/generate-market-analysis
 *
 * Regenerates market analysis for a specific date
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateMarketAnalysis } from '@/lib/services/aiAdvisorService'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date } = body

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Date is required (YYYY-MM-DD format)' },
        { status: 400 }
      )
    }

    const targetDate = new Date(date)
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format' },
        { status: 400 }
      )
    }

    console.log(`🔄 Regenerating market analysis for ${date}...`)

    // Delete existing analysis
    const dateOnly = new Date(targetDate.toISOString().split('T')[0] + 'T00:00:00.000Z')

    await prisma.marketAnalysis.delete({
      where: { date: dateOnly },
    }).catch(() => {
      console.log('  No existing analysis to delete')
    })

    // Generate new analysis
    const result = await generateMarketAnalysis(targetDate)

    console.log('✅ Market analysis regenerated successfully')
    console.log(`  Date: ${result.date}`)
    console.log(`  Analysis generated`)

    return NextResponse.json({
      success: true,
      data: {
        date: result.date,
        message: 'Market analysis generated successfully',
      },
    })
  } catch (error: any) {
    console.error('❌ Market analysis generation failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate market analysis'
      },
      { status: 500 }
    )
  }
}
