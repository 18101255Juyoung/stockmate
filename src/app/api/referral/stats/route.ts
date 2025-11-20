/**
 * GET /api/referral/stats - Get referral statistics for current user
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getReferralStats } from '@/lib/services/referralService'
import { ErrorCodes } from '@/lib/types/api'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorCodes.AUTH_UNAUTHORIZED,
            message: 'You must be logged in to view referral stats',
          },
        },
        { status: 401 }
      )
    }

    const stats = await getReferralStats(session.user.id)

    return NextResponse.json(
      {
        success: true,
        data: stats,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get referral stats API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Failed to get referral statistics',
        },
      },
      { status: 500 }
    )
  }
}
