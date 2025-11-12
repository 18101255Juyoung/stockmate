/**
 * User Profile Service
 * Handles user profile retrieval and updates
 */

import { prisma } from '@/lib/prisma'
import { ApiResponse, ErrorCodes } from '@/lib/types/api'

/**
 * Get public profile by username
 * Retrieves a user's public profile information including portfolio data and counts
 *
 * @param username - Username of the user whose profile to retrieve
 * @returns User profile data including basic info, portfolio metrics, and social counts (followers, following, posts, transactions)
 *
 * @example
 * const result = await getPublicProfile('john_trader')
 * if (result.success) {
 *   console.log(`${result.data.user.displayName}: ${result.data.portfolio.totalReturn}% return`)
 *   console.log(`${result.data.user.followerCount} followers`)
 * }
 */
export async function getPublicProfile(
  username: string
): Promise<ApiResponse<{ user: any; portfolio: any }>> {
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
        portfolio: {
          select: {
            initialCapital: true,
            currentCash: true,
            totalAssets: true,
            totalReturn: true,
            realizedPL: true,
            unrealizedPL: true,
            updatedAt: true,
          },
        },
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true,
            transactions: true,
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

    // Separate user and portfolio data
    const { portfolio, ...userData } = user

    return {
      success: true,
      data: {
        user: {
          ...userData,
          followerCount: userData._count.followers,
          followingCount: userData._count.following,
          postCount: userData._count.posts,
          transactionCount: userData._count.transactions,
        },
        portfolio,
      },
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
 * Updates a user's profile information (displayName, bio, profileImage)
 *
 * @param userId - ID of the user whose profile to update
 * @param data - Profile fields to update (all optional)
 * @param data.displayName - New display name (cannot be empty)
 * @param data.bio - New bio text (empty string sets to null)
 * @param data.profileImage - New profile image URL (empty string sets to null)
 * @returns Updated user profile data
 *
 * @example
 * const result = await updateProfile('user123', {
 *   displayName: 'John the Trader',
 *   bio: 'Value investor since 2020'
 * })
 * if (result.success) {
 *   console.log('Profile updated:', result.data.user.displayName)
 * }
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
