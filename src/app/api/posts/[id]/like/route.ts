/**
 * POST /api/posts/[id]/like - Toggle like on a post
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { toggleLike } from '@/lib/services/likeService'
import { ErrorCodes } from '@/lib/types/api'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/posts/[id]/like
 * Toggle like on a post (requires authentication)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorCodes.AUTH_UNAUTHORIZED,
            message: 'You must be logged in to like a post',
          },
        },
        { status: 401 }
      )
    }

    // Toggle like
    const result = await toggleLike(params.id, session.user.id)

    if (!result.success) {
      const status = result.error.code === ErrorCodes.NOT_FOUND ? 404 : 500
      return NextResponse.json(result, { status })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Toggle like API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Failed to toggle like',
        },
      },
      { status: 500 }
    )
  }
}
