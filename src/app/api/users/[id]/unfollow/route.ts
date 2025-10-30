/**
 * DELETE /api/users/[id]/unfollow - Unfollow a user
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { unfollowUser } from '@/lib/services/followService'
import { ErrorCodes } from '@/lib/types/api'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorCodes.AUTH_UNAUTHORIZED,
            message: 'You must be logged in to unfollow users',
          },
        },
        { status: 401 }
      )
    }

    const result = await unfollowUser(session.user.id, params.id)

    if (!result.success) {
      const status = result.error.code === ErrorCodes.NOT_FOUND ? 404 : 500
      return NextResponse.json(result, { status })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Unfollow user API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Failed to unfollow user',
        },
      },
      { status: 500 }
    )
  }
}
