/**
 * PATCH /api/users/me - Update own profile
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updateProfile } from '@/lib/services/userProfileService'
import { ErrorCodes } from '@/lib/types/api'

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorCodes.AUTH_UNAUTHORIZED,
            message: 'You must be logged in to update your profile',
          },
        },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { displayName, bio, profileImage } = body

    const result = await updateProfile(session.user.id, {
      displayName,
      bio,
      profileImage,
    })

    if (!result.success) {
      const status =
        result.error.code === ErrorCodes.VALIDATION_MISSING_FIELDS ? 400 : 500
      return NextResponse.json(result, { status })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Update profile API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Failed to update profile',
        },
      },
      { status: 500 }
    )
  }
}
