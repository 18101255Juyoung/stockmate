/**
 * POST /api/cron/update-rankings - Update all rankings (cron job)
 * This endpoint should be called by a cron job (e.g., Vercel Cron)
 */

import { NextRequest, NextResponse } from 'next/server'
import { updateRankings } from '@/lib/services/rankingService'
import { ErrorCodes } from '@/lib/types/api'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Verify cron job authorization (optional but recommended)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorCodes.AUTH_UNAUTHORIZED,
            message: 'Unauthorized',
          },
        },
        { status: 401 }
      )
    }

    // Update rankings for all periods
    const periods = ['WEEKLY', 'MONTHLY', 'ALL_TIME'] as const
    const results = []

    for (const period of periods) {
      const result = await updateRankings(period)
      results.push({
        period,
        success: result.success,
        updated: result.success ? result.data.updated : 0,
      })
    }

    return NextResponse.json(
      {
        success: true,
        data: { results },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Update rankings cron error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Failed to update rankings',
        },
      },
      { status: 500 }
    )
  }
}
