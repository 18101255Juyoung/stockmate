/**
 * GET /api/posts/[id] - Get a single post
 * PATCH /api/posts/[id] - Update a post
 * DELETE /api/posts/[id] - Delete a post
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getPost,
  updatePost,
  deletePost,
} from '@/lib/services/postService'
import { ErrorCodes } from '@/lib/types/api'

/**
 * GET /api/posts/[id]
 * Get a single post by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await getPost(params.id)

    if (!result.success) {
      const status = result.error.code === ErrorCodes.NOT_FOUND ? 404 : 500
      return NextResponse.json(result, { status })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Get post API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Failed to get post',
        },
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/posts/[id]
 * Update a post (requires authentication and ownership)
 */
export async function PATCH(
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
            message: 'You must be logged in to update a post',
          },
        },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { title, content, imageUrls } = body

    // Update post
    const result = await updatePost(params.id, session.user.id, {
      title,
      content,
      imageUrls,
    })

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
    console.error('Update post API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Failed to update post',
        },
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/posts/[id]
 * Delete a post (requires authentication and ownership)
 */
export async function DELETE(
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
            message: 'You must be logged in to delete a post',
          },
        },
        { status: 401 }
      )
    }

    // Delete post
    const result = await deletePost(params.id, session.user.id)

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
    console.error('Delete post API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Failed to delete post',
        },
      },
      { status: 500 }
    )
  }
}
