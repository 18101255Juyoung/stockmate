/**
 * POST /api/posts - Create a new post
 * GET /api/posts - Get posts list with pagination
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createPost, getPosts } from '@/lib/services/postService'
import { ErrorCodes } from '@/lib/types/api'

/**
 * GET /api/posts
 * Get posts list with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const userId = searchParams.get('userId') || undefined
    const isVerified = searchParams.get('isVerified')
      ? searchParams.get('isVerified') === 'true'
      : undefined

    // Get posts
    const result = await getPosts({
      page,
      limit,
      userId,
      isVerified,
    })

    if (!result.success) {
      return NextResponse.json(result, { status: 500 })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Get posts API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Failed to get posts',
        },
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/posts
 * Create a new post (requires authentication)
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorCodes.AUTH_UNAUTHORIZED,
            message: 'You must be logged in to create a post',
          },
        },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { title, content, imageUrls } = body

    // Create post
    const result = await createPost(session.user.id, {
      title,
      content,
      imageUrls,
    })

    if (!result.success) {
      const status = result.error.code === ErrorCodes.VALIDATION_MISSING_FIELDS ? 400 : 500
      return NextResponse.json(result, { status })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Create post API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Failed to create post',
        },
      },
      { status: 500 }
    )
  }
}
