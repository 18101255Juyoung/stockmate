/**
 * GET /api/posts/[id]/comments - Get comments for a post
 * POST /api/posts/[id]/comments - Create a comment on a post
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createComment, getComments } from '@/lib/services/commentService'
import { ErrorCodes } from '@/lib/types/api'

export const dynamic = 'force-dynamic'

/**
 * GET /api/posts/[id]/comments
 * Get all comments for a post
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await getComments(params.id)

    if (!result.success) {
      return NextResponse.json(result, { status: 500 })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Get comments API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Failed to get comments',
        },
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/posts/[id]/comments
 * Create a new comment on a post (requires authentication)
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
            message: 'You must be logged in to comment',
          },
        },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { content } = body

    // Create comment
    const result = await createComment(params.id, session.user.id, content)

    if (!result.success) {
      let status = 500

      if (result.error.code === ErrorCodes.NOT_FOUND) {
        status = 404
      } else if (result.error.code === ErrorCodes.VALIDATION_MISSING_FIELDS) {
        status = 400
      }

      return NextResponse.json(result, { status })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Create comment API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Failed to create comment',
        },
      },
      { status: 500 }
    )
  }
}
