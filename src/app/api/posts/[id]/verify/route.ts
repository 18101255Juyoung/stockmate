/**
 * POST /api/posts/[id]/verify - Verify a post with transactions
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { verifyPost } from '@/lib/services/investmentVerificationService'
import { ErrorCodes } from '@/lib/types/api'

export const dynamic = 'force-dynamic'

/**
 * POST /api/posts/[id]/verify
 * Verify a post by linking it to transactions (requires authentication)
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
            message: 'You must be logged in to verify a post',
          },
        },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { transactionIds } = body

    // Validate input
    if (!transactionIds || !Array.isArray(transactionIds)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorCodes.VALIDATION_INVALID_INPUT,
            message: 'transactionIds must be an array',
          },
        },
        { status: 400 }
      )
    }

    // Verify post
    const result = await verifyPost(params.id, transactionIds)

    if (!result.success) {
      let status = 500

      if (result.error.code === ErrorCodes.NOT_FOUND) {
        status = 404
      } else if (
        result.error.code === ErrorCodes.VALIDATION_INVALID_INPUT ||
        result.error.code === ErrorCodes.AUTH_UNAUTHORIZED
      ) {
        status = 400
      }

      return NextResponse.json(result, { status })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Verify post API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Failed to verify post',
        },
      },
      { status: 500 }
    )
  }
}
