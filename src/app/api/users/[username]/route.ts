/**
 * GET /api/users/[username] - Get user profile by username
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPublicProfile } from '@/lib/services/userProfileService'
import { ErrorCodes } from '@/lib/types/api'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const { username } = params

    const result = await getPublicProfile(username)

    if (!result.success) {
      const status = result.error.code === ErrorCodes.NOT_FOUND ? 404 : 500
      return NextResponse.json(result, { status })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Get user profile API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Failed to get user profile',
        },
      },
      { status: 500 }
    )
  }
}
