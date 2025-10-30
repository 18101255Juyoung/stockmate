/**
 * GET /api/users/profile/[username] - Get public profile
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPublicProfile } from '@/lib/services/userProfileService'
import { ErrorCodes } from '@/lib/types/api'

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const result = await getPublicProfile(params.username)

    if (!result.success) {
      const status = result.error.code === ErrorCodes.NOT_FOUND ? 404 : 500
      return NextResponse.json(result, { status })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Get public profile API error:', error)
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
