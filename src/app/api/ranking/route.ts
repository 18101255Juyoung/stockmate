/**
 * GET /api/ranking - Get rankings by period
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRankings, type RankingPeriod } from '@/lib/services/rankingService'
import { ErrorCodes } from '@/lib/types/api'
import { League } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const period = (searchParams.get('period') || 'ALL_TIME') as RankingPeriod
    const leagueParam = searchParams.get('league')
    const limit = parseInt(searchParams.get('limit') || '100')

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

    // Validate league (optional)
    let league: League | undefined
    if (leagueParam) {
      const validLeagues = ['ROOKIE', 'HALL_OF_FAME']
      if (!validLeagues.includes(leagueParam)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: ErrorCodes.VALIDATION_INVALID_INPUT,
              message: 'Invalid league parameter. Must be ROOKIE or HALL_OF_FAME',
            },
          },
          { status: 400 }
        )
      }
      league = leagueParam as League
    }

    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorCodes.VALIDATION_INVALID_INPUT,
            message: 'Limit must be between 1 and 100',
          },
        },
        { status: 400 }
      )
    }

    const result = await getRankings(period, league, limit)

    if (!result.success) {
      return NextResponse.json(result, { status: 500 })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Get rankings API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Failed to get rankings',
        },
      },
      { status: 500 }
    )
  }
}
