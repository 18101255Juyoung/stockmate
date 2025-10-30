/**
 * GET /api/users/[id]/followers - Get followers list
 */

import { NextRequest, NextResponse } from 'next/server'
import { getFollowers } from '@/lib/services/followService'
import { ErrorCodes } from '@/lib/types/api'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await getFollowers(params.id)

    if (!result.success) {
      return NextResponse.json(result, { status: 500 })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Get followers API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Failed to get followers',
        },
      },
      { status: 500 }
    )
  }
}
