/**
 * Follow Service
 * Handles follow/unfollow and follower/following lists
 */

import { prisma } from '@/lib/prisma'
import { ApiResponse, ErrorCodes } from '@/lib/types/api'

/**
 * Follow a user
 * Creates a follow relationship between two users
 *
 * @param followerId - ID of the user who is following
 * @param followingId - ID of the user being followed
 * @returns Follow relationship data on success, error on failure
 *
 * @example
 * const result = await followUser('user1', 'user2')
 * if (result.success) {
 *   console.log('Now following user2')
 * }
 */
export async function followUser(
  followerId: string,
  followingId: string
): Promise<ApiResponse<{ followerId: string; followingId: string }>> {
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

    if (!follower) {
      return {
        success: false,
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: 'Follower not found',
        },
      }
    }

    if (!following) {
      return {
        success: false,
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: 'User to follow not found',
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
          code: ErrorCodes.VALIDATION_DUPLICATE,
          message: 'Already following this user',
        },
      }
    }

    // Create follow
    const follow = await prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
    })

    return {
      success: true,
      data: { followerId: follow.followerId, followingId: follow.followingId },
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
 * Removes an existing follow relationship between two users
 *
 * @param followerId - ID of the user who is unfollowing
 * @param followingId - ID of the user being unfollowed
 * @returns Success status on unfollow, error if not following or failed
 *
 * @example
 * const result = await unfollowUser('user1', 'user2')
 * if (result.success) {
 *   console.log('Unfollowed user2')
 * }
 */
export async function unfollowUser(
  followerId: string,
  followingId: string
): Promise<ApiResponse<{ unfollowed: boolean }>> {
  try {
    // Can't unfollow yourself
    if (followerId === followingId) {
      return {
        success: false,
        error: {
          code: ErrorCodes.VALIDATION_INVALID_INPUT,
          message: 'You cannot unfollow yourself',
        },
      }
    }

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
 * Retrieves all users who are following the specified user
 *
 * @param userId - ID of the user whose followers to retrieve
 * @returns List of follower user objects with id, username, displayName, profileImage
 *
 * @example
 * const result = await getFollowers('user123')
 * if (result.success) {
 *   console.log(`${result.data.followers.length} followers`)
 * }
 */
export async function getFollowers(
  userId: string
): Promise<ApiResponse<{ followers: any[] }>> {
  try {
    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } })

    if (!user) {
      return {
        success: false,
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: 'User not found',
        },
      }
    }

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
 * Retrieves all users that the specified user is following
 *
 * @param userId - ID of the user whose following list to retrieve
 * @returns List of following user objects with id, username, displayName, profileImage
 *
 * @example
 * const result = await getFollowing('user123')
 * if (result.success) {
 *   console.log(`Following ${result.data.following.length} users`)
 * }
 */
export async function getFollowing(
  userId: string
): Promise<ApiResponse<{ following: any[] }>> {
  try {
    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } })

    if (!user) {
      return {
        success: false,
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: 'User not found',
        },
      }
    }

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
 * Checks whether a follow relationship exists between two users
 *
 * @param followerId - ID of the potential follower
 * @param followingId - ID of the potential following user
 * @returns Boolean indicating whether followerId is following followingId
 *
 * @example
 * const result = await isFollowing('user1', 'user2')
 * if (result.success && result.data.isFollowing) {
 *   console.log('user1 is following user2')
 * }
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

/**
 * Get follower and following counts
 * Retrieves the total number of followers and following for a user
 *
 * @param userId - ID of the user whose counts to retrieve
 * @returns Object containing followerCount and followingCount
 *
 * @example
 * const result = await getFollowCounts('user123')
 * if (result.success) {
 *   console.log(`${result.data.followerCount} followers, ${result.data.followingCount} following`)
 * }
 */
export async function getFollowCounts(
  userId: string
): Promise<ApiResponse<{ followerCount: number; followingCount: number }>> {
  try {
    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } })

    if (!user) {
      return {
        success: false,
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: 'User not found',
        },
      }
    }

    // Count followers and following
    const [followerCount, followingCount] = await Promise.all([
      prisma.follow.count({ where: { followingId: userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
    ])

    return {
      success: true,
      data: { followerCount, followingCount },
    }
  } catch (error) {
    console.error('Error getting follow counts:', error)
    return {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Failed to get follow counts',
      },
    }
  }
}
