/**
 * POST /api/users/[username]/follow - Follow a user
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { followUser } from '@/lib/services/followService'
import { prisma } from '@/lib/prisma'
import { ErrorCodes } from '@/lib/types/api'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorCodes.AUTH_UNAUTHORIZED,
            message: 'You must be logged in to follow users',
          },
        },
        { status: 401 }
      )
    }

    // Find user by username
    const targetUser = await prisma.user.findUnique({
      where: { username: params.username },
      select: { id: true },
    })

    if (!targetUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorCodes.NOT_FOUND,
            message: 'User not found',
          },
        },
        { status: 404 }
      )
    }

    const result = await followUser(session.user.id, targetUser.id)

    if (!result.success) {
      const status =
        result.error.code === ErrorCodes.NOT_FOUND ? 404 : 400
      return NextResponse.json(result, { status })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Follow user API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Failed to follow user',
        },
      },
      { status: 500 }
    )
  }
}
