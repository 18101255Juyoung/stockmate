/**
 * Market Analysis API - Get or regenerate market analysis by date
 * GET /api/ai/market/[date] - Get existing analysis
 * POST /api/ai/market/[date] - Regenerate analysis (force)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { KSTDate } from '@/lib/utils/kst-date'
import { generateMarketAnalysis } from '@/lib/services/aiAdvisorService'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { date: string } }
) {
  try {
    const dateStr = params.date

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_INVALID_DATE', message: 'Invalid date format. Expected YYYY-MM-DD' } },
        { status: 400 }
      )
    }

    // Parse as KST date (timezone-safe)
    const analysisDate = KSTDate.parse(dateStr)

    // Fetch market analysis
    const analysis = await prisma.marketAnalysis.findUnique({
      where: { date: analysisDate },
    })

    if (!analysis) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Market analysis not found for this date' } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        date: analysis.date,
        marketData: analysis.marketData,
        analysis: analysis.analysis,
        summary: analysis.summary,
        tokensUsed: analysis.tokensUsed,
        cost: analysis.cost,
        model: analysis.model,
        createdAt: analysis.createdAt,
      },
    })
  } catch (error) {
    console.error('Market analysis fetch error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch market analysis' } },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { date: string } }
) {
  try {
    const dateStr = params.date

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_INVALID_DATE', message: 'Invalid date format. Expected YYYY-MM-DD' } },
        { status: 400 }
      )
    }

    // Parse as KST date (timezone-safe)
    const analysisDate = KSTDate.parse(dateStr)

    console.log(`[API] Regenerating market analysis for ${dateStr}...`)

    // Generate market analysis (validation will auto-regenerate if needed)
    const analysis = await generateMarketAnalysis(analysisDate)

    console.log(`[API] Market analysis regenerated successfully for ${dateStr}`)

    return NextResponse.json({
      success: true,
      data: {
        date: analysis.date,
        marketData: analysis.marketData,
        analysis: analysis.analysis,
        summary: analysis.summary,
        tokensUsed: analysis.tokensUsed,
        cost: analysis.cost,
        model: analysis.model,
        createdAt: analysis.createdAt,
      },
    })
  } catch (error) {
    console.error('Market analysis generation error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to generate market analysis' } },
      { status: 500 }
    )
  }
}
