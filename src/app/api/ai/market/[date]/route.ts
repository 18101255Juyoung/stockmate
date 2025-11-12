/**
 * Market Analysis API - Get market analysis by date
 * GET /api/ai/market/[date]
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { toKSTDateOnly } from '@/lib/utils/timezone'

export async function GET(
  request: NextRequest,
  { params }: { params: { date: string } }
) {
  try {
    const dateStr = params.date

    // Parse date string (YYYY-MM-DD)
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_INVALID_DATE', message: 'Invalid date format' } },
        { status: 400 }
      )
    }

    const analysisDate = toKSTDateOnly(date)

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
