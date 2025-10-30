/**
 * User Profile Service
 * Handles user profile retrieval and updates
 */

import { prisma } from '@/lib/prisma'
import { ApiResponse, ErrorCodes } from '@/lib/types/api'

/**
 * Get public profile by username
 */
export async function getPublicProfile(
  username: string
): Promise<ApiResponse<{ user: any }>> {
  try {
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        profileImage: true,
        createdAt: true,
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true,
          },
        },
      },
    })

    if (!user) {
      return {
        success: false,
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: 'User not found',
        },
      }
    }

    return {
      success: true,
      data: { user },
    }
  } catch (error) {
    console.error('Error getting public profile:', error)
    return {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Failed to get user profile',
      },
    }
  }
}

/**
 * Update user profile
 */
export async function updateProfile(
  userId: string,
  data: {
    displayName?: string
    bio?: string
    profileImage?: string
  }
): Promise<ApiResponse<{ user: any }>> {
  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!existingUser) {
      return {
        success: false,
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: 'User not found',
        },
      }
    }

    // Build update data (only include provided fields)
    const updateData: any = {}

    if (data.displayName !== undefined) {
      if (data.displayName.trim() === '') {
        return {
          success: false,
          error: {
            code: ErrorCodes.VALIDATION_MISSING_FIELDS,
            message: 'Display name cannot be empty',
          },
        }
      }
      updateData.displayName = data.displayName.trim()
    }

    if (data.bio !== undefined) {
      updateData.bio = data.bio.trim() || null
    }

    if (data.profileImage !== undefined) {
      updateData.profileImage = data.profileImage || null
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        profileImage: true,
      },
    })

    return {
      success: true,
      data: { user },
    }
  } catch (error) {
    console.error('Error updating profile:', error)
    return {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Failed to update profile',
      },
    }
  }
}
