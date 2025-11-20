/**
 * GET /api/ranking/me - Get current user's rank
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserRank, type RankingPeriod } from '@/lib/services/rankingService'
import { ErrorCodes } from '@/lib/types/api'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorCodes.AUTH_UNAUTHORIZED,
            message: 'You must be logged in to view your rank',
          },
        },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const period = (searchParams.get('period') || 'ALL_TIME') as RankingPeriod

    // Validate period
    const validPeriods = ['WEEKLY', 'MONTHLY', 'ALL_TIME']
    if (!validPeriods.includes(period)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorCodes.VALIDATION_INVALID_INPUT,
            message: 'Invalid period parameter',
          },
        },
        { status: 400 }
      )
    }

    const result = await getUserRank(session.user.id, period)

    if (!result.success) {
      return NextResponse.json(result, { status: 500 })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Get user rank API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Failed to get user rank',
        },
      },
      { status: 500 }
    )
  }
}
