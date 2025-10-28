import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPortfolioSummary } from '@/lib/services/portfolioService'
import { ErrorCodes } from '@/lib/types/api'

/**
 * GET /api/portfolio
 * 포트폴리오 정보 조회
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
            message: 'You must be logged in to view your portfolio',
          },
        },
        { status: 401 }
      )
    }

    const result = await getPortfolioSummary(session.user.id)

    if (!result.success) {
      const statusCode = result.error?.code === ErrorCodes.NOT_FOUND ? 404 : 500
      return NextResponse.json(result, { status: statusCode })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Portfolio API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Failed to retrieve portfolio',
        },
      },
      { status: 500 }
    )
  }
}
