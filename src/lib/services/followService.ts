/**
 * Follow Service
 * Handles follow/unfollow and follower/following lists
 */

import { prisma } from '@/lib/prisma'
import { ApiResponse, ErrorCodes } from '@/lib/types/api'

/**
 * Follow a user
 */
export async function followUser(
  followerId: string,
  followingId: string
): Promise<ApiResponse<{ followed: boolean }>> {
  try {
    // Can't follow yourself
    if (followerId === followingId) {
      return {
        success: false,
        error: {
          code: ErrorCodes.VALIDATION_INVALID_INPUT,
          message: 'You cannot follow yourself',
        },
      }
    }

    // Check if users exist
    const [follower, following] = await Promise.all([
      prisma.user.findUnique({ where: { id: followerId } }),
      prisma.user.findUnique({ where: { id: followingId } }),
    ])

    if (!follower || !following) {
      return {
        success: false,
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: 'User not found',
        },
      }
    }

    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    })

    if (existingFollow) {
      return {
        success: false,
        error: {
          code: ErrorCodes.VALIDATION_INVALID_INPUT,
          message: 'Already following this user',
        },
      }
    }

    // Create follow
    await prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
    })

    return {
      success: true,
      data: { followed: true },
    }
  } catch (error) {
    console.error('Error following user:', error)
    return {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Failed to follow user',
      },
    }
  }
}

/**
 * Unfollow a user
 */
export async function unfollowUser(
  followerId: string,
  followingId: string
): Promise<ApiResponse<{ unfollowed: boolean }>> {
  try {
    // Check if follow exists
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    })

    if (!existingFollow) {
      return {
        success: false,
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: 'Not following this user',
        },
      }
    }

    // Delete follow
    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    })

    return {
      success: true,
      data: { unfollowed: true },
    }
  } catch (error) {
    console.error('Error unfollowing user:', error)
    return {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Failed to unfollow user',
      },
    }
  }
}

/**
 * Get followers list
 */
export async function getFollowers(
  userId: string
): Promise<ApiResponse<{ followers: any[] }>> {
  try {
    const follows = await prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            displayName: true,
            profileImage: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const followers = follows.map((f) => f.follower)

    return {
      success: true,
      data: { followers },
    }
  } catch (error) {
    console.error('Error getting followers:', error)
    return {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Failed to get followers',
      },
    }
  }
}

/**
 * Get following list
 */
export async function getFollowing(
  userId: string
): Promise<ApiResponse<{ following: any[] }>> {
  try {
    const follows = await prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            displayName: true,
            profileImage: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const following = follows.map((f) => f.following)

    return {
      success: true,
      data: { following },
    }
  } catch (error) {
    console.error('Error getting following:', error)
    return {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Failed to get following',
      },
    }
  }
}

/**
 * Check if following
 */
export async function isFollowing(
  followerId: string,
  followingId: string
): Promise<ApiResponse<{ isFollowing: boolean }>> {
  try {
    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    })

    return {
      success: true,
      data: { isFollowing: !!follow },
    }
  } catch (error) {
    console.error('Error checking follow status:', error)
    return {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Failed to check follow status',
      },
    }
  }
}
