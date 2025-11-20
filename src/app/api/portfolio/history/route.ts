import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getPortfolioHistory,
  PortfolioHistoryOptions,
} from '@/lib/services/portfolioHistoryService'
import { ErrorCodes } from '@/lib/types/api'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/portfolio/history
 * 포트폴리오 히스토리 조회 (Transaction 기반)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorCodes.AUTH_UNAUTHORIZED,
            message: 'You must be logged in to view portfolio history',
          },
        },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') as PortfolioHistoryOptions['period']
    const date = searchParams.get('date') // YYYY-MM-DD format for specific date lookup

    // Validate period
    const validPeriods = ['1d', '7d', '30d', '90d', '1y', 'all']
    if (period && !validPeriods.includes(period)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorCodes.VALIDATION_INVALID_INPUT,
            message: `Invalid period. Must be one of: ${validPeriods.join(', ')}`,
          },
        },
        { status: 400 }
      )
    }

    // Get portfolio history
    const result = await getPortfolioHistory(session.user.id, { period, date: date || undefined })

    if (!result.success) {
      const statusCode = result.error?.code === ErrorCodes.NOT_FOUND ? 404 : 500
      return NextResponse.json(result, { status: statusCode })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Portfolio history API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Failed to retrieve portfolio history',
        },
      },
      { status: 500 }
    )
  }
}
