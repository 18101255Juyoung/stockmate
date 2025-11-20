/**
 * DELETE /api/posts/[id]/comments/[commentId] - Delete a comment
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { deleteComment } from '@/lib/services/commentService'
import { ErrorCodes } from '@/lib/types/api'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/posts/[id]/comments/[commentId]
 * Delete a comment (requires authentication and ownership)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
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
            message: 'You must be logged in to delete a comment',
          },
        },
        { status: 401 }
      )
    }

    // Delete comment
    const result = await deleteComment(params.commentId, session.user.id)

    if (!result.success) {
      let status = 500

      if (result.error.code === ErrorCodes.NOT_FOUND) {
        status = 404
      } else if (result.error.code === ErrorCodes.AUTH_UNAUTHORIZED) {
        status = 403
      }

      return NextResponse.json(result, { status })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Delete comment API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Failed to delete comment',
        },
      },
      { status: 500 }
    )
  }
}
