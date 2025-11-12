/**
 * GET /api/users/[username]/followers - Get followers list
 */

import { NextRequest, NextResponse } from 'next/server'
import { getFollowers } from '@/lib/services/followService'
import { prisma } from '@/lib/prisma'
import { ErrorCodes } from '@/lib/types/api'

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
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

    const result = await getFollowers(targetUser.id)

    if (!result.success) {
      const status = result.error.code === ErrorCodes.NOT_FOUND ? 404 : 500
      return NextResponse.json(result, { status })
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
